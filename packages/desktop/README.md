# MetaScrub Desktop

**See and strip metadata from any file** — native desktop app for macOS, Windows, and Linux.

Web version and full documentation: **https://metadatafinder.com**

> MetaScrub is part of [metadatafinder.com](https://metadatafinder.com) — the metadata toolkit.

---

## Download

| Platform | Download | Store |
|---|---|---|
| macOS (Apple Silicon + Intel) | [MetaScrub-0.1.0.dmg](https://metadatafinder.com/desktop/releases/MetaScrub-0.1.0.dmg) | _Mac App Store coming soon_ |
| Windows (x64) | [MetaScrub-0.1.0-setup.msi](https://metadatafinder.com/desktop/releases/MetaScrub-0.1.0-setup.msi) | [Microsoft Store](#) _(pending review)_ |
| Linux (Debian/Ubuntu) | [metascrub_0.1.0_amd64.deb](https://metadatafinder.com/desktop/releases/metascrub_0.1.0_amd64.deb) | [Flathub](#) _(pending review)_ |
| Linux (Universal) | [MetaScrub-0.1.0.AppImage](https://metadatafinder.com/desktop/releases/MetaScrub-0.1.0.AppImage) | — |

---

## Screenshot

_[Screenshot placeholder — add before release]_

---

## Features

- Three-pane layout: file queue, metadata detail, scrub options.
- Drag-and-drop files or folders directly onto the app.
- Batch mode: process multiple files at once with progress bar.
- Persistent recent files list.
- Scrub presets: Remove all / GPS only / Personal info / Keep technical.
- macOS Services menu entry: right-click any file in Finder and select "Scrub metadata with MetaScrub".
- Windows Explorer right-click integration (installed via MSI).
- Linux `.desktop` file with MIME associations.
- Auto-update: checks `https://metadatafinder.com/desktop/updates/` — version-check only, no telemetry.
- All processing is local. No data leaves your device.

---

## Supported formats

Images: JPEG, PNG, HEIC, WebP, AVIF, TIFF, RAW (CR2, NEF, ARW, DNG)
Videos: MP4, MOV, MKV, WebM
Audio: MP3, FLAC, M4A, OGG, WAV
Documents: PDF, DOCX, XLSX, PPTX, EPUB
Other: SVG

---

## Privacy

Zero telemetry. The only network request the app makes is an optional version-check against
`https://metadatafinder.com/desktop/updates/` to notify you of new releases. This check only
sends your current version and OS platform — no file contents, no user data.

See our privacy policy: https://metadatafinder.com/extension/privacy

---

## Build from source

### Prerequisites

- **Rust** 1.77+ with the Tauri CLI:
  ```bash
  rustup update stable
  cargo install tauri-cli --version "^2"
  ```
- **Node.js** 20+ and **pnpm** 9+:
  ```bash
  npm install -g pnpm
  ```
- **Platform SDKs:**
  - macOS: Xcode command-line tools (`xcode-select --install`)
  - Windows: Visual Studio 2022 Build Tools with "Desktop development with C++"
  - Linux (Debian/Ubuntu):
    ```bash
    sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file \
      libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
    ```

### Steps

```bash
# 1. Install all JS dependencies from the monorepo root
pnpm install

# 2. Build @metascrub/core first (desktop depends on it)
pnpm --filter @metascrub/core build

# 3. Build the React frontend only
pnpm --filter @metascrub/desktop build:web

# 4. Full Tauri build (frontend + Rust shell + platform bundle)
pnpm --filter @metascrub/desktop tauri:build
```

Output artifacts:
- macOS: `src-tauri/target/release/bundle/dmg/MetaScrub_0.1.0_x64.dmg`
- Windows: `src-tauri/target/release/bundle/msi/MetaScrub_0.1.0_x64_en-US.msi`
- Linux: `src-tauri/target/release/bundle/deb/metascrub_0.1.0_amd64.deb`
  and `src-tauri/target/release/bundle/appimage/metascrub_0.1.0_amd64.AppImage`

### Dev server

```bash
pnpm --filter @metascrub/desktop tauri:dev
# or equivalently:
pnpm --filter @metascrub/desktop dev   # starts Vite only (no Tauri shell)
```

---

## Code signing

Code signing is not included in this repository.

- macOS: requires an Apple Developer Program account. Run `tauri signer` after obtaining your certificate.
- Windows: requires an OV/EV certificate. v0.1 ships unsigned; SmartScreen will show a warning. The Microsoft Store path bypasses SmartScreen.
- Linux: no signing required for `.deb` / `.AppImage`.

---

## Auto-update

The updater polls `https://metadatafinder.com/desktop/updates/{{target}}-{{arch}}/{{current_version}}` for a JSON manifest. The signing public key in `src-tauri/tauri.conf.json` is a placeholder — Anton must regenerate it with `tauri signer generate` before releasing.

---

## Contributing

- Source: https://github.com/metascrub/metascrub
- License: MIT
- Issues and PRs welcome.

---

Open source under MIT — see [github.com/metascrub/metascrub](https://github.com/metascrub/metascrub).
