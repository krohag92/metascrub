---
canonical: https://metadatafinder.com/blog/strip-pdf-metadata
tags: [privacy, pdf, security, devtools]
title: 'How to Strip Metadata from a PDF'
subtitle: 'Author names, edit history, DocumentIDs — a PDF shares more than you think.'
published: false
---

> Originally published at [metadatafinder.com/blog/strip-pdf-metadata](https://metadatafinder.com/blog/strip-pdf-metadata)

---

A PDF isn't just a document. It's a document plus a record of who created it, what software produced it, and in some cases a history of every edit ever made. That record travels with the file when you share it.

## Two Metadata Mechanisms in Every PDF

**The Info Dictionary** — a flat key-value store inside the PDF structure:

```
Author:       Jane Smith
Creator:      Microsoft Word for Microsoft 365
Producer:     Adobe PDF Library 15.0
CreationDate: 2024-11-12T09:34:17+02:00
Title:        Q3 Financial Review - DRAFT
```

**The XMP Stream** — an XML packet that may contain:

- `xmpMM:DocumentID` — a UUID that uniquely identifies the document across all versions
- `xmpMM:InstanceID` — identifies this specific version
- `xmpMM:History` — every application that touched the file, and when
- `xmpMM:OriginalDocumentID` — links back to the source document (e.g., the Word file this was printed from)

Both may be present simultaneously and may contain slightly different data.

## Who This Affects

**Lawyers:** The Author field is set from the OS user account. If you draft for a client, your name is in the file. Opposing counsel can see it.

**Compliance teams:** DocumentID can link multiple versions of a document together, even across different organizations.

**Journalists:** PDF metadata can reveal who prepared a document and with what software — useful when analyzing leaked documents, and a risk when distributing your own.

**Anyone sharing externally:** The Author and Producer fields are frequently populated and rarely checked.

## Three Removal Methods

### exiftool (Free, CLI)

```bash
brew install exiftool
exiftool -all= -o document-clean.pdf document.pdf
```

Handles both the Info dict and the XMP stream. Widely trusted, actively maintained.

### MetaScrub CLI (Free, cross-format)

```bash
npm install -g metascrub

# View what's there
metascrub view document.pdf

# Strip everything
metascrub scrub document.pdf --preset all

# Strip personal fields, keep dates
metascrub scrub document.pdf --preset personal-only

# Batch a folder
metascrub batch ./contracts --preset all --out ./clean

# Audit without modifying
metascrub batch ./contracts --preset all --dry-run
```

### metadatafinder.com (Browser, No Install)

Drop the file at [metadatafinder.com](https://metadatafinder.com). Review, scrub, download. Nothing uploaded.

## For Server-Side Pipelines

The MetaScrub Docker image provides an HTTP API:

```bash
curl -X POST http://localhost:3000/scrub \
  -F "file=@contract.pdf" \
  -F "preset=all" \
  --output contract.clean.pdf
```

Python teams: `pip install metascrub`.

Full documentation at [metadatafinder.com](https://metadatafinder.com).

---

_MIT licensed, open source. [metadatafinder.com](https://metadatafinder.com)_
