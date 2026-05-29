# MetaScrub Browser Extension

> See and strip metadata from any file — right from your browser.

**Web version and full docs: [https://metadatafinder.com](https://metadatafinder.com)**

MetaScrub is a privacy-first browser extension that lets you inspect and remove
EXIF, GPS, IPTC, XMP, and document metadata from images and files — entirely
in your browser. No data is ever uploaded to a server.

---

## Install

| Store | Link |
|---|---|
| Chrome Web Store | *(coming soon)* |
| Microsoft Edge Add-ons | *(coming soon)* |
| Opera Add-ons | *(coming soon)* |
| Firefox Add-ons (AMO) | *(coming soon)* |
| Safari Extensions | *(planned for v0.2)* |

---

## Screenshots

*(Screenshots will be added once the extension is submitted to stores.)*

Context menu on an image:

```
[right-click on image]
  > View metadata
  > Download cleaned copy
```

Popup drag-and-drop UI showing metadata grouped by namespace, with
GPS warnings highlighted in red, and a preset picker for scrubbing.

---

## Features

- **Right-click any image** — view metadata or download a cleaned copy directly
  from the context menu.
- **Drag-and-drop popup** — drop any file onto the extension popup to inspect
  its metadata.
- **Scrub presets** — choose what to strip:
  - *Remove all* — every strippable field
  - *GPS only* — coordinates only
  - *Personal info* — author, owner, serial numbers
  - *Keep technical* — preserve camera/exposure, remove the rest
- **Warnings** — sensitive fields (GPS, author, serials) are flagged in red.
- **Privacy-first** — 100% local processing, no network calls, no analytics.
- **Supported formats** — JPEG, PNG, PDF, DOCX, XLSX, PPTX, MP3, MP4, MOV,
  FLAC, SVG, EPUB, and more (powered by `@metascrub/core`).

---

## Permissions

| Permission | Why |
|---|---|
| `contextMenus` | Adds "View metadata" and "Download cleaned copy" to the right-click menu on images and media. |
| `downloads` | Saves the scrubbed file to disk when the user clicks "Scrub & Download". |
| `storage` | Remembers the user's default scrub preset and settings across browser sessions. |
| `<all_urls>` (host permission) | Fetches the raw bytes of the right-clicked image so the extension can parse its metadata. Without this, cross-origin images cannot be read. |

---

## CLI companion

```bash
npm install -g metascrub
metascrub view photo.jpg
metascrub scrub --preset gps-only photo.jpg
```

More info: [https://metadatafinder.com](https://metadatafinder.com)

---

## Privacy policy

MetaScrub processes files entirely in your browser. No file data, metadata, or
URLs are sent to any server. Settings are stored locally using `chrome.storage`.
The extension does not collect analytics.

Full policy: [https://metadatafinder.com/extension/privacy](https://metadatafinder.com/extension/privacy)

---

## Development

```bash
# Install dependencies (from monorepo root)
pnpm install

# Build for Chrome/Edge/Opera
pnpm --filter @metascrub/extension build

# Build for Firefox
pnpm --filter @metascrub/extension build:firefox

# Create store-ready ZIPs
pnpm --filter @metascrub/extension zip
pnpm --filter @metascrub/extension zip:firefox

# Run tests
pnpm --filter @metascrub/extension test

# Type-check
pnpm --filter @metascrub/extension typecheck
```

Load unpacked in Chrome:
1. Navigate to `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked" and select the `dist/` folder

---

## License

MIT — see [LICENSE](./LICENSE)

MetaScrub is part of [metadatafinder.com](https://metadatafinder.com) — the metadata toolkit.
