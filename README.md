# image-everything

Self-hostable image toolkit. A NestJS API wraps `sharp` to expose every common image operation — clean, compress, resize, convert, crop, rotate, watermark, auto-enhance, batch transform, plus EXIF/IPTC/XMP/GPS metadata reading. A Next.js web app provides a UI for each operation in the browser.

Everything runs locally; no images leave the machine.

## Stack

- **backend** — NestJS 11 on Express, [sharp](https://sharp.pixelplumbing.com) for pixel work, [exifr](https://github.com/MikeKovarik/exifr) for metadata, `heic-decode` for HEIC, `archiver` for batch ZIPs. Swagger at `/api`
- **web** — Next.js 16 App Router, React 19, Tailwind v4, shadcn/ui

## Quickstart

```bash
pnpm install
pnpm dev               # runs backend (NestJS) + web (Next.js) in parallel
```

Or run each side independently:

```bash
pnpm dev:backend       # NestJS on :3001 (default)
pnpm dev:web           # Next.js on :3000
```

## API

All endpoints are `POST /api/images/<op>` and accept `multipart/form-data` with a `file` field plus an optional JSON-encoded `options` field. Responses stream the processed image back; the metadata endpoint returns JSON.

| Endpoint | What it does |
|----------|--------------|
| `metadata` | Read EXIF / IPTC / XMP / GPS / ICC, plus format and dimensions |
| `clean` | Strip metadata, optionally keep orientation / colour profile |
| `compress` | Re-encode at chosen quality (jpeg, png, webp, avif) with mozjpeg/lossless flags |
| `resize` | Resize with five fit modes (`cover`, `contain`, `fill`, `inside`, `outside`) |
| `convert` | Convert format with optional alpha-flatten background |
| `crop` | Crop a rectangular region by `{ left, top, width, height }` |
| `rotate` | Rotate 0/90/180/270 and/or flip |
| `watermark` | Overlay a text or image watermark with positioning/opacity |
| `auto-enhance` | Auto-orient, normalise, modulate, sharpen |
| `transform` | Run a chain of ops in a single sharp pipeline (one decode/encode) |
| `batch` | Apply the same op or pipeline to many files, return a ZIP |

Max file size: **25 MB**. Accepted input types are listed in `backend/src/lib/types.ts` (`ACCEPTED_INPUT_MIMES`).

### Example

```bash
curl -X POST http://localhost:3001/api/images/resize \
  -F file=@cat.jpg \
  -F 'options={"width":800,"fit":"inside","withoutEnlargement":true}' \
  -o cat-800.jpg
```

```bash
curl -X POST http://localhost:3001/api/images/transform \
  -F file=@cat.jpg \
  -F 'options={"ops":[
        {"op":"resize","options":{"width":1280,"fit":"inside"}},
        {"op":"autoEnhance","options":{"normalize":true,"sharpen":true}},
        {"op":"convert","options":{"targetFormat":"webp","quality":82}}
      ]}' \
  -o cat-pipeline.webp
```

Full Swagger UI: `http://localhost:3001/api`.

## Web UI

The Next.js app exposes a page per operation under `web/app/`:
`auto-enhance`, `batch`, `clean`, `compress`, `convert`, `crop`, `metadata`, `resize`, `rotate`, `transform`, `watermark`.

Each page uploads to the backend, previews the result, and offers a download.

## Repo layout

```
backend/
  src/
    images/          controller, module, service (sharp pipelines)
    lib/             zod schemas + accepted MIME list
    shared/          response helpers, options pipe
  __tests__/         vitest
web/
  app/               Next.js App Router pages, one per op
  components/        UI (shadcn-based)
  lib/               API client, env
```

## Scripts

```bash
pnpm dev            # backend + web in parallel
pnpm build          # build both packages
pnpm lint
pnpm test
pnpm typecheck
```

## License

MIT
