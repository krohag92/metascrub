# Desktop — macOS + Windows + Linux (Tauri)

Native desktop app via Tauri 2. Same UI as the browser extension popup but full-window. Bundles the CLI's full feature set (batch, compare, reports) in a GUI.

## Why Tauri (not Electron)

- Bundle size 5-10MB vs Electron's 100MB+ — better for App Store / Microsoft Store size limits.
- Rust shell means small binary, fast startup.
- macOS notarization and Windows code signing supported.

## Goals

- Drag-and-drop a file or folder onto the app icon → process.
- Bulk batch mode with progress.
- macOS: Quick Action / Services menu entry for "Scrub metadata".
- Windows: Explorer right-click context menu.
- All processing local. No network.

## Folder layout

```
packages/desktop/
├── package.json
├── src-tauri/
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   ├── src/
│   │   └── main.rs           # minimal Tauri shell, exposes filesystem commands
│   └── icons/
├── src/                      # React UI
│   ├── main.tsx
│   ├── App.tsx
│   ├── screens/
│   ├── components/
│   └── lib/
└── README.md
```

## tauri.conf.json (essentials)

```json
{
  "productName": "MetaScrub",
  "version": "0.1.0",
  "identifier": "com.metadatafinder.metascrub.desktop",
  "build": {
    "frontendDist": "../dist",
    "devUrl": "http://localhost:5173"
  },
  "app": {
    "windows": [{ "title": "MetaScrub", "width": 900, "height": 640, "minWidth": 600, "minHeight": 480 }]
  },
  "bundle": {
    "active": true,
    "targets": ["app", "dmg", "msi", "deb", "appimage"],
    "category": "Utility",
    "shortDescription": "View and strip file metadata",
    "longDescription": "MetaScrub views and strips EXIF, GPS, and document metadata from any file. Privacy-first. Powered by metadatafinder.com.",
    "publisher": "metadatafinder.com",
    "macOS": { "minimumSystemVersion": "10.15" },
    "windows": { "wix": { "language": ["en-US"] } }
  }
}
```

## Native integrations

### macOS Quick Action

Register a Service via the Info.plist:

```xml
<key>NSServices</key>
<array>
  <dict>
    <key>NSMenuItem</key>
    <dict><key>default</key><string>Scrub metadata with MetaScrub</string></dict>
    <key>NSMessage</key><string>scrubFiles</string>
    <key>NSPortName</key><string>MetaScrub</string>
    <key>NSSendTypes</key><array><string>NSFilenamesPboardType</string></array>
  </dict>
</array>
```

This makes "Scrub metadata with MetaScrub" appear in Finder's right-click → Services.

### Windows Explorer context menu

Add via Registry on install (handled by WiX template):

```
HKCR\*\shell\MetaScrub
HKCR\*\shell\MetaScrub\command  →  "C:\Program Files\MetaScrub\metascrub.exe" "%1"
```

Best-effort; can be skipped for v0.1 and added in v0.2.

### Linux

`.desktop` file with MIME associations for the supported formats. Add to `~/.local/share/applications/`.

## UI

Reuse 90% of the browser extension popup. Differences:
- Three-pane layout (file list, detail, scrub options) instead of stacked.
- Persistent recent files list (`@tauri-apps/plugin-store`).
- Batch view with progress bar and per-file warning summary.

## Build & distribution

- macOS: build `.dmg` via Tauri, notarize via `tauri signer`, distribute via download on metadatafinder.com AND submit to Mac App Store (sandbox might need extra plumbing — postpone if it bites).
- Windows: build `.msi`, sign with EV certificate. Submit to Microsoft Store (free, easy review).
- Linux: `.deb`, `.AppImage`, and Flatpak (publish to Flathub for distro independence — Flathub is high-DR).

## Code signing

- macOS: Apple Developer Program account ($99/year) for notarization. Skip Mac App Store initially.
- Windows: OV or EV code signing cert (~$200-400/year). For v0.1 we can ship unsigned with SmartScreen warnings, document the workaround in README. Microsoft Store removes the SmartScreen issue.

## Auto-update

Tauri's updater plugin pulling from `https://metadatafinder.com/desktop/updates/<channel>.json`. Generates yet another link to the brand domain.

## README

- Download badges for each platform (.dmg, .msi, Flathub)
- "Microsoft Store" badge once approved
- "Web version: https://metadatafinder.com"
- Screenshots
- "Open source under MIT — see github.com/metascrub/metascrub"
