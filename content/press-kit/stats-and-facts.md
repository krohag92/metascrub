# MetaScrub — Stats and Facts

A reference sheet for coverage, directory listings, and product comparisons. All figures are verifiable from the codebase and published metadata.

---

## MetaScrub at a Glance

|                      |                                              |
| -------------------- | -------------------------------------------- |
| **Product name**     | MetaScrub                                    |
| **Home**             | https://metadatafinder.com                   |
| **License**          | MIT (open source)                            |
| **Repository**       | https://github.com/metascrub/metascrub       |
| **Current version**  | 0.1.0                                        |
| **Core language**    | TypeScript                                   |
| **Processing model** | Local only — no files uploaded, no telemetry |

---

## Supported Formats (25 total)

**Images (9):**
JPEG, PNG, HEIC, WebP, AVIF, TIFF, RAW (Canon CR2, Nikon NEF, Sony ARW, Adobe DNG)

**Audio (5):**
MP3, FLAC, M4A, OGG, WAV

**Video (4):**
MP4, MOV, MKV, WebM

**Documents (6):**
PDF, DOCX, XLSX, PPTX, EPUB, SVG

---

## Metadata Standards Covered

- EXIF (Exchangeable Image File Format)
- IPTC (International Press Telecommunications Council)
- XMP (Extensible Metadata Platform, Adobe)
- GPS coordinates (EXIF GPS IFD)
- ID3 (audio file tagging)
- DOCX core/app/custom properties and revision history
- PDF Info Dictionary + XMP stream
- Video container metadata (MPEG-4 atoms, Matroska tags)

---

## Scrub Presets

| Preset           | What it removes                                          |
| ---------------- | -------------------------------------------------------- |
| `all`            | Every metadata field that is safe to strip               |
| `gps-only`       | GPS coordinates only; keeps everything else              |
| `personal-only`  | Author, owner, software, serial numbers                  |
| `keep-technical` | Removes everything except camera/exposure/dimension data |

---

## Distribution Channels

| Platform                   | Package / ID                | Status    |
| -------------------------- | --------------------------- | --------- |
| Web (metadatafinder.com)   | —                           | Live      |
| NPM CLI                    | `metascrub`                 | Live      |
| NPM Library                | `@metascrub/core`           | Live      |
| PyPI                       | `metascrub`                 | Live      |
| Chrome Web Store           | MetaScrub                   | Submitted |
| Firefox AMO                | MetaScrub                   | Submitted |
| Microsoft Edge Add-ons     | MetaScrub                   | Submitted |
| Opera Add-ons              | MetaScrub                   | Submitted |
| VS Code Marketplace        | MetaScrub                   | Live      |
| Obsidian Community Plugins | MetaScrub                   | Submitted |
| Raycast Store              | MetaScrub                   | Submitted |
| n8n Community Nodes        | MetaScrub                   | Submitted |
| Figma Community            | MetaScrub                   | Live      |
| Docker Hub                 | `metascrub/metascrub`       | Live      |
| Hugging Face Spaces        | `metascrub/metadata-viewer` | Live      |

_Status reflects intended state at Phase 5 completion; Anton should update to actual submission status before publishing._

---

## Technical Facts

- Core library written in TypeScript, compiles to ESM and CJS
- Runs in Node 18+, Bun, Deno, browsers, Cloudflare Workers, React Native
- Zero side effects on import (no global state)
- Bundle size under 500KB for the browser extension
- Python wrapper uses the same parsing logic, ported natively
- All scrub operations are lossless for pixel data (JPEG pixel bytes are not re-encoded)
- EXIF orientation is preserved by default in all presets
- ICC color profiles are preserved by default in all presets

---

## Privacy Commitments

- No analytics, no telemetry, no phone-home in any distribution
- Files are processed locally on the user's device
- Extension stores settings in `chrome.storage` (local); no sync to any server
- Privacy policy: https://metadatafinder.com/extension/privacy

---

_Last updated: 2026-05-30. Source of record: https://metadatafinder.com_
