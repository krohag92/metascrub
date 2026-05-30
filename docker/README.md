# MetaScrub Docker Images

> **MetaScrub** — See and strip metadata from any file.
> Online version and docs: **[metadatafinder.com](https://metadatafinder.com)**

Two image flavors are published on Docker Hub and GHCR:

| Tag                          | Description                                          |
| ---------------------------- | ---------------------------------------------------- |
| `metascrub/metascrub:latest` | CLI image — Alpine + Node + the `metascrub` command  |
| `metascrub/metascrub:api`    | HTTP API server — `POST /parse`, `POST /scrub`, etc. |

Both support **linux/amd64** and **linux/arm64**.

---

## CLI image

### Quick start

```bash
# View metadata of a local file
docker run --rm -v $(pwd):/data metascrub/metascrub view /data/photo.jpg

# Scrub GPS from a photo and write to /data/photo.clean.jpg
docker run --rm -v $(pwd):/data metascrub/metascrub scrub /data/photo.jpg \
  --preset gps-only --out /data/photo.clean.jpg

# List all supported formats
docker run --rm metascrub/metascrub formats

# Show help
docker run --rm metascrub/metascrub --help
```

### CLI commands

| Command           | Description                                                               |
| ----------------- | ------------------------------------------------------------------------- |
| `view <file>`     | Print all metadata (add `--json` for JSON output)                         |
| `scrub <file>`    | Remove metadata (`--preset all\|gps-only\|personal-only\|keep-technical`) |
| `compare <a> <b>` | Diff metadata between two files                                           |
| `batch <dir>`     | Process a directory of files                                              |
| `formats`         | List all 25+ supported formats                                            |

---

## API image

### Quick start

```bash
# Start the API server
docker run -p 8080:8080 metascrub/metascrub:api

# Parse metadata from a file
curl -F file=@photo.jpg http://localhost:8080/parse

# Scrub metadata and save the cleaned file
curl -F file=@photo.jpg -F preset=all http://localhost:8080/scrub -o photo.clean.jpg

# Compare two files
curl -F a=@before.jpg -F b=@after.jpg http://localhost:8080/compare

# List supported formats
curl http://localhost:8080/formats

# Health check
curl http://localhost:8080/health
```

### API endpoints

| Method | Path       | Description                                                           |
| ------ | ---------- | --------------------------------------------------------------------- |
| `GET`  | `/health`  | `{ ok: true }`                                                        |
| `GET`  | `/formats` | `{ formats: string[], count: number }`                                |
| `POST` | `/parse`   | `multipart/form-data: file` → `MetadataResult` JSON                   |
| `POST` | `/scrub`   | `multipart/form-data: file, preset?, keep?, remove?` → cleaned binary |
| `POST` | `/compare` | `multipart/form-data: a, b` → `MetadataDiff` JSON                     |

**Scrub options** (form fields):

| Field    | Values                                                         | Default |
| -------- | -------------------------------------------------------------- | ------- |
| `preset` | `all`, `gps-only`, `personal-only`, `keep-technical`, `custom` | `all`   |
| `keep`   | Comma-separated field paths, e.g. `EXIF.Make,EXIF.Model`       | —       |
| `remove` | Comma-separated field paths                                    | —       |

### Environment variables

| Variable        | Default      | Description                                               |
| --------------- | ------------ | --------------------------------------------------------- |
| `PORT`          | `8080`       | TCP port the server listens on                            |
| `MAX_FILE_SIZE` | `100mb`      | Maximum upload size (supports `b`, `kb`, `mb`, `gb`)      |
| `RATE_LIMIT`    | `60/min`     | Requests per client IP (supports `/sec`, `/min`, `/hour`) |
| `NODE_ENV`      | `production` | Set to `test` to disable the HTTP listener                |

---

## Self-hosting with Docker Compose

```bash
# Clone or copy docker-compose.yml from this folder
docker compose up -d

# Check status
docker compose ps
docker compose logs -f metascrub
```

The included `docker-compose.yml` starts the API on port 8080. To add HTTPS
and authentication, put a reverse proxy in front:

### Caddy example (`Caddyfile`)

```
metascrub.example.com {
    basicauth {
        alice $2a$14$...   # bcrypt hash
    }
    reverse_proxy metascrub:8080
}
```

### nginx example

```nginx
server {
    listen 443 ssl;
    server_name metascrub.example.com;

    auth_basic "MetaScrub";
    auth_basic_user_file /etc/nginx/.htpasswd;

    location / {
        proxy_pass http://metascrub:8080;
    }
}
```

**No auth is applied by default** — always run behind a reverse proxy if the
API is exposed to the internet.

---

## OCI image labels

Both images carry standard OCI labels:

| Label                               | Value                                    |
| ----------------------------------- | ---------------------------------------- |
| `org.opencontainers.image.source`   | `https://github.com/metascrub/metascrub` |
| `org.opencontainers.image.url`      | `https://metadatafinder.com`             |
| `org.opencontainers.image.licenses` | `MIT`                                    |

---

## Privacy

MetaScrub processes files **locally inside your container**. No file data is
ever sent to external servers. There is no telemetry or analytics of any kind.

---

## License

MIT — see [LICENSE](../LICENSE).

MetaScrub is part of [metadatafinder.com](https://metadatafinder.com) — the metadata toolkit.
