# Deploying the image API and worker

The API and image runtime are independently deployable Node.js containers. The
API forwards requests to the worker over a private network. The console calls the
public API origin; no worker URL or worker token belongs in a browser bundle.

## Docker Compose

From the repository root:

```sh
export IMAGE_WORKER_TOKEN=replace-with-a-long-random-private-token
docker compose up --build
curl --fail http://localhost:3001/api/ready
curl --fail http://localhost:3001/api/v2/capabilities
```

Compose publishes the API and console ports and leaves the worker private.
Set `API_KEY` when public API access requires authentication, and set
`CORS_ORIGIN` to the console's origin. A `NEXT_PUBLIC_API_KEY` is visible to
browser users and must not contain a private credential.

## Build separate runtime images

Both commands use the repository root as their context so the shared contracts
can be built with each service:

```sh
docker build -f workers/image-worker/Dockerfile -t image-everything-worker:local .
docker build -f backend/Dockerfile -t image-everything-api:local .
```

Connect both containers to a private network. Configure the API with
`IMAGE_WORKER_URL=http://worker:3020` and the same `IMAGE_WORKER_TOKEN` as the
worker. Keep worker ingress private and use your platform's secret manager.
Ordinary container hosts, Kubernetes, ECS, and Cloud Run can run the standard
images with suitable networking and resource limits. A Lambda adapter is not
provided by this repository.

## Worker configuration

| Variable                               | Default     | Purpose                                                              |
| -------------------------------------- | ----------- | -------------------------------------------------------------------- |
| `IMAGE_WORKER_TOKEN`                   | required    | Private bearer token shared with the gateway                         |
| `IMAGE_WORKER_PORT`                    | `3020`      | Listen port; falls back to `PORT` when unset                         |
| `HOST`                                 | `0.0.0.0`   | Listen interface                                                     |
| `IMAGE_WORKER_MAX_REQUEST_BYTES`       | `104857600` | Aggregate uploaded image bytes; may lower the shared 100 MiB ceiling |
| `IMAGE_WORKER_MAX_CONCURRENT_REQUESTS` | `2`         | Concurrent admitted execution requests; integer from 1 to 32         |

The multipart parser permits a bounded framing allowance in addition to the
image-byte ceiling. Shared per-file, decoded-pixel, output-size, and pipeline
limits continue to apply. The API's `IMAGE_WORKER_DEADLINE_MS` controls how long
the gateway waits; it does not increase the worker's execution deadline.

Set container memory and CPU limits in the deployment platform. Admission limits
reduce simultaneous work but are not a substitute for process memory limits.
A timed-out operation retains its slot while native execution continues.
Choose a concurrency setting based on representative images and codec memory
use, and align gateway timeouts and platform request concurrency accordingly.

## Verification and releases

`.github/workflows/workers-ci.yml` verifies shared contracts, the gateway and
worker, builds both standard containers, and checks authenticated image
conversion and a lossless pixel decode/encode round-trip through the gateway. It also runs independently for relevant
pull requests and can be reused by publishing.

`.github/workflows/publish-worker-images.yml` publishes the gateway and worker
only after that verification succeeds. The configured image names are:

- `ghcr.io/piyush-gambhir/image-everything-api`
- `ghcr.io/piyush-gambhir/image-everything-image-worker`

Publishing produces immutable `sha-<commit>` tags, `latest` for `main`, `edge`
for other manually dispatched branches, and a version for `workers-v*` tags.
Images target `linux/amd64` and `linux/arm64` and include OCI metadata and
build attestations. Pin a commit tag or digest when deploying. Publishing an
image does not deploy or restart an application.
