# MetaScrub — Raycast Extension

> See and strip metadata from any file, right from Raycast.

Web version and full documentation: **https://metadatafinder.com**

---

## Commands

### View Metadata

Inspect every metadata field in a file — EXIF, IPTC, XMP, GPS, document properties, and more.
Warnings are surfaced at the top of the list when sensitive data (GPS coordinates, personal info,
tracked changes) is detected.

**Arguments**

| Argument | Type | Description |
|---|---|---|
| `selectFile` | text | Absolute path to the file to inspect |

**Actions**

- Copy as JSON — copies the full metadata tree as pretty-printed JSON
- Open metadatafinder.com — opens the web version
- Scrub this file — deep-links to the Scrub command

---

### Scrub Metadata

Strip metadata from a file using one of four presets. The cleaned file is written alongside the
original with a `.clean` suffix (e.g. `photo.jpg` → `photo.clean.jpg`). The original is never
modified.

**Arguments**

| Argument | Type | Description |
|---|---|---|
| `selectFile` | text | Absolute path to the file to scrub |
| `preset` | dropdown | Which metadata to remove (see below) |

**Presets**

| Value | Description |
|---|---|
| `all` | Remove every metadata field that is safe to strip (default) |
| `gps-only` | Remove GPS coordinates only; keep everything else |
| `personal-only` | Remove author/owner/software/serial/edit-history fields |
| `keep-technical` | Keep camera/exposure/dimensions; drop everything else |

**Actions**

- Reveal in Finder — opens the output file in Finder
- Open metadatafinder.com — opens the web version

---

## Supported file types

JPEG, PNG, HEIC, WebP, AVIF, TIFF, RAW (CR2/NEF/ARW/DNG), MP4, MOV, MKV, WebM, MP3, FLAC, M4A,
OGG, WAV, PDF, DOCX, XLSX, PPTX, EPUB, SVG.

---

## Installation

### From the Raycast Store (recommended)

1. Open Raycast.
2. Search for "MetaScrub" in the Extensions Store.
3. Click Install.

### Manual install (v0.1 — before store submission)

1. Clone the repository:
   ```
   git clone https://github.com/metascrub/metascrub.git
   cd metascrub
   pnpm install
   ```
2. Build the extension:
   ```
   pnpm --filter @metascrub/raycast build
   ```
   If `ray` CLI is not installed, install it first:
   ```
   npm install -g @raycast/api
   ```
3. In Raycast, open **Preferences → Extensions → + (Add script directory)** and point it at
   `packages/raycast`.

> Note: `ray build` requires the Raycast desktop app and its bundled `ray` CLI. The source files
> are valid Raycast extension format even without the CLI — you can add the directory directly to
> Raycast for development.

---

## Screenshots

_Screenshots will be added before Raycast Store submission._

<!-- View Metadata command screenshot -->
<!-- Scrub command confirmation screenshot -->

---

## Privacy

All file processing is performed locally on your machine. No data is sent to any server. See the
full privacy policy at https://metadatafinder.com/extension/privacy.

---

## License

MIT — see [LICENSE](./LICENSE).

Part of the [MetaScrub](https://metadatafinder.com) toolkit.
