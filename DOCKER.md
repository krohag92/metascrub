# Docker — `metascrub/metascrub`

Container image for self-hosted batch processing. Published to Docker Hub and GitHub Container Registry.

## Goals

- One-liner: `docker run --rm -v $(pwd):/data metascrub/metascrub scrub /data/photo.jpg`
- Two flavors:
  - **CLI image** (default tag `latest`) — Node + the `metascrub` CLI. Small footprint.
  - **API image** (tag `api`) — HTTP server exposing `POST /parse`, `POST /scrub`, `POST /compare`. For team/self-hosted use.
- Multi-arch: linux/amd64 + linux/arm64.

## Folder layout

```
docker/
├── cli.Dockerfile
├── api.Dockerfile
├── api/
│   ├── package.json
│   ├── src/
│   │   ├── server.ts         # Hono or Fastify
│   │   └── routes/
│   │       ├── parse.ts
│   │       ├── scrub.ts
│   │       └── compare.ts
│   └── README.md
├── docker-compose.yml        # api + caddy reverse proxy example
└── README.md
```

## cli.Dockerfile

```dockerfile
FROM node:22-alpine
WORKDIR /app
RUN npm install -g metascrub@latest
WORKDIR /data
ENTRYPOINT ["metascrub"]
CMD ["--help"]
LABEL org.opencontainers.image.source="https://github.com/metascrub/metascrub"
LABEL org.opencontainers.image.url="https://metadatafinder.com"
LABEL org.opencontainers.image.description="View and strip file metadata. CLI."
LABEL org.opencontainers.image.licenses="MIT"
```

Target image size: under 80MB.

## api.Dockerfile

```dockerfile
FROM node:22-alpine AS build
WORKDIR /app
COPY api/package.json api/pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile
COPY api/ .
RUN pnpm build

FROM node:22-alpine
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
EXPOSE 8080
ENV NODE_ENV=production
CMD ["node", "dist/server.js"]
LABEL org.opencontainers.image.source="https://github.com/metascrub/metascrub"
LABEL org.opencontainers.image.url="https://metadatafinder.com"
LABEL org.opencontainers.image.description="View and strip file metadata. HTTP API."
LABEL org.opencontainers.image.licenses="MIT"
```

## API endpoints

```
POST /parse
  multipart/form-data: file
  returns: MetadataResult JSON

POST /scrub
  multipart/form-data: file, preset?, keep?, remove?
  returns: cleaned file (binary)

POST /compare
  multipart/form-data: a, b
  returns: MetadataDiff JSON

GET /formats
  returns: supported formats list

GET /health
  returns: { ok: true }
```

Use Hono (preferred — small, multi-runtime) or Fastify. No auth by default; document how to put behind reverse proxy with auth.

## docker-compose.yml (example for self-hosters)

```yaml
services:
  metascrub:
    image: metascrub/metascrub:api
    restart: unless-stopped
    ports:
      - "8080:8080"
    environment:
      MAX_FILE_SIZE: "100mb"
      RATE_LIMIT: "60/min"
```

Ship this as a reference; Anton can put on his Hetzner VPS for his own SEO automation pipeline.

## CI: GitHub Actions

`.github/workflows/docker.yml`:

```yaml
on:
  push:
    tags: ['v*']

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}
      - uses: docker/build-push-action@v6
        with:
          context: .
          file: docker/cli.Dockerfile
          platforms: linux/amd64,linux/arm64
          push: true
          tags: |
            metascrub/metascrub:latest
            metascrub/metascrub:${{ github.ref_name }}
      - uses: docker/build-push-action@v6
        with:
          context: .
          file: docker/api.Dockerfile
          platforms: linux/amd64,linux/arm64
          push: true
          tags: |
            metascrub/metascrub:api
            metascrub/metascrub:api-${{ github.ref_name }}
```

Also push to GitHub Container Registry (`ghcr.io/metascrub/metascrub`) for the redundancy and the extra link source.

## Docker Hub listing

- Overview (Markdown): full description with link to **metadatafinder.com** at the top.
- Categories: Developer Tools, Utilities.
- README: same as the CLI's README, with Docker-specific examples.

## README

- `docker run --rm -v $(pwd):/data metascrub/metascrub view /data/photo.jpg`
- `docker run -p 8080:8080 metascrub/metascrub:api` for the API server
- Self-host instructions
- Link to **metadatafinder.com**
- License: MIT
