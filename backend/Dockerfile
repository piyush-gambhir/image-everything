# syntax=docker/dockerfile:1.7

FROM node:22-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

FROM base AS dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY web/package.json web/package.json
COPY backend/package.json backend/package.json
COPY packages/image-contracts/package.json packages/image-contracts/package.json
COPY packages/image-contracts/tsconfig.json packages/image-contracts/tsconfig.json
COPY packages/image-contracts/src packages/image-contracts/src
COPY workers/image-worker/package.json workers/image-worker/package.json
RUN pnpm install --frozen-lockfile

FROM dependencies AS build
COPY packages/image-contracts packages/image-contracts
COPY backend backend
RUN pnpm --filter @image-everything/contracts build
RUN pnpm --filter @image-everything/backend build
RUN pnpm --filter @image-everything/backend deploy --prod /opt/image-everything-api \
    && mkdir -p /opt/image-everything-api/dist \
    && cp -R backend/dist/. /opt/image-everything-api/dist/

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production
ENV PORT=3001
WORKDIR /app
RUN groupadd --system --gid 1001 image-everything \
    && useradd --system --uid 1001 --gid image-everything api
COPY --from=build --chown=api:image-everything /opt/image-everything-api ./
USER api
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:'+(process.env.PORT||'3001')+'/api/ready').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]
CMD ["node", "dist/main.js"]
