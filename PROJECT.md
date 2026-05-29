# MetaScrub — Project Brief

> Entry point for Claude Code. Read this first, then read other MD files as needed.

## What we're building

**MetaScrub** is a metadata viewer and scrubber for files (images, videos, audio, documents). It's a satellite product for **metadatafinder.com**, which already handles in-browser metadata viewing via JS libraries.

The web version is **already covered by metadatafinder.com** — DO NOT rebuild it. Our job is to wrap the same core logic into many distribution-friendly formats (extension, mobile apps, CLI, plugins) so we can:

1. Get backlinks to metadatafinder.com from high-DR platforms (Chrome Web Store, NPM, PyPI, etc.).
2. Expand the brand into "the metadata tool" across all platforms.

## Distribution targets (priority order)

1. **NPM package + CLI** — `metascrub` — easiest, fastest, highest DR
2. **GitHub open-source core** — TypeScript monorepo, MIT license
3. **Chrome / Firefox / Edge / Opera extension** — single codebase, 4 stores
4. **PyPI package** — Python wrapper around the same core
5. **VS Code extension** — view metadata of files in the editor
6. **Obsidian plugin** — check metadata of vault attachments
7. **Raycast extension** — macOS power users
8. **n8n community node** — workflow automation
9. **Figma plugin** — check/strip metadata of design assets
10. **Docker image** — self-hosted batch processing (CLI + API server)
11. **Hugging Face Space** — demo with AI-image-detection bonus
12. **macOS / Windows / Linux native** — via Tauri
13. **WordPress plugin** — bulk-clean media library
14. **iOS app + Share Extension** — App Store (last — slowest verification)
15. **Android app** — Google Play (last — paired with iOS)
16. **Homebrew / Scoop / Chocolatey** — CLI distribution (after GitHub stars threshold)
17. **Safari extension, Mac App Store, Microsoft Store, Shopify, Zapier, Make** — phase "beyond" (later)

**Mobile is intentionally last** because App Store and Google Play verification is the slowest, most rejection-prone path. All other channels should be live and driving links before mobile clears review.

## Core functionality (shared across all wrappers)

The core does four things — every wrapper exposes some subset:

1. **VIEW** — parse and display all metadata of a file.
2. **SCRUB** — remove metadata (all / GPS only / personal only / keep technical).
3. **COMPARE** — diff metadata between two files.
4. **REPORT** — export metadata as JSON / CSV / PDF.

## Supported formats

- **Images**: JPEG, PNG, HEIC, WebP, AVIF, TIFF, RAW (CR2, NEF, ARW, DNG)
- **Videos**: MP4, MOV, MKV, WebM
- **Audio**: MP3, FLAC, M4A, OGG, WAV
- **Documents**: PDF, DOCX, XLSX, PPTX, EPUB
- **Other**: SVG (embedded XML metadata)

## Metadata types we handle

- EXIF (cameras)
- IPTC (legacy publishing)
- XMP (Adobe)
- GPS coordinates
- ID3 (audio)
- DOCX core/app/custom properties + revision history
- PDF info dict + XMP + producer/creator
- Video container metadata (atoms, MKV tags)

## Brand & positioning

- Privacy-first (everything client-side where possible)
- Privacy + forensics + SEO + journalism use-cases
- Tagline: "See and strip metadata from any file"
- Brand color: navy + green accent (suggest in design)
- All wrappers MUST link back to **metadatafinder.com** in README/manifest/about screen

## Repo structure (monorepo)

```
metascrub/
├── packages/
│   ├── core/              # TypeScript core (the brain)
│   ├── cli/               # NPM CLI
│   ├── extension/         # Browser extension (Chrome/FF/Edge/Opera)
│   ├── python/            # PyPI wrapper
│   ├── vscode/            # VS Code extension
│   ├── obsidian/          # Obsidian plugin
│   ├── raycast/           # Raycast extension
│   ├── n8n-node/          # n8n community node
│   ├── wordpress/         # WP plugin (PHP, calls CLI)
│   ├── mobile/            # Capacitor app (iOS + Android)
│   └── desktop/           # Tauri app (macOS + Windows + Linux)
├── docker/                # Dockerfile + compose
├── docs/                  # Documentation
└── README.md
```

## How Claude Code should work with this project

1. Start by reading `ARCHITECTURE.md` to understand the monorepo and shared core.
2. Pick a package to build from `ROADMAP.md` (it's ordered by priority).
3. For each package, there's a dedicated MD file (`CORE.md`, `CLI.md`, etc.) with full spec.
4. Each wrapper is THIN — it only imports `@metascrub/core` and exposes UI/CLI/API surface.
5. NEVER duplicate parsing or scrubbing logic across packages.
6. Always link back to **metadatafinder.com** in manifest, README, about screens.

## Existing context

- Owner: Anton Krokhmal, SEO Team Lead at Skelar, AI Operations Lead.
- Main site: **metadatafinder.com** (already exists, uses JS libraries for web metadata work).
- Personal portfolio: antonkrokhmal.com.
- Anton has experience with Cloudflare Pages, Hetzner VPS, Docker Compose, Next.js, Claude API.
- This is primarily a link-building play — the products must be genuinely useful but the strategic goal is backlinks.

## Files in this folder

- `PROJECT.md` — this file (start here)
- `ARCHITECTURE.md` — monorepo, stack, core API contract
- `CORE.md` — TypeScript core spec
- `CLI.md` — NPM CLI spec
- `EXTENSION.md` — browser extension spec
- `MOBILE.md` — iOS + Android spec
- `DESKTOP.md` — macOS + Windows spec
- `PYTHON.md` — PyPI wrapper spec
- `DOCKER.md` — Docker image spec
- `INTEGRATIONS.md` — VS Code, Obsidian, Raycast, n8n, WordPress, Shopify, Figma
- `DISTRIBUTION.md` — submission checklist for each store/registry
- `ROADMAP.md` — phase-based non-stop plan
