# Deploying the image API and worker

The API and image runtime are independently deployable Node.js containers. The
API forwards requests to the worker over a private network. The console calls the
public API origin; no worker URL or worker token belongs in a browser bundle.

## Pull and run the public images

No source checkout or Node.js installation is required. Install Docker with
Compose v2, then download the standalone configuration:

```sh
curl -fsSLO https://raw.githubusercontent.com/piyush-gambhir/image-everything/main/docker-compose.published.yml
export IMAGE_WORKER_TOKEN="$(openssl rand -hex 32)"
export API_KEY="$(openssl rand -hex 32)"
docker compose -f docker-compose.published.yml pull
docker compose -f docker-compose.published.yml up -d --wait
curl --fail http://localhost:3001/api/ready
```

Both images support `linux/amd64` and `linux/arm64`; Docker selects the matching
platform. They contain the repository's MIT license at `/app/LICENSE` and
run as non-root users. Public GHCR images need no registry login.

The API is available at `http://localhost:3001`, with Swagger at `/api/docs`.
Try a conversion:

```sh
curl --fail-with-body -H "Authorization: Bearer $API_KEY" \
  -F file=@photo.png -F 'options={"format":"webp","quality":80}' \
  http://localhost:3001/api/v2/images/convert -o photo.webp
```

Save your tokens in the deployment environment or secret manager. The published
Compose file requires both tokens and binds the API to loopback by default.
Set `API_BIND_ADDRESS=0.0.0.0` to expose it on the host's interfaces, `API_PORT`
to change the host port, and `CORS_ORIGIN` for your browser application's origin.
The worker has no published host port. Serve remote deployments through your
HTTPS ingress. Health, readiness, and capabilities remain public; processing
requests require the API bearer token.

`latest` follows verified builds of `main`. Pin both images using the same
`IMAGE_TAG=sha-<full-commit>` or a published `workers-v*` release's version.
To update, run `pull` and `up -d --wait` again. To roll back, set `IMAGE_TAG` to
the previous published commit tag and repeat those commands. To stop:

```sh
docker compose -f docker-compose.published.yml down
```

These images provide the processing API, Swagger UI, and private worker. The
Next.js tool console is available in the source-build stack below because its
public API URL is configured at build time.

## Docker Compose from source

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

### First publication and public access

Publishing links each package to this public repository. GHCR package visibility
is separate from repository visibility: after first publication, the maintainer
must open each package's **Package settings → Change visibility → Public**.
Subsequent pushes retain that visibility. See
[GitHub's package visibility instructions](https://docs.github.com/en/packages/learn-github-packages/configuring-a-packages-access-control-and-visibility).

Verify both image names can be pulled without registry credentials before
announcing a release. The packages are:

- [Image Everything API](https://github.com/users/piyush-gambhir/packages/container/package/image-everything-api)
- [Image Everything worker](https://github.com/users/piyush-gambhir/packages/container/package/image-everything-image-worker)
