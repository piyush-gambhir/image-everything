# Image Everything

The open-source image toolbox with a UI and a versioned REST API. Compress,
convert, crop, resize, rotate, watermark, inspect metadata, clean private tags,
enhance, build pipelines, and process batches from one self-hostable platform.

[![CI](https://github.com/piyush-gambhir/image-everything/actions/workflows/ci.yml/badge.svg)](https://github.com/piyush-gambhir/image-everything/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-5b4ee5.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-22%2B-43853d.svg)](package.json)

## What is included

| Tool | UI | API | Highlights |
| --- | :---: | :---: | --- |
| Read metadata | ✓ | ✓ | EXIF, IPTC, XMP, GPS, ICC, camera, lens, and exposure |
| Clean metadata | ✓ | ✓ | Remove private tags while optionally retaining orientation or ICC |
| Compress | ✓ | ✓ | JPEG, PNG, WebP, and AVIF quality/lossless controls |
| Resize | ✓ | ✓ | Five fit modes, aspect lock, background, no-enlargement mode |
| Convert | ✓ | ✓ | JPEG, PNG, WebP, AVIF, and GIF output |
| Crop | ✓ | ✓ | Pointer crop, aspect presets, and exact pixel coordinates |
| Rotate / flip | ✓ | ✓ | 90° rotation and horizontal/vertical mirroring |
| Watermark | ✓ | ✓ | Text or image overlays with position and opacity |
| Auto-enhance | ✓ | ✓ | Orientation, normalization, modulation, sharpening |
| Pipeline | ✓ | ✓ | Chain up to 20 operations with one decode/encode cycle |
| Batch | ✓ | ✓ | Process up to 20 images and download one ZIP |

Accepted inputs are JPEG, PNG, WebP, AVIF, GIF, TIFF, HEIC, and HEIF when the
deployed `sharp`/libvips build advertises the corresponding decoder. Query
`GET /api/v1/capabilities` for the truth about a running instance.

## Architecture

```text
Browser or API client
        │
        ├── Next.js 16 + React 19 tool UI
        │
        └── NestJS 11 REST API ── sharp/libvips image engine
                    │
                    ├── Zod validation
                    ├── optional bearer-key guard
                    ├── per-instance rate limiting
                    └── streamed image / ZIP response
```

The UI calls the same `/api/v1` endpoints available to external clients. Image
bytes are processed in memory by the API and are not persisted by the
application. Self-hosting keeps processing inside infrastructure you control;
it does not mean a browser-only workflow.

## Quickstart

Requirements: Node.js 22 or later and pnpm 9.15.4.

```bash
pnpm install
cp .env.example .env
pnpm dev
```

| Surface | Local URL |
| --- | --- |
| Tool UI | <http://localhost:3000> |
| REST API | <http://localhost:3001/api/v1> |
| Swagger UI | <http://localhost:3001/api/docs> |
| OpenAPI JSON | <http://localhost:3001/api/openapi.json> |
| Health | <http://localhost:3001/api/health> |

The web app reads `web/.env.local` during local development. Set
`NEXT_PUBLIC_API_URL=http://localhost:3001` if it is not already present.

## API quickstart

All image operations accept `multipart/form-data`. Single-file endpoints use a
`file` field and an optional JSON-encoded `options` field.

```bash
curl -X POST http://localhost:3001/api/v1/images/convert \
  -F file=@photo.webp \
  -F 'options={"targetFormat":"png"}' \
  --output photo.png
```

```bash
curl -X POST http://localhost:3001/api/v1/images/transform \
  -F file=@photo.jpg \
  -F 'options={"ops":[
    {"op":"resize","options":{"width":1280,"fit":"inside"}},
    {"op":"autoEnhance","options":{"normalize":true,"sharpen":true}},
    {"op":"convert","options":{"targetFormat":"webp","quality":82}}
  ]}' \
  --output photo-ready.webp
```

Canonical routes live under `/api/v1/images/<operation>`. The original
`/api/images/<operation>` routes remain as backwards-compatible aliases.

Processed-image responses include:

- `X-Output-Format`
- `X-Output-Width` and `X-Output-Height`
- `X-Output-Size`
- `Content-Disposition` with a safe download filename

### Optional authentication

Set `API_KEY` on the backend to require a bearer token for processing routes:

```bash
curl -H "Authorization: Bearer $API_KEY" \
  -X POST http://localhost:3001/api/v1/images/compress \
  -F file=@photo.jpg \
  -F 'options={"quality":78,"format":"webp"}' \
  --output photo.webp
```

Health and capability discovery remain public. A value placed in a
`NEXT_PUBLIC_*` web variable is visible to browser users, so do not treat a key
embedded in a public UI build as a secret.

## Configuration

| Variable | Surface | Default | Purpose |
| --- | --- | --- | --- |
| `PORT` | API | `3001` | API listen port |
| `API_KEY` | API | unset | Optional bearer token for processing routes |
| `CORS_ORIGIN` | API | any origin | Comma-separated browser origins |
| `RATE_LIMIT_PER_MINUTE` | API | `120` | Requests allowed per client per minute |
| `NEXT_PUBLIC_API_URL` | Web | same origin | Base URL for the API |
| `NEXT_PUBLIC_APP_URL` | Web | `http://localhost:3000` | Canonical metadata URL |

See [.env.example](.env.example) for a local template.

## Docker

Build and run the UI and API together:

```bash
docker compose up --build
```

The compose stack exposes the web app on port `3000` and the API on `3001`.
Both images run as non-root users and include health checks.

## Repository layout

```text
backend/   NestJS API, validation, image engine, and Vitest suite
web/       Next.js tool UI, API reference, and component tests
scripts/   Release helpers
.github/   CI and container publishing workflows
```

## Development

```bash
pnpm dev            # web + API
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm format:check
```

Image transforms are tested by inspecting dimensions, formats, metadata, and
pixels rather than exact encoded bytes, which may vary between libvips builds.

## Scope

The first public release targets still-image workflows. Preserving and editing
multi-frame GIF/WebP animations, background removal, OCR, and ML upscaling are
deliberately left for isolated future workers rather than pretending they are
safe or reliable in the core API today.

## Contributing and security

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request. Please
report vulnerabilities using the private process in [SECURITY.md](SECURITY.md),
not a public issue.

## License

[MIT](LICENSE) © 2026 Piyush Gambhir
