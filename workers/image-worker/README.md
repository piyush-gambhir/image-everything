# image-worker

A private Node.js runtime for still-image processing through Sharp/libvips,
EXIF metadata parsing, and HEIC decoding. All advertised operations are callable
through the public Nest API and executed here.
The shared registry exposes 57 tools across 58 processing routes, including
color/pixel effects, geometry, asset ZIPs, and image fingerprints.

## Layout

```text
src/
  core/          decoding, codec probes, transforms, analysis, encoding, archives
  http/          authenticated HTTP server and bounded multipart parsing
  server.ts      process configuration and startup
  index.ts       library exports for worker tests and tooling
__tests__/       engine, protocol, capability, and admission tests
Dockerfile      independent production runtime (repository-root build context)
```

`core/effects.ts` implements 12 color/channel and pixel operations;
`core/layouts.ts` implements 12 geometry, composition, asset-generation, and
analysis operations. Their schemas and ZIP/JSON result contracts live in
`packages/image-contracts/src/extensions.ts`. These operations are standalone
routes; they do not extend the pipeline step vocabulary.

## Run and verify

From the repository root:

```sh
pnpm --filter @image-everything/contracts build
IMAGE_WORKER_TOKEN=local-private-token pnpm --filter @image-everything/image-worker dev
pnpm --filter @image-everything/image-worker test
pnpm --filter @image-everything/image-worker build
```

Set `IMAGE_WORKER_URL` and the matching `IMAGE_WORKER_TOKEN` in the Nest gateway.
The token is server-only. Docker Compose connects the API and worker without
publishing the worker port to the host.

## Private protocol

- `GET /health`: unauthenticated process liveness.
- `GET /ready`: authenticated readiness backed by runtime codec probes.
- `GET /v2/capabilities`: authenticated operation and codec discovery.
- `POST /v2/<operation>`: authenticated multipart execution. The exact paths,
  input fields, options, and result kinds come from the shared route registry.

Supply `Authorization: Bearer <IMAGE_WORKER_TOKEN>`. Execution accepts image
parts under `file`, `files`, `overlay`, or `other`, according to the operation,
and an optional JSON-encoded `options` part. It returns image bytes, JSON, or a
ZIP with a manifest. Errors use the shared `application/problem+json` contract.

The runtime detects formats from bytes and enforces the shared upload, pixel,
dimension, output, batch, and pipeline limits. Capability discovery reports the
codecs verified on the installed runtime; it does not promise unsupported
formats, animation processing, or multipage transformation.
The [advanced API reference](../../docs/advanced-tools.md) lists exact options,
defaults, response manifests, and the limited ICO output support.

## Admission and execution limits

`IMAGE_WORKER_MAX_CONCURRENT_REQUESTS` defaults to `2` and accepts integers from
`1` to `32`. Admission happens before reading an execution upload. Excess
requests receive HTTP `503`, code `WORKER_UNAVAILABLE`, `retryable: true`, and
`Retry-After: 1`; clients should back off before retrying. Health and capability
requests do not consume execution slots.

Pixel effects preflight each RGBA working buffer against `MAX_RAW_BYTES`
(25 MiB, or 6,553,600 pixels). Shadow and reflection include the enlarged canvas
in that check. All newly encoded advanced-tool results strip source metadata;
color-space conversion and other native-only operations use the
general input/output limits. No external image or AI service is called.

An admitted request keeps its slot during upload parsing and image processing.
Node limits receipt of request headers and upload bytes to the shared 30-second
deadline, checked every second. A stalled upload receives HTTP `408` and its
connection closes; admission is released once the upload reader stops.
If its response deadline expires, the slot remains occupied until the underlying
execution settles. A response timeout does not cancel Sharp or HEIC native work.
The worker is isolated from the API by a separate process/container; individual
requests share that worker process. Set container memory/CPU limits and scale
worker replicas according to the workload. This service does not provide a
durable queue, per-request subprocess sandbox, or hard native execution kill.

See [`../DEPLOYMENT.md`](../DEPLOYMENT.md) for all environment variables and
release details.
