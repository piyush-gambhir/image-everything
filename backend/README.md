# Image Everything API

Public NestJS gateway for Image Everything. Native image execution belongs to
the separately authenticated `@image-everything/image-worker` process; this
package owns public authentication, rate limits, multipart validation, OpenAPI,
worker dispatch, safe response headers, and stable problem responses.

## Local development

```bash
pnpm --filter @image-everything/backend dev
```

Start the worker first, then the API. The API listens on
<http://localhost:3001>. Interactive OpenAPI documentation is served at
`/api/docs`, machine-readable OpenAPI at `/api/openapi.json`, and runtime
capability discovery at `/api/v2/capabilities`.

Canonical operations are `POST /api/v2/images/<operation>`. Requests use
`multipart/form-data` and a JSON-encoded `options` field. Depending on the tool,
uploads use `file`, `overlay`, `other`, or repeated `files` fields. The
`/api/v1/images` and `/api/images` paths remain compatibility adapters.

## Verify

```bash
pnpm --filter @image-everything/backend lint
pnpm --filter @image-everything/backend typecheck
pnpm --filter @image-everything/backend test
pnpm --filter @image-everything/backend build
```

Schemas, limits, routes, and protocol types live in
`@image-everything/contracts`. Keep this gateway thin: new native image logic
belongs in the worker and must be exercised through public multipart integration
tests here.
