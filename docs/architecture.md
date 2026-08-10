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
