# Docker

Production-ready Docker image using Node LTS (22) and Next.js standalone output.

## Build

```bash
docker build -t nextjs-template:prod .
```

## Run

```bash
docker run --rm -p 3000:3000 \
  -e NEXT_PUBLIC_APP_URL=http://localhost:3000 \
  nextjs-template:prod
```

Open http://localhost:3000

## Notes

- Multi-stage build: `deps` → `build` → `runner` keeps the final image small.
- Uses Corepack to enable pnpm and `--frozen-lockfile` for deterministic installs.
- `next.config.ts` sets `output: 'standalone'` which supports full SSR/SSG/ISR/API routes.
- Copies only `public/`, `.next/standalone/`, and `.next/static/` into the runtime image.
- Runs as non-root user.
- Alpine `libc6-compat` is installed for native module compatibility.

## Common env

- `NEXT_PUBLIC_APP_URL` – base URL used by `absoluteUrl()` util.
- For additional env, see `env.ts`.
