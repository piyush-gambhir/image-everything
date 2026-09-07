# Architecture

Image Everything separates public HTTP concerns from native image execution.

```text
Browser / API client
        |
        v
Next.js UI -----> Nest API gateway -----> private image worker -----> Sharp/libvips
                       |                         |
                       |                         +-- decode, inspect, transform,
                       |                             encode, multi-file ZIP
                       |
                       +-- auth, rate limits, multipart limits, OpenAPI,
                           stable errors, safe response headers
```

## Repository layers

```text
web/                         Next.js tool console and API reference
backend/                     Public HTTP, validation, authentication, dispatch
packages/image-contracts/    Runtime-neutral operation and result contracts
workers/image-worker/
  src/core/                  Image execution, codec probes, encoding, metadata
  src/http/                  Private transport, limits, admission, authentication
  src/server.ts              Process entrypoint
  __tests__/                 Engine and private HTTP acceptance tests
```

The worker is grouped by native runtime, matching PDF Everything's core-worker
pattern. Add another worker only for a genuinely different dependency or scaling
profile. The console uses the same public API as external clients. Its existing
`web/` package and public URLs are retained.

`pnpm check:boundaries` rejects native image libraries in gateway, console, and
contract production dependencies/imports. The deprecated backend engine and its
unused dependencies have been removed; legacy requests translate to the shared
worker operations.

## Shared contract

`@image-everything/contracts` is the single runtime-neutral source of truth for:

- public operation IDs and endpoint metadata
- Zod request schemas and inferred TypeScript types
- supported format names and output policies
- pipeline step schemas
- upload, pixel, batch, and pipeline limits
- worker request/result metadata
- runtime capability and problem-response schemas

The browser, API, worker, documentation, and tests consume the same registry.
React components, Nest decorators, and Sharp objects stay in their owning
packages and are never placed in the shared contract.

## Public API gateway

The Nest application is the only public server. It:

1. authenticates and rate-limits the request;
2. applies per-file and aggregate uploaded-payload limits;
3. validates the operation options with the shared schema;
4. forwards validated files and options to the private worker using an
   authenticated multipart request;
5. maps worker failures to stable `application/problem+json` responses; and
6. returns binary, JSON, or ZIP results with `no-store`, safe filenames, and
   explicit result metadata.

The gateway does not run Sharp/libvips work on its event loop.

## Private worker

The image worker is a separate Node.js process and container. Its execution
route is protected by a private bearer token and is not exposed by Docker
Compose.

As part of readiness and capability discovery, it probes the installed Sharp
runtime and derives its actual codec matrix. Readiness fails if a required
baseline codec is missing. Operation availability is backed by that baseline
and by semantic engine tests; the worker does not run a separate startup probe
for every operation. Every input is sniffed from bytes, decoded with pixel
limits, checked for animation/multiple pages, and processed within the v2
resource policy.

The 100 MiB aggregate upload limit is measured over uploaded image bytes (with
the serialized options field also counted at the public API). Multipart framing
has a small, bounded allowance at the worker and is not described as image
payload. Encoded output has its own 100 MiB ceiling for a single image or the
combined entries and final body of an archive.

The worker admits at most `IMAGE_WORKER_MAX_CONCURRENT_REQUESTS` active uploads
and executions (default 2). It rejects excess work before buffering uploaded
files with retryable `503 WORKER_UNAVAILABLE`. An execution that outlives its
response deadline retains its slot until it settles. Upload receipt is bounded
by Node's 30-second request timeout. This is process isolation between the API
and worker; it does not imply a fresh process or hard process kill per request.

The internal transport remains synchronous and stateless for v2. Durable
uploads, queues, asynchronous jobs, and object storage are explicitly deferred;
they can be added behind the same execution boundary without changing the
public operation schemas.

## Compatibility

The web application uses `/api/v2`. Existing `/api/v1/images/*` and
`/api/images/*` routes remain thin adapters that translate legacy option names
to v2 worker commands and preserve legacy response shapes.

## Trust boundaries

- Client filenames and MIME headers are untrusted.
- The API key is optional for a self-hosted local setup but required when
  configured. A browser-exposed environment value is never described as a
  secret.
- The worker token is server-only and must not appear in the web bundle.
- The worker never fetches client-provided URLs.
- Raw Sharp/libvips messages, stacks, paths, and process details never cross the
  public boundary.
- Uploaded bytes and results are held only for the duration of a synchronous
  request; no application persistence is used in v2.
