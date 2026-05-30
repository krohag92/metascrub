---
canonical: https://metadatafinder.com/blog/strip-pdf-metadata
tags: [privacy, security, pdf, tutorial]
title: 'How to Strip Metadata from a PDF'
published: false
---

> **Canonical URL:** This post was originally published at https://metadatafinder.com/blog/strip-pdf-metadata

PDFs carry hidden metadata: the author's name, the creating software, a unique document ID, and sometimes a full edit history. This matters for lawyers, journalists, compliance teams, and anyone who shares PDFs externally.

## What's Inside a PDF

A PDF has two metadata mechanisms that may coexist:

**Info Dictionary (older mechanism):**

- `Author` — usually the OS user's display name
- `Creator` — the application that created the document (e.g., "Microsoft Word for Microsoft 365")
- `Producer` — the PDF conversion engine (e.g., "Adobe PDF Library 15.0")
- `Title`, `Subject`, `Keywords`
- `CreationDate`, `ModDate`

**XMP Stream (XML packet embedded in the file):**

- `dc:creator`, `pdf:Producer`
- `xmpMM:DocumentID` — a UUID that uniquely identifies this document
- `xmpMM:InstanceID` — identifies this specific version
- `xmpMM:History` — full history of which software touched the file and when
- `xmpMM:OriginalDocumentID` — links this PDF to its origin document

DocumentID and OriginalDocumentID can link two PDFs together even if their content is completely different.

## The Risks

- **Author field** reveals the name of whoever created the document — often automatically populated from the OS account
- **Creator field** tells you which software, down to version number — useful for forensic dating or workflow inference
- **DocumentID** can link multiple versions of a document across an organization
- **History** reveals the full editing chain

## Method 1: Adobe Acrobat Sanitize

Tools → Redact → Sanitize Document. Strips metadata, embedded content, and hidden layers. Requires paid Acrobat (not free Reader).

## Method 2: exiftool (Free, CLI)

```bash
brew install exiftool   # macOS
# or: sudo apt-get install libimage-exiftool-perl

# Strip all metadata
exiftool -all= document.pdf

# Or write to a new file
exiftool -all= -o document-clean.pdf document.pdf

# Verify
exiftool document-clean.pdf
```

## Method 3: MetaScrub CLI

```bash
npm install -g metascrub

# Inspect
metascrub view document.pdf
```

```
PDF Info
  Author        Jane Smith
  Creator       Microsoft Word for Microsoft 365
  Producer      Adobe PDF Library 15.0
  Title         Q3 Financial Review - DRAFT

XMP
  xmpMM:DocumentID   uuid:4a2b1c3d-...
  xmpMM:History      [3 edit events]

Warnings
  Personal info found: Author = "Jane Smith"
  Document linked via DocumentID (potential tracking)
```

```bash
# Strip all metadata
metascrub scrub document.pdf --preset all

# Strip personal fields only (keep dates)
metascrub scrub document.pdf --preset personal-only

# Batch a folder
metascrub batch ./contracts --preset all --out ./contracts-clean

# Compare before and after
metascrub compare document.pdf document.cleaned.pdf
```

## Method 4: metadatafinder.com (No Install)

Drop the PDF at [metadatafinder.com](https://metadatafinder.com), review, scrub, download. In-browser.

## Comparison Table

| Method             | Cost | Batch? | XMP? | Lossless? |
| ------------------ | ---- | ------ | ---- | --------- |
| Adobe Acrobat      | Paid | No     | Yes  | Yes       |
| exiftool           | Free | Yes    | Yes  | Yes       |
| MetaScrub CLI      | Free | Yes    | Yes  | Yes       |
| metadatafinder.com | Free | No     | Yes  | Yes       |

## For Compliance: Batch Audit Before Sending

```bash
# Audit without modifying files
metascrub batch ./outbound --preset all --dry-run

# Then strip
metascrub batch ./outbound --preset all --out ./outbound-clean
```

Python teams: `pip install metascrub`

Docker API for server-side pipelines: see [metadatafinder.com](https://metadatafinder.com).

---

_MetaScrub — open source, MIT. https://metadatafinder.com_
