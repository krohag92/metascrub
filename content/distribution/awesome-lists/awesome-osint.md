# Awesome OSINT — MetaScrub Submission

## Target list

**Repository:** https://github.com/jivoi/awesome-osint

**Contributing guide:** https://github.com/jivoi/awesome-osint/blob/master/CONTRIBUTING.md

**Target section:** "Metadata" or "Documents and Slides" or "Images" — jivoi/awesome-osint has sections for image analysis and metadata tools; ExifTool and similar tools are already listed there.

---

## Submission line

Format used by this list is `* [Name](URL) - Description.`

```markdown
- [MetaScrub](https://metadatafinder.com) - Metadata viewer and scrubber for images, audio, video, and documents. Extracts EXIF, GPS, ID3, XMP, IPTC, DOCX properties, and PDF metadata from 25 formats. Available as CLI, web tool, and browser extension.
```

---

## PR title

```
Add MetaScrub to Metadata/Image Analysis section
```

## PR body

```markdown
Hi! Proposing MetaScrub for the Metadata / Image Analysis section.

**OSINT use cases:**

- Extract GPS coordinates, device make/model, and timestamp from images to geolocate a photo or verify its provenance
- Read DOCX/PDF author fields, revision history, and company name from leaked or shared documents
- Identify software fingerprints in PDFs (creator, producer fields) to infer which tool generated a document
- Compare metadata between two versions of a file to detect modifications
- Batch-process a folder of documents to extract all author names and creation timestamps as JSON

**Formats:** JPEG, PNG, HEIC, WebP, AVIF, TIFF, RAW (CR2, NEF, ARW, DNG), MP3, FLAC, M4A, OGG, WAV, MP4, MOV, MKV, WebM, PDF, DOCX, XLSX, PPTX, EPUB, SVG

**CLI example (relevant to OSINT workflows):**
```

metascrub view suspicious-doc.pdf --format json
metascrub compare v1.pdf v2.pdf
metascrub batch --dir ./evidence --output metadata-report.csv

```

**License:** MIT (open source)
**Homepage:** https://metadatafinder.com
**Source:** https://github.com/metascrub/metascrub

Note: ExifTool is already listed on this list and handles deeper format coverage. MetaScrub is complementary — it adds browser extension, Python library, and web tool access, and is easier to integrate into automated pipelines.
```

---

_Note: jivoi/awesome-osint uses asterisks (`*`) instead of dashes for list items — match this format exactly. The forensics/OSINT framing (document provenance, GPS verification, author extraction) is the strongest angle for this list._
