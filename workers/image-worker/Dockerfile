FROM node:22-bookworm-slim AS build

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable

WORKDIR /workspace
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/image-contracts/package.json packages/image-contracts/package.json
COPY packages/image-contracts/tsconfig.json packages/image-contracts/tsconfig.json
COPY packages/image-contracts/src packages/image-contracts/src
COPY workers/image-worker/package.json workers/image-worker/package.json
RUN pnpm install --frozen-lockfile

COPY packages/image-contracts packages/image-contracts
COPY workers/image-worker workers/image-worker
RUN pnpm --filter @image-everything/contracts build \
    && pnpm --filter @image-everything/image-worker build \
    && pnpm --filter @image-everything/image-worker deploy --prod /image-worker

FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production
ENV PORT=3020
WORKDIR /app

COPY --from=build --chown=node:node /image-worker/ ./

USER node
EXPOSE 3020
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:'+(process.env.IMAGE_WORKER_PORT||process.env.PORT||'3020')+'/ready',{headers:{authorization:'Bearer '+process.env.IMAGE_WORKER_TOKEN}}).then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]

CMD ["node", "dist/server.js"]
