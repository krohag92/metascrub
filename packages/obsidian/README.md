# MetaScrub for Obsidian

> See and strip metadata from any file — right inside your vault.

MetaScrub scans your Obsidian vault attachments (images, PDFs, Office documents, and more), surfaces sensitive metadata fields like GPS coordinates, author names, and device serials, and lets you scrub them in one click.

**Web version and docs: https://metadatafinder.com**

---

## Screenshot

![MetaScrub scan results modal showing GPS warning on a JPEG attachment](docs/screenshot-scan-results.png)

*Screenshot placeholder — replace with actual screenshot before submission.*

---

## Features

- **Vault scan** — run "MetaScrub: Scan attachments" to check all supported attachments at once. A modal lists every file with metadata warnings.
- **Right-click integration** — right-click any attachment in the file explorer to "View metadata" or "Scrub metadata" directly.
- **Status bar pill** — after each scan the status bar shows the count of files with warnings. Turns red when warnings exist.
- **Scrub presets** — choose between "All fields", "GPS only", "Personal info only", and "Keep technical" in plugin settings.
- **Supports 16+ formats** — JPEG, PNG, HEIC, WebP, AVIF, TIFF, PDF, DOCX, XLSX, PPTX, EPUB, SVG, MP3, MP4, MOV, and more.
- **No telemetry** — all processing is local. Nothing leaves your device.

---

## Installation

### Via Community Plugins (recommended once approved)

1. Open Obsidian Settings > Community plugins.
2. Search for **MetaScrub**.
3. Click Install, then Enable.

### Manual install (v0.1 — while awaiting Community Plugins approval)

1. Download `main.js`, `manifest.json`, and `styles.css` from the [latest release](https://github.com/metascrub/metascrub/releases).
2. Create folder `.obsidian/plugins/metascrub/` in your vault.
3. Copy the three files into that folder.
4. Open Obsidian Settings > Community plugins, disable Safe mode, and enable **MetaScrub**.

---

## Usage

### Scan the whole vault

- Click the shield icon in the ribbon, **or**
- Open the command palette (`Cmd/Ctrl+P`) and run **MetaScrub: Scan attachments**.

### Inspect a single file

Right-click an attachment in the file explorer:
- **View metadata (MetaScrub)** — opens a detail modal showing all metadata fields grouped by category (EXIF, IPTC, XMP, etc.). Sensitive fields are highlighted in red.
- **Scrub metadata (MetaScrub)** — applies the selected scrub preset and writes the cleaned bytes back to the same path.

### Settings

Open Settings > MetaScrub:

| Setting | Description |
|---|---|
| Scrub preset | Which fields to remove when scrubbing (All / GPS only / Personal only / Keep technical) |
| Include subfolders | Whether to scan all subfolders during a vault scan |

---

## Supported file types

| Category | Extensions |
|---|---|
| Images | jpg, jpeg, png, heic, webp, tiff, avif |
| Documents | pdf, docx, xlsx, pptx, epub |
| Vector | svg |
| Video | mp4, mov |
| Audio | mp3 |

---

## Mobile caveats

`isDesktopOnly` is set to `false` because `@metascrub/core` runs in any JavaScript environment, including the Obsidian mobile app. However, note:

- Very large files (> 100 MB video) may be slow on mobile due to in-memory processing.
- Obsidian mobile may not support `vault.modifyBinary` for files stored in iCloud or other cloud providers — scrubbing those files may fail silently. A warning Notice is shown in that case.

---

## Privacy

MetaScrub processes all files locally on your device. No file content, metadata, or usage data is ever transmitted anywhere. See the [privacy policy](https://metadatafinder.com/extension/privacy).

---

## Contributing

Source is at [github.com/metascrub/metascrub](https://github.com/metascrub/metascrub) in `packages/obsidian/`.

```bash
# Build
pnpm --filter @metascrub/obsidian build

# Test
pnpm --filter @metascrub/obsidian test

# Type-check
pnpm --filter @metascrub/obsidian typecheck
```

---

## License

MIT — see [LICENSE](LICENSE).

Powered by [metadatafinder.com](https://metadatafinder.com).
