# Image Everything

A comprehensive, self-hostable toolbox for common still-image workflows. Image
Everything provides 28 tools through one Next.js interface and one versioned
REST API, backed by an isolated Sharp/libvips execution worker.

[![CI](https://github.com/piyush-gambhir/image-everything/actions/workflows/ci.yml/badge.svg)](https://github.com/piyush-gambhir/image-everything/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-5b4ee5.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-22%2B-43853d.svg)](package.json)

## The 28 tools

| Category              | Tools                                                                                |
| --------------------- | ------------------------------------------------------------------------------------ |
| Optimize and export   | Compress, compress to size, resize, convert, responsive sets, quick enhance          |
| Geometry and canvas   | Crop, rotate/flip, trim, extend/pad, background/alpha                                |
| Color and effects     | Color adjustment, normalize/CLAHE, filters, blur/sharpen/median, pixelate            |
| Composition           | Text/image watermark, frame/rounded corners, collage/contact sheet                   |
| Metadata and analysis | Metadata inspector, cleaner and editor, statistics, palette, histogram, compare/diff |
| Automation            | Validated processing pipelines and multi-file batch ZIPs                             |

Every tool is available in the web app and under `/api/v2/images`. The exact
surface, options, limits, acceptance criteria, and deliberately deferred
features are documented in [the v2 scope](docs/v2-scope.md).

## Architecture

```text
Browser / API client
        |
        +-- Next.js tool UI
        |
        `-- NestJS public API --private multipart--> image worker -- Sharp/libvips
                |                                      |
                | auth, rate limits, OpenAPI,           | byte sniffing, validation,
                | upload limits, stable errors          | transform, analysis, ZIP
                `----------------------------------------'
                         shared Zod contracts
```

The public API does not execute native image work on its event loop. The worker
is separately authenticated and is not exposed by the default Compose stack.
Images and results stay in memory for a synchronous request and are not stored
by the application. See [the architecture guide](docs/architecture.md).

## Quickstart

Requirements: Node.js 22 or later and pnpm 9.15.4.

```bash
pnpm install
cp .env.example .env
pnpm dev
```

`IMAGE_WORKER_TOKEN` must have the same value for the API and worker. The sample
environment file is ready for local use; replace its token before exposing the
stack outside your machine.

| Surface              | Local URL                                                              |
| -------------------- | ---------------------------------------------------------------------- |
| Tool UI              | <http://localhost:3000>                                                |
| REST API v2          | <http://localhost:3001/api/v2>                                         |
| Runtime capabilities | <http://localhost:3001/api/v2/capabilities>                            |
| Swagger UI           | <http://localhost:3001/api/docs>                                       |
| OpenAPI JSON         | <http://localhost:3001/api/openapi.json>                               |
| Health / readiness   | <http://localhost:3001/api/health> / <http://localhost:3001/api/ready> |

The web app reads `web/.env.local` during local development. Set
`NEXT_PUBLIC_API_URL=http://localhost:3001` if it is not already present.

## API quickstart

All processing endpoints accept `multipart/form-data`. A single-image request
uses `file` plus JSON in `options`:

```bash
curl -H "Authorization: Bearer $API_KEY" \
  -X POST http://localhost:3001/api/v2/images/convert \
  -F file=@photo.webp \
  -F 'options={"format":"png"}' \
  --output photo.png
```

Multi-image tools use `files`; comparison uses `file` and `other`; image
watermarks use `file` and `overlay`. Results are an image, JSON, or ZIP according
to the tool. Processing responses are non-cacheable and include safe attachment
filenames and output metadata headers.

Runtime codec support depends on the deployed libvips build. Do not infer it
from a filename: query `GET /api/v2/capabilities`. The worker sniffs uploaded
bytes and rejects corrupt, animated, multi-page, over-size, or unavailable-codec
inputs instead of silently flattening or falling back to JPEG.

Existing `/api/v1/images/*` and `/api/images/*` endpoints remain compatibility
adapters for the original release.

### Authentication

Set `API_KEY` to require a bearer token on processing routes. Health and
capability discovery remain public. Any `NEXT_PUBLIC_*` value is visible in
browser JavaScript and must never be treated as a secret.

## Configuration

| Variable                         | Surface      | Default                 | Purpose                                                          |
| -------------------------------- | ------------ | ----------------------- | ---------------------------------------------------------------- |
| `API_PORT` / `PORT`              | API          | `3001`                  | Public API listen port (`PORT` remains the container convention) |
| `API_KEY`                        | API          | unset                   | Optional public bearer token                                     |
| `CORS_ORIGIN`                    | API          | local web URL           | Comma-separated browser origins                                  |
| `RATE_LIMIT_PER_MINUTE`          | API          | `120`                   | Requests per client per minute                                   |
| `IMAGE_WORKER_URL`               | API          | `http://localhost:3020` | Private worker origin                                            |
| `IMAGE_WORKER_TOKEN`             | API + worker | required                | Private API-to-worker bearer token                               |
| `IMAGE_WORKER_DEADLINE_MS`       | API          | `30000`                 | Worker request deadline                                          |
| `IMAGE_WORKER_PORT`              | worker       | `3020`                  | Private worker listen port                                       |
| `IMAGE_WORKER_MAX_REQUEST_BYTES` | worker       | `104857600`             | Aggregate uploaded image-byte ceiling, capped at 100 MiB         |
| `NEXT_PUBLIC_API_URL`            | web          | same origin             | Browser-facing API origin                                        |
| `NEXT_PUBLIC_APP_URL`            | web          | `http://localhost:3000` | Canonical application URL                                        |
| `NEXT_PUBLIC_API_KEY`            | web          | unset                   | Optional intentionally-public browser credential; never a secret |

See [.env.example](.env.example) for the complete local template.

The 100 MiB upload limit applies to the aggregate uploaded image payload, not
the exact byte length of the wire-format multipart body. The API also counts
the serialized `options` field, and the worker permits a bounded framing
allowance while independently rejecting image payloads above the configured
ceiling. Encoded responses have a separate 100 MiB limit: it applies to one
image result or to the combined encoded entries and final body of a ZIP result.

## Docker

Build and run all three services:

```bash
docker compose up --build
```

The stack exposes the web app on `3000` and API on `3001`. The worker is only
reachable inside the Compose network. All images run as non-root users; the
worker and API health checks use their readiness endpoints.

## Repository layout

```text
packages/image-contracts/  Browser-safe schemas, registry, limits, protocol
workers/image-worker/      Private image execution service and engine tests
backend/                   Public NestJS API gateway and HTTP integration tests
web/                       Manifest-driven Next.js UI and component tests
scripts/                   Full-stack smoke and release helpers
docs/                      Scope and architecture
```

## Verification

```bash
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test
pnpm build
pnpm smoke
```

After `pnpm build`, `pnpm smoke` starts the production worker, API, and web app
on isolated ports, uploads real image fixtures through every v2 API route,
validates the returned image/JSON/ZIP data, re-decodes image results, checks
auth and invalid-input behavior, and verifies server-rendered responses for all
28 tool URLs. Headless Chrome also drives the real file input and run action for
representative image (`compress`), JSON (`metadata`), and ZIP (`responsive`)
flows, then checks the rendered preview/data/download and authenticated API
response. These are representative browser workflows, not one browser flow per
tool. CI runs the same release gate; see [the per-tool testing
matrix](docs/testing.md) for the acceptance details. Local smoke runs require a
Chrome/Chromium binary or `IMAGE_EVERYTHING_CHROME_PATH`.

Image tests assert decoded dimensions, formats, metadata, statistics, archive
manifests, or representative pixels rather than encoder byte equality, which
can vary across libvips builds.

## Scope

Image Everything is intentionally honest about “everything”: v2 covers the
published set of common still-image operations. Animated editing, layered and
RAW formats, PDF/video, OCR, background removal, neural upscaling, generative
editing, durable jobs, accounts, and billing are not claimed by this release.

## Contributing and security

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request. Report
vulnerabilities through the private process in [SECURITY.md](SECURITY.md), not a
public issue.

## License

[MIT](LICENSE) © 2026 Piyush Gambhir
