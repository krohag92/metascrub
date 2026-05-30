# MetaScrub — Image Metadata (Figma Plugin)

> See and strip metadata from any file — directly inside Figma.

MetaScrub scans every image fill on your current page for hidden metadata —
GPS coordinates, author names, device serial numbers, software signatures —
and lets you scrub them out in one click.

**Everything runs locally.** No data leaves your machine.
The plugin manifest enforces `networkAccess: { allowedDomains: ["none"] }`.

---

## Features

- **Scan** — detects all images on the current Figma page with hidden metadata.
- **Highlights** — surfaces GPS, Author, Software, and other privacy-sensitive fields.
- **Scrub** — strips all metadata and either replaces the image in the canvas or downloads a clean copy (toggle "Export only").
- **Scrub all** — one click to clean every image on the page.
- Zero network access — 100 % local processing.

---

## Installation

### From Figma Community (recommended)

1. Open Figma.
2. Go to **Plugins > Browse plugins in Community**.
3. Search **MetaScrub**.
4. Click **Install**.

[MetaScrub on Figma Community](https://www.figma.com/community/plugin/metascrub) _(listing coming soon)_

### Manual / Development install

1. Clone this repo:
   ```bash
   git clone https://github.com/metascrub/metascrub.git
   cd metascrub
   pnpm install
   pnpm --filter @metascrub/figma build
   ```
2. In Figma desktop app, go to **Plugins > Development > Import plugin from manifest…**
3. Select `packages/figma/manifest.json`.
4. The plugin will appear under **Plugins > Development > MetaScrub — Image Metadata**.

---

## Usage

1. Open a Figma file with images.
2. Run **Plugins > MetaScrub — Image Metadata**.
3. The panel lists all images found on the current page.
4. Review warnings (GPS, Author, etc.).
5. Click **Scrub** on individual images, or **Scrub all** for the entire page.
6. To download a clean copy instead of replacing in-canvas, enable **Export only**.

---

## Screenshots

_(Screenshots will be added before Figma Community submission.)_

| Plugin panel — scan results | After scrubbing |
|---|---|
| `[screenshot-scan.png]` | `[screenshot-after.png]` |

---

## Supported formats

MetaScrub delegates to `@metascrub/core`, which supports:

JPEG · PNG · WebP · AVIF · TIFF · HEIC · PDF · DOCX · XLSX · PPTX · EPUB · SVG · MP3 · FLAC · M4A · MP4 · MOV · MKV · and more.

---

## Privacy

- No analytics, no telemetry, no phone-home.
- The manifest sets `networkAccess.allowedDomains: ["none"]` — the plugin cannot make any network requests.
- Privacy policy: https://metadatafinder.com/extension/privacy

---

## Development

```bash
# Install dependencies
pnpm install

# Build (produces dist/code.js and dist/ui.html)
pnpm --filter @metascrub/figma build

# Run tests
pnpm --filter @metascrub/figma test

# Type-check
pnpm --filter @metascrub/figma typecheck
```

### Project structure

```
packages/figma/
├── manifest.json          # Figma plugin manifest
├── esbuild.config.mjs     # Two-pass build: sandbox + UI iframe
├── src/
│   ├── code.ts            # Sandbox code (Figma API access, no DOM)
│   └── ui/
│       ├── index.html     # HTML template — script injected by esbuild
│       ├── main.ts        # UI thread: parse/scrub via @metascrub/core
│       └── types.ts       # Shared message-protocol types
├── test/
│   └── collect-image-fills.test.ts
└── dist/                  # Build output (gitignored)
    ├── code.js
    └── ui.html
```

---

## Web version

Full-featured online metadata viewer and scrubber:
**https://metadatafinder.com**

---

## Contributing

Issues and PRs welcome at https://github.com/metascrub/metascrub.

---

## License

MIT — see [LICENSE](./LICENSE).

Built with love for privacy. Part of the [MetaScrub](https://metadatafinder.com) toolkit.
