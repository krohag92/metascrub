# SaaSHub Product Listing — MetaScrub

Anton submits at saashub.com/submit. Fill each field from this draft.

---

## Basic fields

**Product name:** MetaScrub

**Website:** https://metadatafinder.com

**Short tagline (≤ 80 chars):**

> See and strip metadata from any file. Privacy-first. MIT.

**Category:** Developer Tools / Privacy Tools

**Tags:** metadata, exif, privacy, open-source, cli, browser-extension, file-utilities

---

## Short description (1-2 sentences, shown in search results)

MetaScrub reads and strips hidden metadata from files — EXIF data, GPS coordinates, author names, editing histories — across 25 formats and 15+ platforms. Free and open source.

---

## Full description (paste into the "Description" field)

MetaScrub is an open-source metadata viewer and scrubber. Every file carries hidden information alongside its visible content: GPS coordinates in photos, author names in documents, revision histories in Word files, software identifiers in PDFs. MetaScrub makes this metadata visible and removes it before you share the file.

**Why it matters**

Hidden metadata is a routine privacy and security risk. A photo posted to social media can reveal the exact address where it was taken. A Word document sent to a client may contain the names of every internal reviewer and comments that were thought deleted. A PDF distributed to the press can include the author's full name and company even when the document itself is anonymized.

**Features**

- View all metadata fields: EXIF, IPTC, XMP, GPS, ID3, PDF Info Dictionary, DOCX core/app properties
- Strip metadata with four presets: All / GPS only / Personal only / Keep technical
- Compare metadata between two files (forensics diff view)
- Batch processing for multiple files and folders
- Local processing only — files never leave your device
- Zero telemetry, no analytics, no phone-home

**Supported formats (25 total)**

- Images: JPEG, PNG, HEIC, WebP, AVIF, TIFF, RAW (CR2, NEF, ARW, DNG)
- Audio: MP3, FLAC, M4A, OGG, WAV
- Video: MP4, MOV, MKV, WebM
- Documents: PDF, DOCX, XLSX, PPTX, EPUB, SVG

**Available on**

- Web: https://metadatafinder.com (no install required; processes files in-browser)
- CLI: `npm install -g metascrub`
- Python: `pip install metascrub`
- Chrome, Firefox, Edge, and Opera browser extensions
- VS Code extension
- Obsidian plugin
- Raycast extension
- n8n community node
- Figma plugin
- Docker: `docker pull metascrub/metascrub`
- Tauri desktop app (macOS / Windows / Linux)
- WordPress plugin (bulk-clean media library)

MIT license. Source: https://github.com/metascrub/metascrub

---

## Pricing tiers

**Free / Open Source**

- Everything listed above
- No account required
- No usage limits
- MIT license — self-host, fork, modify

No paid tiers at v0.1.

[verify: confirm with Anton whether a paid web tier is planned before adding one here]

---

## Comparison hints — how MetaScrub differs from alternatives

SaaSHub may ask about alternatives. Use these comparisons if prompted.

### vs. ExifTool (Phil Harvey, 1994–present)

ExifTool is the gold standard for metadata parsing depth — it supports hundreds of formats and tags that MetaScrub does not. It is CLI-only and written in Perl.

MetaScrub is better for: users who need a browser-based tool with no install, a browser extension for on-the-fly checks, a Python library for pipelines, or IDE/plugin integrations (VS Code, Obsidian, n8n). MetaScrub's scrubbing presets are more user-friendly than ExifTool's flags.

ExifTool is better for: raw parsing depth, obscure format support, and power-user CLI workflows.

### vs. Adobe Bridge

Adobe Bridge is a closed-source, paid desktop app (subscription via Creative Cloud). It focuses on image organization and includes features well beyond metadata (batch rename, file browsing, Mini Bridge). Not cross-platform in the same sense — macOS/Windows only, no Linux, no CLI, no browser extension.

MetaScrub is better for: users who do not have a Creative Cloud subscription, developers who need a CLI or library, anyone on Linux, and anyone needing document (DOCX/PDF) or audio/video metadata handling.

Adobe Bridge is better for: designers already in the Adobe ecosystem who need robust image browsing alongside metadata editing.

### vs. ImageOptim (macOS, open source)

ImageOptim is an image optimizer for macOS that removes metadata as a side effect of compression. It is not a metadata viewer — it does not show you what is in the file before removing it, and its primary goal is file size reduction, not privacy.

MetaScrub is better for: viewing metadata before removing it, handling document and audio/video formats, cross-platform use, and selective removal (GPS only, personal only).

ImageOptim is better for: macOS users whose primary goal is reducing image file size and who accept metadata removal as a byproduct.

### vs. PDFsam (PDF Split and Merge)

PDFsam is a PDF-focused tool for splitting, merging, rotating, and editing PDFs. It is not a general metadata viewer or scrubber and does not handle images, audio, or video.

MetaScrub is better for: metadata-specific use across multiple file types. PDFsam is not a direct competitor — it solves a different problem.

---

## Screenshots (SaaSHub accepts up to 6)

Reference the press kit screenshots at `content/press-kit/` (Anton should upload from there):

1. CLI `metascrub view photo.jpg` output
2. Browser extension popup showing EXIF fields
3. VS Code panel with metadata sidebar
4. Web tool at metadatafinder.com
5. Batch scrub output in terminal
6. Compare diff view between two files

---

_Status: Draft — ready for Anton to paste and submit at saashub.com/submit. Fields marked [verify: ...] need Anton's confirmation._
