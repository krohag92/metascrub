# ---------------------------------------------------------------------------
# MetaScrub API image — metascrub/metascrub:api
#
# Runs the Hono HTTP API server that exposes:
#   POST /parse    multipart file → MetadataResult JSON
#   POST /scrub    multipart file + options → cleaned binary
#   POST /compare  multipart a + b → MetadataDiff JSON
#   GET  /formats  → supported formats list
#   GET  /health   → { ok: true }
#
# Usage:
#   docker run -p 8080:8080 metascrub/metascrub:api
#
# Multi-arch: linux/amd64, linux/arm64.
# Target compressed size: < 120 MB.
# ---------------------------------------------------------------------------

# --- build stage -----------------------------------------------------------
FROM node:22-alpine AS build

WORKDIR /build

RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy workspace manifests for cache efficiency.
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/core/package.json   ./packages/core/package.json
COPY docker/api/package.json      ./docker/api/package.json

# Install deps for core + api only.
RUN pnpm install --frozen-lockfile \
    --filter @metascrub/core \
    --filter @metascrub/api

# Copy sources and build.
COPY packages/core/ ./packages/core/
COPY docker/api/    ./docker/api/
COPY tsconfig.base.json ./

RUN pnpm --filter @metascrub/core build && \
    pnpm --filter @metascrub/api build && \
    test -f docker/api/dist/server.js

# --- final stage -----------------------------------------------------------
FROM node:22-alpine

LABEL org.opencontainers.image.source="https://github.com/metascrub/metascrub"
LABEL org.opencontainers.image.url="https://metadatafinder.com"
LABEL org.opencontainers.image.description="MetaScrub — See and strip metadata from any file. HTTP API image."
LABEL org.opencontainers.image.licenses="MIT"

WORKDIR /app

# Copy the bundled dist and node_modules from the build stage.
COPY --from=build /build/docker/api/dist        ./dist
COPY --from=build /build/node_modules           ./node_modules

# Wire the core workspace package so the runtime can find @metascrub/core.
COPY --from=build /build/packages/core/dist     ./packages/core/dist
COPY --from=build /build/packages/core/package.json ./packages/core/package.json
RUN mkdir -p node_modules/@metascrub && \
    ln -s /app/packages/core node_modules/@metascrub/core

EXPOSE 8080

ENV NODE_ENV=production
ENV PORT=8080
ENV MAX_FILE_SIZE=100mb
ENV RATE_LIMIT=60/min

CMD ["node", "dist/server.js"]
