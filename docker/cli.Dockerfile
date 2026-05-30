# ---------------------------------------------------------------------------
# MetaScrub CLI image — metascrub/metascrub:latest
#
# Bundles the metascrub CLI so users can run:
#   docker run --rm -v $(pwd):/data metascrub/metascrub view /data/photo.jpg
#
# Multi-arch: linux/amd64, linux/arm64.
# Target compressed size: < 80 MB.
#
# Once metascrub is published to NPM, replace the workspace build below with:
#   RUN npm install -g metascrub@latest
# ---------------------------------------------------------------------------

# --- build stage: pack the CLI & core dist from the monorepo ---------------
FROM node:22-alpine AS build

WORKDIR /build

# Enable pnpm via corepack (already bundled with Node 22).
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy workspace manifests first for better layer caching.
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/core/package.json  ./packages/core/package.json
COPY packages/cli/package.json   ./packages/cli/package.json

# Install workspace dependencies for core + cli only (no docker/api).
RUN pnpm install --frozen-lockfile --filter @metascrub/core --filter metascrub

# Copy source trees and build.
COPY packages/core/ ./packages/core/
COPY packages/cli/  ./packages/cli/

RUN pnpm --filter @metascrub/core build && \
    pnpm --filter metascrub build && \
    test -f packages/cli/dist/index.js

# --- final stage: slim Alpine + Node ---------------------------------------
FROM node:22-alpine

LABEL org.opencontainers.image.source="https://github.com/metascrub/metascrub"
LABEL org.opencontainers.image.url="https://metadatafinder.com"
LABEL org.opencontainers.image.description="MetaScrub — See and strip metadata from any file. CLI image."
LABEL org.opencontainers.image.licenses="MIT"

WORKDIR /app

# Copy built artefacts and node_modules from build stage.
COPY --from=build /build/packages/core/dist          ./packages/core/dist
COPY --from=build /build/packages/core/package.json   ./packages/core/package.json
COPY --from=build /build/packages/cli/dist            ./packages/cli/dist
COPY --from=build /build/packages/cli/package.json    ./packages/cli/package.json
COPY --from=build /build/node_modules                ./node_modules

# Wire up workspace symlinks manually (pnpm creates these; we replicate them).
RUN mkdir -p node_modules/@metascrub && \
    ln -s /app/packages/core node_modules/@metascrub/core

# Make the CLI globally reachable. The dist/index.js produced by tsup already
# has a #!/usr/bin/env node shebang, so we only need the symlink + chmod.
RUN chmod +x /app/packages/cli/dist/index.js && \
    ln -s /app/packages/cli/dist/index.js /usr/local/bin/metascrub

WORKDIR /data

ENTRYPOINT ["metascrub"]
CMD ["--help"]
