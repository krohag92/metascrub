# MetaScrub — VS Code Extension

**See and strip metadata from any file** — without leaving VS Code.

Web version and docs: **https://metadatafinder.com**

---

## Features

- Right-click any supported file in the Explorer and choose **MetaScrub: View metadata** to open an interactive metadata panel.
- Right-click and choose **MetaScrub: Scrub metadata** to write a clean copy (`photo.clean.jpg`) with all metadata removed.
- Warnings for sensitive data — GPS coordinates, author names, serial numbers — are highlighted in red at the top of the panel.
- Collapsible metadata groups (EXIF, IPTC, XMP, PDF Info, DOCX Core, etc.) with field-level detail.
- Highlight badges for GPS location, device, author, and software.
- All processing is local — no file data ever leaves your machine.

## Supported formats

JPG / JPEG, PNG, HEIC, WebP, TIFF, AVIF, PDF, DOCX, XLSX, PPTX, EPUB, SVG, MP3, MP4, MOV

## Installation

### From VS Code Marketplace (recommended)

1. Open VS Code.
2. Press `Ctrl+P` (macOS: `Cmd+P`) and type `ext install metadatafinder.metascrub-vscode`.
3. Click Install.

### From VSIX (manual)

```bash
# Install vsce if you don't have it
npm install -g @vscode/vsce

# Package and install
vsce package
code --install-extension metascrub-0.2.0.vsix
```

## Usage

### View metadata

1. In the Explorer panel, right-click any supported file.
2. Choose **MetaScrub: View metadata**.
3. A WebView panel opens showing all metadata grouped by type.

### Scrub metadata

1. In the Explorer panel, right-click any supported file.
2. Choose **MetaScrub: Scrub metadata**.
3. A cleaned copy is written to `<original>.clean.<ext>` in the same directory.
4. A notification confirms the number of fields removed.

## Screenshot

![MetaScrub metadata panel showing EXIF data with GPS warning highlighted in red](https://metadatafinder.com/assets/vscode-screenshot.png)

_Screenshot placeholder — see live extension for current UI._

## Related

- **Web version**: https://metadatafinder.com
- **CLI**: `npm install -g metascrub`
- **npm package**: `npm install @metascrub/core`
- **GitHub**: https://github.com/metascrub/metascrub

## Privacy

MetaScrub processes all files locally on your machine. No file content, metadata, or usage data is ever transmitted anywhere. See the [privacy policy](https://metadatafinder.com/extension/privacy).

## License

MIT — see [LICENSE](LICENSE).
