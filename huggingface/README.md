---
title: MetaScrub
emoji: 🔍
colorFrom: indigo
colorTo: purple
sdk: gradio
sdk_version: "4.44.0"
app_file: app.py
pinned: false
license: mit
short_description: View and strip metadata from any file.
---

# MetaScrub — Metadata Viewer and Scrubber

**See and strip metadata from any file.**

Web version: https://metadatafinder.com

MetaScrub reads and removes embedded metadata (EXIF, IPTC, XMP, GPS coordinates, author names, software tags, PDF info dictionaries, Word document properties, ID3 audio tags, and more) from the files you upload. Supported formats: JPEG, PNG, PDF, DOCX, MP3.

## What this Space does

Three tools in one Gradio interface:

1. **View metadata** — Upload any supported file and see every metadata field, grouped by namespace, with privacy-sensitive fields highlighted and warnings shown prominently.
2. **Scrub** — Remove metadata using one of four presets (`all`, `gps-only`, `personal-only`, `keep-technical`), then download the cleaned file. A side-by-side diff shows exactly what was removed.
3. **AI-generated check** — Heuristic scanner that inspects metadata for markers left by Midjourney, Stable Diffusion, DALL-E, Adobe Firefly, and other tools. No ML model — purely metadata-based, no model inference, no heavyweight dependencies.

## Install locally

Python:
```
pip install metascrub
```

Full documentation and web app: https://metadatafinder.com

JS/TS:
```
npm install @metascrub/core
```

## Privacy

Files are processed entirely in memory on the Space's server and discarded immediately after the response is returned. No file content is logged, stored, or transmitted to any third party. No analytics or telemetry of any kind.

## License

MIT — see [LICENSE](./LICENSE). Source code and more integrations at https://metadatafinder.com
