# Awesome Raycast — MetaScrub Submission

## Target list

**Repository:** https://github.com/raycast/awesome-raycast

**Contributing guide:** https://github.com/raycast/awesome-raycast/blob/main/CONTRIBUTING.md

**Note:** raycast/awesome-raycast is the official Raycast-maintained list. It is distinct from the Raycast Extension Store (which is a separate submission process via the raycast/extensions monorepo PR). This file covers the awesome-list PR; the Store submission is a separate workflow.

**Target section:** "Extensions" — specifically a "Files" or "Utilities" subsection.

---

## Submission line

The Raycast awesome-list typically uses: `- [Extension Name](store-url) - Description.`

```markdown
- [MetaScrub](https://www.raycast.com/metascrub/metascrub) - View and strip file metadata from the Raycast command bar. Supports EXIF, GPS, ID3, DOCX properties, and more across 25 formats.
```

[verify: replace the store URL with the actual Raycast Store URL after the extension is approved at raycast.com/store]

If the list is indexed by the raycast/extensions repo (some lists link to the GitHub source instead):

```markdown
- [MetaScrub](https://github.com/metascrub/metascrub/tree/main/packages/raycast) - View and strip file metadata from the Raycast command bar. Supports EXIF, GPS, ID3, DOCX properties, and more across 25 formats.
```

---

## PR title

```
Add MetaScrub — file metadata viewer and scrubber
```

## PR body

```markdown
Hi! Adding MetaScrub to the Files / Utilities section.

**What it does:** MetaScrub adds two Raycast commands:

- **View File Metadata** — select a file in Finder, run the command, see all metadata fields in a Raycast detail view
- **Scrub File Metadata** — strip metadata from a selected file with a preset picker (All / GPS only / Personal only / Keep technical)

**Formats:** JPEG, PNG, HEIC, WebP, AVIF, TIFF, RAW, MP3, FLAC, M4A, OGG, WAV, MP4, MOV, MKV, WebM, PDF, DOCX, XLSX, PPTX, EPUB, SVG (25 total)

**Raycast Store:** https://www.raycast.com/metascrub/metascrub [verify: update after approval]
**License:** MIT
**Source:** https://github.com/metascrub/metascrub
**Homepage:** https://metadatafinder.com
```

---

_Note: The Raycast awesome-list is official and curated. The extension must be approved in the Raycast Store first (via PR to raycast/extensions). Submit this awesome-list PR only after the Store extension is live._
