---
canonical: https://metadatafinder.com/blog/word-document-metadata-leaks
tags: [privacy, security, microsoft, compliance]
title: "Word Document Metadata Leaks: What's Stored and How to Clean It"
published: false
---

> **Canonical URL:** This post was originally published at https://metadatafinder.com/blog/word-document-metadata-leaks

Every DOCX file is a ZIP archive containing several XML files. Three of them carry metadata that most people never check before sharing.

## The Three Leak Vectors

### `docProps/core.xml`

```xml
<dc:creator>Jane Smith</dc:creator>
<cp:lastModifiedBy>Thomas Nguyen</cp:lastModifiedBy>
<cp:revision>14</cp:revision>
<dcterms:created>2024-09-03T10:12:00Z</dcterms:created>
```

- `dc:creator` — the person who created the document
- `cp:lastModifiedBy` — the last person to edit it
- `cp:revision` — revision counter (14 revisions means this document went through 14 cycles)

### `docProps/app.xml`

```xml
<Company>Acme Corporation</Company>
<Manager>Regional VP Operations</Manager>
<Application>Microsoft Office Word</Application>
<AppVersion>16.0000</AppVersion>
<Template>Normal.dotm</Template>
```

`Company` is populated from the organization name in the Microsoft 365 tenant — most employees don't know it's there.

### Tracked Changes and Comments

Tracked changes (`<w:ins>`, `<w:del>`) and comments (`<w:comment>`) in `word/document.xml` are the most dangerous leak vector. They are invisible in normal view but present in the file. They can include:

- All deleted text (still in the file, just marked deleted)
- Internal reviewer comments ("legal hasn't approved this number")
- Editor names attached to every change

Anyone who enables "Show All Markup" in Word can see everything.

## A Classic Example

In 2003, analysis of the British government's Iraq dossier — a Word document — revealed through its revision history and metadata that the document had been compiled partly from a published academic paper by Ibrahim al-Marashi, without attribution. [verify: widely reported; confirm the specific metadata/revision history analysis findings and confirm al-Marashi detail is correct] The metadata told a story the authors did not intend to share.

## Method 1: Word's Document Inspector

File → Info → Check for Issues → Inspect Document

Check: Comments/Revisions, Document Properties, Hidden Text. Click Remove All per category. Save.

Works. Requires Word. Not scalable.

## Method 2: MetaScrub CLI

```bash
npm install -g metascrub

# Inspect
metascrub view contract.docx
```

```
DOCX Core Properties
  creator         Jane Smith
  lastModifiedBy  Thomas Nguyen
  revision        14
  Company         Acme Corporation

Warnings
  File was edited by another user
  Tracked changes present (revision: 14)
  Personal info found: creator = "Jane Smith"
  Personal info found: Company = "Acme Corporation"
```

```bash
# Strip personal fields only
metascrub scrub contract.docx --preset personal-only

# Strip everything including tracked changes
metascrub scrub contract.docx --preset all

# Batch a folder
metascrub batch ./outgoing-docs --preset all --out ./outgoing-clean

# Audit without modifying
metascrub batch ./outgoing-docs --preset all --dry-run
```

## Method 3: metadatafinder.com (Browser)

Drop the DOCX at [metadatafinder.com](https://metadatafinder.com). Review, scrub, download. Nothing uploaded.

## XLSX and PPTX Too

Same OOXML structure, same metadata files, same commands:

```bash
metascrub scrub spreadsheet.xlsx --preset all
metascrub scrub presentation.pptx --preset personal-only
```

## For CI/CD Integration

```bash
# Pre-send audit
metascrub batch ./outbound --preset all --dry-run --report json > audit.json

# Python
pip install metascrub

# Docker API
curl -X POST http://localhost:3000/scrub \
  -F "file=@contract.docx" \
  -F "preset=all" \
  --output contract.clean.docx
```

---

_MetaScrub — open source, MIT. Docs and web tool at https://metadatafinder.com_
