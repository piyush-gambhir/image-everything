# Alignment with PDF Everything

The reference is the sibling `pdf-everything` repository. Its essential pattern
is a stable Nest public API, shared schemas, a console using that API, and
deployable workers grouped by execution runtime.

| Responsibility    | PDF Everything                                  | Image Everything                                                 |
| ----------------- | ----------------------------------------------- | ---------------------------------------------------------------- |
| Public API        | `backend/`, validates and orchestrates          | `backend/`, validates and dispatches `/api/v2/images`            |
| Shared contracts  | `types/`                                        | `packages/image-contracts/`                                      |
| Tool console      | `console/`                                      | Existing `web/` tool console and API reference                   |
| Core execution    | `workers/pdf-core-worker/core/`                 | `workers/image-worker/src/core/`                                 |
| Private transport | `workers/pdf-core-worker/http/`                 | `workers/image-worker/src/http/`                                 |
| Different runtime | Separate Chromium worker                        | Future worker only when an operation requires another runtime    |
| Deployment        | Worker images, CI, publishing, deployment guide | Worker/API image verification, GHCR publishing, deployment guide |

Image Everything already forwarded active routes to a private worker. This
change removes the dead image engines and native dependencies still shipped in
the API, enforces that separation in CI, makes worker ownership explicit, and
extends the contract to 57 tools/58 public POST endpoints with decoding,
encoding, serialization, validation, color effects, layouts, icon and sprite
bundles, and pixel analysis.

The image API keeps synchronous multipart requests and direct image/JSON/ZIP
responses. PDF's file-storage/file-ID protocol is not necessary for these
in-memory operations. Existing package names, tool URLs, v2 endpoints, and
legacy compatibility routes remain usable.

All current image tools share Sharp/libvips and its HEIC fallback, so they form
one deployable native runtime. One container per operation would repeat that
runtime without adding a useful isolation boundary. OCR, neural background
removal/upscaling, browser rendering, and other heavier engines should get a
separate private worker when implemented, with explicit capabilities, limits,
tests, and deployment configuration. These features are not advertised as
implemented by this change.

See [API workflows](api-workflows.md), [the scope](v2-scope.md), and
[worker deployment](../workers/DEPLOYMENT.md).
