# Awesome VS Code — MetaScrub Submission

## Target list

**Repository:** https://github.com/viatsko/awesome-vscode

**Contributing guide:** https://github.com/viatsko/awesome-vscode/blob/master/CONTRIBUTING.md

**Target section:** "Other" or "Productivity" — viatsko/awesome-vscode organizes entries primarily by language support; the closest section for a file utility is "Other Extensions" or a dedicated "Utilities" / "Productivity" section. Check current section headings before submitting.

---

## Submission line

This list uses bare links for many entries (no description), but also uses description format. Use the description format since MetaScrub is not a language extension:

```markdown
- [MetaScrub](https://marketplace.visualstudio.com/items?itemName=metascrub.metascrub)
```

With description (preferred if the section uses it):

```markdown
- [MetaScrub](https://marketplace.visualstudio.com/items?itemName=metascrub.metascrub) — View and strip file metadata (EXIF, GPS, ID3, DOCX properties) directly from the VS Code sidebar.
```

[verify: replace `metascrub.metascrub` with the actual publisher.extensionName from the VS Code Marketplace listing after submission]

---

## PR title

```
Add MetaScrub — file metadata viewer in the VS Code sidebar
```

## PR body

```markdown
Hi! Adding MetaScrub to the utilities/other section.

**What it does:** MetaScrub adds a sidebar panel in VS Code that shows metadata for any file open in the editor — EXIF tags, GPS coordinates, ID3 audio tags, DOCX author and revision history, PDF info fields, and more. You can strip metadata without leaving the editor.

**Formats:** JPEG, PNG, HEIC, WebP, AVIF, TIFF, RAW, MP3, FLAC, M4A, OGG, WAV, MP4, MOV, MKV, WebM, PDF, DOCX, XLSX, PPTX, EPUB, SVG (25 total)

**How it works:**

- Open any supported file in VS Code
- The MetaScrub sidebar panel populates automatically
- Click "Scrub" to strip metadata (creates a new file by default)
- Works with the active editor file or a file selected in the Explorer panel

**Marketplace:** https://marketplace.visualstudio.com/items?itemName=metascrub.metascrub
**License:** MIT
**Source:** https://github.com/metascrub/metascrub
**Homepage:** https://metadatafinder.com
```

---

_Note: Submit this PR only after the VS Code Marketplace listing is approved and live. The marketplace.visualstudio.com URL is needed. Update the publisher.extensionName slug once the extension is published._
