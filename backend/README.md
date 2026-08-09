# Image Everything API

NestJS gateway and `sharp`/libvips processing engine for Image Everything.

## Local development

```bash
pnpm --filter @image-everything/backend dev
```

The API listens on <http://localhost:3001>. Interactive OpenAPI documentation
is served at `/api/docs`, machine-readable OpenAPI at `/api/openapi.json`, and
runtime capability discovery at `/api/v1/capabilities`.

Canonical image operations are `POST /api/v1/images/<operation>`. Requests use
`multipart/form-data` with a `file` field and a JSON-encoded `options` field.
The legacy `/api/images/<operation>` paths remain available.

## Verify

```bash
pnpm --filter @image-everything/backend lint
pnpm --filter @image-everything/backend typecheck
pnpm --filter @image-everything/backend test
pnpm --filter @image-everything/backend build
```

The default limits and operation registry live in `src/shared/api-contract.ts`.
Keep the advertised capabilities synchronized with actual validation and
runtime behavior.
