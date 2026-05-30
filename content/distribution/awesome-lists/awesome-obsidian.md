# Awesome Obsidian — MetaScrub Submission

## Target list

**Repository:** https://github.com/kmaasrud/awesome-obsidian

**Contributing guide:** https://github.com/kmaasrud/awesome-obsidian/blob/master/CONTRIBUTING.md

**Target section:** Plugins — specifically "File Management" or "Utilities"; kmaasrud/awesome-obsidian organizes community plugins by category in a table format.

---

## Submission line

This list uses a table format: `| [Name](url) | Description | [Author](author-url) |`

```markdown
| [MetaScrub](https://github.com/metascrub/metascrub) | View and strip metadata from attachments in your vault — EXIF, GPS, ID3, DOCX properties, PDF info. | [Anton Krokhmal](https://github.com/antokr) |
```

[verify: confirm the correct GitHub username for Anton — the above uses `antokr` as a placeholder]

If the list prefers a simple bullet format:

```markdown
- [MetaScrub](https://github.com/metascrub/metascrub): View and strip metadata (EXIF, GPS, ID3, DOCX properties) from attachments in your Obsidian vault.
```

---

## PR title

```
Add MetaScrub plugin — file metadata viewer for vault attachments
```

## PR body

```markdown
Hi! Adding MetaScrub to the file management / utilities section.

**What it does:** MetaScrub is an Obsidian community plugin that shows metadata for files attached to your vault. Right-click any attachment (JPEG, PNG, PDF, DOCX, MP3, etc.) and choose "View Metadata" or "Scrub Metadata" to see or remove EXIF tags, GPS coordinates, author names, revision histories, and more.

**Use cases for Obsidian users:**

- Check GPS metadata before publishing a note that embeds a photo
- View DOCX properties of imported documents (author name, company, revision history)
- Strip personal metadata from files before sharing a vault export
- Understand what PDF metadata accompanies research papers you import

**Formats:** JPEG, PNG, HEIC, WebP, AVIF, TIFF, RAW, MP3, FLAC, M4A, OGG, WAV, MP4, MOV, MKV, WebM, PDF, DOCX, XLSX, PPTX, EPUB, SVG

**Plugin is listed in Obsidian Community Plugins:** [verify: add the community plugin registry URL once approved]

**License:** MIT
**Source:** https://github.com/metascrub/metascrub
**Homepage:** https://metadatafinder.com
```

---

_Note: Submit this PR only after the Obsidian Community Plugins submission is approved and the plugin appears in the in-app plugin browser. The community plugins JSON entry (in obsidianmd/obsidian-releases) is a prerequisite. Confirm Anton's GitHub username before submitting the table row._
