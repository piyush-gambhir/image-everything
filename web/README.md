# Image Everything web

The Next.js 16 and React 19 interface for Image Everything. It contains the
searchable tool catalog, one workflow page per image operation, and the public
API reference.

The browser does not implement a second image engine. Every workflow calls the
same versioned NestJS endpoints available to external API clients.

## Develop

```bash
cp ../.env.example .env.local
pnpm --filter @image-everything/web dev
```

The UI runs on <http://localhost:3000> and expects the API at
`NEXT_PUBLIC_API_URL` (normally <http://localhost:3001>).

## Verify

```bash
pnpm --filter @image-everything/web lint
pnpm --filter @image-everything/web typecheck
pnpm --filter @image-everything/web test
pnpm --filter @image-everything/web build
```

Tool metadata lives in `lib/features.ts`; keep the home explorer and sidebar
driven from that shared registry. API requests should use `imageApiPath()` from
`lib/api.ts` so new code stays on the canonical `/api/v1/images` contract.
