---
canonical: https://metadatafinder.com/blog/forensics-leaked-documents
tags: [security, privacy, forensics, metadata]
cover_image: ''
title: 'Forensics Use Cases: Catching Metadata in Leaked Documents'
published: false
---

> **Canonical URL:** This post was originally published at https://metadatafinder.com/blog/forensics-leaked-documents

Journalists, fact-checkers, and legal teams have been using document metadata for forensic investigation for over two decades. This post covers the specific fields worth examining and how to set up a basic workflow.

## The Metadata Audit Trail in a DOCX

A DOCX file is a ZIP archive of XML files. The most forensically useful fields:

| Field               | Location            | What it reveals                             |
| ------------------- | ------------------- | ------------------------------------------- |
| `dc:creator`        | `docProps/core.xml` | Name of the person who created the document |
| `cp:lastModifiedBy` | `docProps/core.xml` | Name of the most recent editor              |
| `cp:revision`       | `docProps/core.xml` | Number of times the document has been saved |
| `Application`       | `docProps/app.xml`  | Word processor used                         |
| `Company`           | `docProps/app.xml`  | Organization registered in Office install   |
| Tracked changes     | `word/document.xml` | Author name + timestamp per edit            |
| Embedded image EXIF | `word/media/*.jpg`  | GPS coordinates, device info                |

## The Metadata Audit Trail in a PDF

| Field                       | Location        | What it reveals                                |
| --------------------------- | --------------- | ---------------------------------------------- |
| `Producer`                  | Info dictionary | Software that created the PDF                  |
| `Creator`                   | Info dictionary | Application that generated the source document |
| `Author`                    | Info dictionary | Named author                                   |
| `CreationDate` / `ModDate`  | Info dictionary | Timestamps                                     |
| `DocumentID` / `InstanceID` | XMP packet      | GUIDs linking document versions                |

The `Producer` field is frequently the most diagnostic. A document claiming to originate from one organization but whose `Producer` field names a different application is worth investigating.

## Practical Forensic Workflow

```bash
npm install -g metascrub

# 1. Capture metadata before opening (applications can alter ModDate on open)
metascrub view --json document.pdf > forensic-$(date +%Y%m%d).json

# 2. Compare versions
metascrub compare version-a.docx version-b.docx

# 3. Check embedded images
unzip -d contents document.docx
metascrub view contents/word/media/image1.jpeg

# 4. Batch process a document set
metascrub batch ./leak-folder/ --format json | jq '[.[] | select(.fields.lastModifiedBy != null)]'
```

## What to Look For

When reviewing the compare output, pay attention to:

- Author fields that differ between versions (suggests cleanup of a draft)
- `ModDate` changing when `CreationDate` doesn't (file was re-exported)
- Revision counter resetting to 1 (text was pasted into a new document to discard history)
- Fields present in one version but absent in the other

## Limits

Metadata can be forged. Timestamps can reflect incorrect device clocks. Different tools parse different fields — use more than one for important documents. Stripped metadata is itself a signal worth noting.

For browser-based inspection with no install: [metadatafinder.com](https://metadatafinder.com).
