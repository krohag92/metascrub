---
title: MetaScrub
emoji: 🔍
colorFrom: indigo
colorTo: purple
sdk: gradio
sdk_version: '4.44.0'
app_file: app.py
pinned: false
license: mit
short_description: View and strip metadata from any file.
---

# MetaScrub — Metadata Viewer and Scrubber

**See and strip metadata from any file.**

[![Web app](https://img.shields.io/badge/Web_app-metadatafinder.com-4f46e5?style=flat-square)](https://metadatafinder.com)
[![PyPI](https://img.shields.io/badge/PyPI-pip_install_metascrub-3776ab?style=flat-square)](https://metadatafinder.com)
[![NPM](https://img.shields.io/badge/NPM-%40metascrub%2Fcore-cb3837?style=flat-square)](https://metadatafinder.com)
[![GitHub](https://img.shields.io/badge/GitHub-metascrub-181717?style=flat-square)](https://github.com/metascrub/metascrub)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](./LICENSE)

> **Try the full toolkit at [metadatafinder.com](https://metadatafinder.com)** — web app, CLI, browser extensions, desktop app, and SDKs.

MetaScrub reads and removes embedded metadata (EXIF, IPTC, XMP, GPS coordinates, author names, software tags, PDF info dictionaries, Word document properties, ID3 audio tags, and more) from the files you upload.

## What this Space does

Three tools in one Gradio interface:

1. **View metadata** — Upload any supported file and see every metadata field, grouped by namespace, with privacy-sensitive fields highlighted and warnings shown prominently.
2. **Scrub** — Remove metadata using one of four presets (`all`, `gps-only`, `personal-only`, `keep-technical`), then download the cleaned file. A side-by-side diff shows exactly what was removed.
3. **AI-generated check** — Heuristic scanner that inspects metadata for markers left by Midjourney, Stable Diffusion, DALL-E, Adobe Firefly, ComfyUI, Automatic1111, and 18+ other tools. No ML model — purely metadata-based, fast and lightweight.

## Supported formats

Currently supported in this Space (via the [Python package](https://metadatafinder.com)):

- **Images** — JPEG, PNG
- **Documents** — PDF, DOCX
- **Audio** — MP3

The full MetaScrub toolkit handles **25 formats** including HEIC, WebP, AVIF, TIFF, RAW (CR2/NEF/ARW/DNG), FLAC, M4A, OGG, WAV, MP4, MOV, MKV, WebM, XLSX, PPTX, EPUB, and SVG. See [metadatafinder.com](https://metadatafinder.com) or [github.com/metascrub/metascrub](https://github.com/metascrub/metascrub) for the full coverage.

## Use it elsewhere

| Channel                                                    | Install                                                  |
| ---------------------------------------------------------- | -------------------------------------------------------- |
| **[Web app](https://metadatafinder.com)**                  | No install — paste a file or URL                         |
| **PyPI**                                                   | `pip install metascrub`                                  |
| **NPM**                                                    | `npm install @metascrub/core` or `npm i -g metascrub`    |
| **Browser extension**                                      | Chrome / Edge / Opera / Firefox — see metadatafinder.com |
| **Desktop**                                                | macOS / Windows / Linux — see metadatafinder.com         |
| **Docker**                                                 | `docker run --rm -v $(pwd):/data metascrub/metascrub`    |
| **VS Code / Obsidian / Raycast / n8n / Figma / WordPress** | See metadatafinder.com/integrations                      |

## Privacy

Files are processed entirely in memory on this Space's server and discarded immediately after the response is returned. No file content is logged, stored, or transmitted to any third party. No analytics, no telemetry, no phone-home.

If you want hard guarantees about your bytes never leaving your machine, run the [CLI](https://metadatafinder.com) or [desktop app](https://metadatafinder.com) instead — both are 100% offline.

## Source code

Open source under MIT license:

- This Space — [github.com/metascrub/metascrub/tree/main/huggingface](https://github.com/metascrub/metascrub)
- Python core — `python/` in the same repo
- TypeScript core (25 formats) — `packages/core/`

Pull requests welcome. More at [metadatafinder.com](https://metadatafinder.com).
