# Multi-stage Dockerfile for Next.js (Node LTS, pnpm, standalone runtime)
# Optimized for caching and minimal image size

# Base settings shared across stages
FROM node:22-alpine AS base
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PNPM_HOME=/pnpm
ENV PATH="$PNPM_HOME:$PATH"
# Some Next.js deps on Alpine require this for libc compatibility
RUN apk add --no-cache libc6-compat
# Use corepack to manage pnpm safely
RUN corepack enable && corepack prepare pnpm@latest --activate

# Install dependencies (separate layer for better caching)
FROM base AS deps
# Copy only dependency files first for better layer caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml* ./
# Install with frozen lockfile for reproducible builds
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --prod=false

# Build stage
FROM base AS build
# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
# Copy all source files
COPY . .
# Build the application with caching
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm run build

# Production runtime using Next.js standalone output
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000
RUN apk add --no-cache libc6-compat \
  && addgroup -S nodejs && adduser -S nextjs -G nodejs

# Copy necessary build artifacts
COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static

# Use non-root user
USER nextjs

EXPOSE 3000
CMD ["node", "server.js"]
