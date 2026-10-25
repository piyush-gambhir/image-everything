# syntax=docker/dockerfile:1

# ---------- prepare: prune the workspace to what this image needs ----------
FROM --platform=$BUILDPLATFORM node:26.12.1-bookworm-slim AS prepare
RUN npm install --global --allow-scripts=pnpm pnpm@12.15.0
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME/bin:$PNPM_HOME:$PATH
ENV TURBO_TELEMETRY_DISABLED=1
WORKDIR /app
COPY package.json ./
RUN pnpm add -g turbo@^2
COPY . .
RUN turbo prune @image-everything/image-worker --docker

FROM node:26.12.1-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME/bin:$PNPM_HOME:$PATH
WORKDIR /app
RUN npm install --global --allow-scripts=pnpm pnpm@12.15.0

FROM base AS dependencies
COPY --from=prepare /app/out/json/ ./
COPY .npmrc ./
RUN pnpm install --frozen-lockfile

FROM dependencies AS build
COPY --from=prepare /app/out/full/ ./

ARG TURBO_TEAMID=
RUN --mount=type=secret,id=turbo_token \
    TURBO_TOKEN="$(cat /run/secrets/turbo_token 2>/dev/null || true)" \
    pnpm exec turbo run build --filter=@image-everything/image-worker...

RUN pnpm --filter @image-everything/image-worker deploy --prod /image-worker

FROM node:26.12.1-bookworm-slim AS runtime
ENV NODE_ENV=production
ENV PORT=3020
WORKDIR /app

COPY --from=build --chown=node:node /image-worker/ ./
COPY --chown=node:node LICENSE /app/LICENSE

USER node
EXPOSE 3020
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:'+(process.env.IMAGE_WORKER_PORT||process.env.PORT||'3020')+'/ready',{headers:{authorization:'Bearer '+process.env.IMAGE_WORKER_TOKEN}}).then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]

CMD ["node", "dist/server.js"]
