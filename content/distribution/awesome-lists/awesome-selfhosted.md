# Awesome Selfhosted — MetaScrub Submission

## Target list

**Repository:** https://github.com/awesome-selfhosted/awesome-selfhosted

**Contributing guide:** https://github.com/awesome-selfhosted/awesome-selfhosted/blob/master/CONTRIBUTING.md

**Target section:** "File Transfer & Synchronization" or "Document Management" — awesome-selfhosted has strict categorization; the closest existing category for a file metadata tool would be "Document Management" or possibly "Media Streaming" depending on how the maintainers interpret scope. Check current section headings before submitting.

---

## Submission line

This list uses the format: `- [Name](homepage) - Description. ([Demo](demo-url), [Source Code](source-url)) \`LICENSE\` \`Language\``

```markdown
- [MetaScrub](https://metadatafinder.com) - Metadata viewer and scrubber with HTTP API. View and strip EXIF, GPS, ID3, XMP, and document metadata from 25 file formats via REST API or CLI. ([Source Code](https://github.com/metascrub/metascrub)) `MIT` `Docker/Nodejs`
```

---

## PR title

```
Add MetaScrub — self-hosted metadata viewer and scrubber (Docker + HTTP API)
```

## PR body

```markdown
Hi! Proposing MetaScrub for self-hosted deployment.

**Self-hosted angle:** MetaScrub ships a Docker image (`metascrub/metascrub:api`) that exposes an HTTP API for batch metadata viewing and scrubbing. It can be deployed on any server or in a home lab and used from other services via REST.

**API endpoints:**
```

POST /view — returns metadata as JSON
POST /scrub — returns scrubbed file
POST /compare — returns metadata diff
POST /batch — batch process a folder

````

**Deploy:**
```bash
docker pull metascrub/metascrub:api
docker run -p 3000:3000 metascrub/metascrub:api
````

Or with Compose:

```yaml
services:
  metascrub:
    image: metascrub/metascrub:api
    ports:
      - '3000:3000'
    volumes:
      - ./files:/data
```

**Key self-hosted properties:**

- No external calls — all processing happens in the container
- Multi-arch image (amd64 + arm64) — runs on Raspberry Pi, ARM servers, standard x86
- No database, no state — stateless API server
- Can be put behind a reverse proxy (Nginx, Traefik, Caddy)

**License:** MIT
**Docker Hub:** https://hub.docker.com/r/metascrub/metascrub
**Source:** https://github.com/metascrub/metascrub
**Homepage:** https://metadatafinder.com

Please let me know if a different section would be a better fit.

```

---

_Note: awesome-selfhosted has strict requirements — the tool must be genuinely self-hostable (it is, via Docker), must have a working demo or clear deploy instructions, and must have a proper open-source license (MIT qualifies). The maintainers may ask which section it fits — "Document Management" is the most likely landing spot. Avoid "Media Streaming" — that's for playback tools._
```
