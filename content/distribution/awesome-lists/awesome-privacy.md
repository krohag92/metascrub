# Awesome Privacy — MetaScrub Submission

## Target list

**Repository:** https://github.com/pluja/awesome-privacy

**Contributing guide:** https://github.com/pluja/awesome-privacy/blob/master/CONTRIBUTING.md

**Target section:** File Privacy / Metadata Removal (look for a "Metadata Cleaner" or "File Scrubbing" section; if none exists, suggest creating one or submit under "Utilities")

---

## Submission line

```markdown
- [MetaScrub](https://metadatafinder.com) - Open-source metadata viewer and scrubber for images, audio, video, and documents. Strips EXIF, GPS, author names, and editing history from 25 formats. Web, CLI, browser extension, Python, Docker.
```

---

## PR title

```
Add MetaScrub — metadata viewer and scrubber (CLI, browser extension, web tool)
```

## PR body

```markdown
Hi! Proposing MetaScrub for the metadata/file privacy section.

**Why it fits:** MetaScrub is a privacy tool for removing identifying metadata from files before sharing. GPS coordinates in photos, author names in documents, revision histories in Word files, and software identifiers in PDFs are all common privacy leaks. MetaScrub addresses these across 25 file formats.

**Key privacy properties:**

- Local processing only — no files uploaded to any server
- No analytics, no telemetry, no phone-home in any distribution
- Zero account or login required

**Formats:** JPEG, PNG, HEIC, WebP, AVIF, TIFF, RAW (CR2, NEF, ARW, DNG), MP3, FLAC, M4A, OGG, WAV, MP4, MOV, MKV, WebM, PDF, DOCX, XLSX, PPTX, EPUB, SVG

**Available as:** Web tool (https://metadatafinder.com), CLI (`npm install -g metascrub`), Python package, Chrome/Firefox/Edge/Opera extension, VS Code extension, Docker image, Tauri desktop app, and plugins for Obsidian, Raycast, n8n, Figma, and WordPress.

**License:** MIT
**Source:** https://github.com/metascrub/metascrub
**Homepage:** https://metadatafinder.com
**Privacy policy:** https://metadatafinder.com/extension/privacy

If there is no existing "Metadata Removal" section, I am happy to propose one — there are a few tools in this space (MAT2, ExifCleaner) that would fit alongside MetaScrub.
```

---

_Note: pluja/awesome-privacy is well-maintained and privacy-focused. The local-processing angle is the strongest selling point for this list. If the maintainer asks about an existing "Metadata Cleaners" section, MAT2 (https://0xacab.org/jvoisin/mat2) is the most prominent existing entry in that space._
