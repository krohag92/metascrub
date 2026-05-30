# MetaScrub: Metadata Viewer

See and strip metadata from any file. iOS and Android app built with Capacitor 6.

**Web version: https://metadatafinder.com**

[![App Store](https://img.shields.io/badge/App_Store-Coming_Soon-blue?logo=apple)](https://metadatafinder.com)
[![Google Play](https://img.shields.io/badge/Google_Play-Coming_Soon-green?logo=google-play)](https://metadatafinder.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## What it does

MetaScrub reveals the hidden metadata inside your photos, videos, and documents, then scrubs it clean before you share.

- View EXIF, IPTC, XMP, GPS, ID3, PDF info, and DOCX properties
- Strip metadata with four presets: All / GPS only / Personal only / Keep technical
- Receive files via iOS Share Extension and Android Share Intent
- Works fully offline — your files never leave your device

## Screenshots

_Screenshots will be added once the app is running on a real device. See `assets/SCREENSHOTS-TODO.md` for the full checklist._

| Home        | File View   | Scrub       | Settings    |
| ----------- | ----------- | ----------- | ----------- |
| _(pending)_ | _(pending)_ | _(pending)_ | _(pending)_ |

## Supported formats

Images: JPEG, PNG, HEIC, WebP, AVIF, TIFF, SVG, RAW (CR2, NEF, ARW, DNG)
Videos: MP4, MOV, MKV, WebM
Audio: MP3, FLAC, M4A, OGG, WAV
Documents: PDF, DOCX, XLSX, PPTX, EPUB

## CLI

```
npm install -g metascrub
```

See the CLI documentation at https://metadatafinder.com.

## Development

### Prerequisites

- Node.js 18+
- pnpm 8+
- For iOS: macOS + Xcode 15+
- For Android: Android Studio Hedgehog+ + JDK 17+

### Build the web UI

```bash
pnpm install
pnpm build
```

### Add native platforms

```bash
# iOS — see ios/SETUP.md for full instructions
npx cap add ios
npx cap open ios

# Android — see android/SETUP.md for full instructions
npx cap add android
npx cap open android
```

### Sync after changes

```bash
pnpm build && npx cap sync
```

### Tests

```bash
pnpm test
```

### Typecheck

```bash
pnpm typecheck
```

## iOS Share Extension

The share extension Swift sources are in `ios/MetaScrubShare/`. Follow `ios/SETUP.md` to add the Xcode target manually after running `npx cap add ios`.

The extension:

1. Accepts files from Photos, Files, and any app via the iOS Share Sheet
2. Copies the file to an App Group container (`group.com.metadatafinder.metascrub`)
3. Opens MetaScrub via the `metascrub://share?path=...` URL scheme

## Android Share Intent

Follow `android/SETUP.md` and apply the intent-filter fragments from `android/MANIFEST_OVERRIDE.md` to `AndroidManifest.xml` after `npx cap add android`.

## Signing and release

See `SIGNING.md` for complete step-by-step instructions for both platforms. Anton handles all signing and uploads.

## Privacy

MetaScrub collects **no data whatsoever**.

- No analytics
- No crash reporting
- No network requests
- No user accounts
- Files are processed entirely on-device

Privacy policy: https://metadatafinder.com/extension/privacy

iOS Privacy Nutrition Label: Data Not Collected (see `assets/privacy-nutrition-label-ios.md`)
Google Play Data Safety: No data collected (see `assets/data-safety-android.md`)

## Architecture

```
packages/mobile/
├── src/
│   ├── App.tsx                 # Root with hash router + share listener
│   ├── main.tsx
│   ├── styles.css
│   ├── screens/
│   │   ├── HomeScreen.tsx      # Recent files + pick file
│   │   ├── FileScreen.tsx      # Metadata viewer
│   │   ├── ScrubScreen.tsx     # Preset picker + scrub action
│   │   └── SettingsScreen.tsx  # Default preset + about
│   ├── components/
│   │   ├── MetadataGroup.tsx   # Collapsible namespace section
│   │   ├── Warning.tsx         # Red warning banner
│   │   ├── PresetPicker.tsx    # Radio list for scrub presets
│   │   ├── TabBar.tsx          # Bottom navigation
│   │   └── RecentFilesList.tsx # List of recently opened files
│   └── lib/
│       ├── route.ts            # Minimal hash router (no external dep)
│       ├── pick-file.ts        # File picker (Capacitor + web fallback)
│       ├── save-file.ts        # Write scrubbed file + share sheet
│       ├── share-extension.ts  # Deep-link handler for Share Extension
│       ├── recent-files.ts     # @capacitor/preferences storage
│       └── settings.ts         # User preferences storage
├── ios/
│   ├── MetaScrubShare/         # Share Extension Swift sources
│   ├── MetaScrub.entitlements  # App Group entitlements
│   └── SETUP.md                # Step-by-step Xcode setup guide
├── android/
│   ├── SETUP.md                # Android Studio setup guide
│   └── MANIFEST_OVERRIDE.md    # Intent-filter XML fragments
├── assets/
│   ├── SCREENSHOTS-TODO.md
│   ├── privacy-nutrition-label-ios.md
│   ├── data-safety-android.md
│   ├── app-store-listing.md
│   └── play-store-listing.md
├── capacitor.config.ts
├── vite.config.ts
├── tsconfig.json
└── SIGNING.md
```

The core parsing logic lives in `@metascrub/core` — this package is a thin UI wrapper.

## License

MIT — see [LICENSE](LICENSE)

MetaScrub is part of [metadatafinder.com](https://metadatafinder.com) — the metadata toolkit.
