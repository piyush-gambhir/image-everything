# syntax=docker/dockerfile:1.7

# ---------- prepare: prune the workspace to what this image needs ----------
FROM --platform=$BUILDPLATFORM node:22-bookworm-slim AS prepare
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME/bin:$PNPM_HOME:$PATH
ENV TURBO_TELEMETRY_DISABLED=1
WORKDIR /app
COPY package.json ./
RUN pnpm add -g turbo@^2
COPY . .
RUN turbo prune @image-everything/web --docker

FROM node:22-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME/bin:$PNPM_HOME:$PATH
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

FROM base AS dependencies
COPY --from=prepare /app/out/json/ ./
COPY .npmrc ./
RUN pnpm install --frozen-lockfile

FROM dependencies AS build
ARG NEXT_PUBLIC_API_URL=http://localhost:3001
ARG NEXT_PUBLIC_APP_URL=http://localhost:3000
ARG NEXT_PUBLIC_API_KEY=
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_API_KEY=$NEXT_PUBLIC_API_KEY
ENV SKIP_ENV_VALIDATION=true

COPY --from=prepare /app/out/full/ ./

ARG TURBO_TEAMID=
RUN --mount=type=secret,id=turbo_token \
    TURBO_TOKEN="$(cat /run/secrets/turbo_token 2>/dev/null || true)" \
    pnpm exec turbo run build --filter=@image-everything/web...

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
WORKDIR /app
RUN groupadd --system --gid 1001 image-everything \
    && useradd --system --uid 1001 --gid image-everything web
COPY --from=build --chown=web:image-everything /app/web/.next/standalone ./
COPY --from=build --chown=web:image-everything /app/web/.next/static ./web/.next/static
COPY --from=build --chown=web:image-everything /app/web/public ./web/public
WORKDIR /app/web
USER web
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]
CMD ["node", "server.js"]
