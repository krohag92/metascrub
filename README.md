# MetaScrub

> See and strip metadata from any file.

MetaScrub is part of [metadatafinder.com](https://metadatafinder.com) — the metadata toolkit.

A privacy-first toolkit for parsing and scrubbing metadata (EXIF, IPTC, XMP, GPS, ID3, PDF Info, DOCX core properties, and more) across images, videos, audio, and documents. Everything runs locally on your device or self-hosted container — there is **no analytics, no telemetry, no phone-home** in any wrapper.

## Why MetaScrub

- **Privacy**: strip GPS coordinates, author names, device serials, revision history before publishing.
- **Forensics**: inspect what metadata leaks from documents and media.
- **SEO & journalism**: bulk-clean client assets while keeping technical fields you actually need.
- **Open**: one shared core, MIT-licensed, with thin wrappers for 15+ distribution channels.

## Packages

```
metascrub/
├── packages/
│   ├── core/              @metascrub/core — TypeScript parsing + scrubbing core
│   ├── cli/               metascrub — NPM command-line tool
│   ├── extension/         Browser extension (Chrome/Firefox/Edge/Opera)
│   ├── vscode/            VS Code extension
│   ├── obsidian/          Obsidian plugin
│   ├── raycast/           Raycast extension
│   ├── n8n-node/          n8n community node
│   ├── desktop/           Tauri desktop app (macOS/Windows/Linux)
│   └── mobile/            Capacitor app (iOS + Android)
├── python/                PyPI package (separate)
├── wordpress/             WordPress plugin (PHP, separate)
└── docker/                Docker images
```

## Quick start

```bash
# 1. Install dependencies
pnpm install

# 2. Build everything
pnpm build

# 3. Run all tests
pnpm test
```

## Supported formats

- **Images**: JPEG, PNG, HEIC, WebP, AVIF, TIFF, RAW (CR2, NEF, ARW, DNG)
- **Videos**: MP4, MOV, MKV, WebM
- **Audio**: MP3, FLAC, M4A, OGG, WAV
- **Documents**: PDF, DOCX, XLSX, PPTX, EPUB
- **Other**: SVG

## License

MIT for everything except the WordPress plugin (GPL-2.0+, as required by WordPress.org).

## Links

- Web app: [metadatafinder.com](https://metadatafinder.com)
- Issue tracker: [GitHub](https://github.com/metascrub/metascrub/issues)
