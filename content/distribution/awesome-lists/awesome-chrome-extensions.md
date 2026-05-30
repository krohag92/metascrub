# Awesome Chrome Extensions — MetaScrub Submission

## Target list

**Repository:** https://github.com/whatwewant/awesome-chrome-extensions

**Note:** Multiple "awesome chrome extensions" repos exist on GitHub with varying activity levels. The most active community-maintained one at time of writing is whatwewant/awesome-chrome-extensions. [verify: confirm which repo is most active / has recent PRs merged before submitting — search GitHub for "awesome chrome extensions" sorted by recently updated]

**Contributing guide:** Check the repo's CONTRIBUTING.md or README for PR requirements.

**Target section:** Developer Tools or Privacy / Security

---

## Submission line

Standard format for most chrome extension lists: `- [Name](chrome-store-url) - Description.`

```markdown
- [MetaScrub](https://metadatafinder.com) - View and strip EXIF, GPS, ID3, and document metadata from any file directly in the browser. 25 formats. No upload required.
```

When the Chrome Web Store listing is live, update the URL to the Chrome Web Store link:

```markdown
- [MetaScrub](https://chrome.google.com/webstore/detail/metascrub/[EXTENSION-ID]) - View and strip EXIF, GPS, ID3, and document metadata from any file directly in the browser. 25 formats. No upload required.
```

[verify: replace `[EXTENSION-ID]` with the actual extension ID after Chrome Web Store approval]

---

## PR title

```
Add MetaScrub — file metadata viewer and scrubber extension
```

## PR body

```markdown
Hi! Adding MetaScrub to the Privacy / Developer Tools section.

**What it does:** MetaScrub is a browser extension for viewing and stripping file metadata. Drop any file onto the extension popup to see EXIF, GPS coordinates, ID3 tags, document author fields, and more. Strip everything with one click, or use a preset (GPS only, personal only, keep technical).

**Key details:**

- Processes files locally — no upload to any server
- Supports 25 formats: JPEG, PNG, HEIC, WebP, AVIF, TIFF, RAW, MP3, FLAC, M4A, OGG, WAV, MP4, MOV, MKV, WebM, PDF, DOCX, XLSX, PPTX, EPUB, SVG
- Available on Chrome, Firefox, Edge, and Opera from the same codebase
- Zero permissions beyond reading files you actively open in the popup
- No analytics, no telemetry

**License:** MIT
**Source:** https://github.com/metascrub/metascrub
**Homepage:** https://metadatafinder.com
**Privacy policy:** https://metadatafinder.com/extension/privacy
```

---

_Note: Submit this PR only after the Chrome Web Store listing is approved and live. The store URL is required by most chrome extension lists. If the list accepts GitHub source links before store approval, use the GitHub URL as a placeholder._
