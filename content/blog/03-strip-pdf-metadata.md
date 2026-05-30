---
title: 'How to Strip Metadata from a PDF'
slug: strip-pdf-metadata
target_keyword: 'how to strip metadata from a PDF'
description: "PDFs carry hidden metadata: author, software, creation date, XMP history. This guide explains what's inside and three ways to strip it — for lawyers, journalists, and IT teams."
published: false
canonical: https://metadatafinder.com/blog/strip-pdf-metadata
---

# How to Strip Metadata from a PDF

A PDF you send to a client, opposing counsel, or a journalist is rarely just a document. Inside its binary structure, a PDF typically carries the name of the person who created it, the software that produced it, a creation timestamp, and an XMP metadata stream that may contain editing history, embedded identifiers, and more.

For lawyers, compliance officers, journalists, and anyone sharing documents with counterparties who should not have that information, the PDF's hidden metadata is a real problem. This guide covers what is inside a PDF's metadata, what the risks are, and three methods to strip it cleanly.

---

## What Is Inside a PDF's Metadata?

The PDF specification defines two separate mechanisms for storing metadata. Both may be present simultaneously.

### The Info Dictionary

The **Document Information Dictionary** (commonly called the "Info dict") is the older of the two mechanisms. It lives inside the PDF's cross-reference structure and stores a flat set of key-value pairs:

- `Author` — the person who created the document. Often populated from the OS user account name or the name registered in Microsoft Word or Adobe Acrobat.
- `Creator` — the application that originally created the document (e.g., "Microsoft Word for Microsoft 365").
- `Producer` — the application that converted the document to PDF (e.g., "Adobe PDF Library 15.0", "macOS Quartz PDFContext", "Skia/PDF m116").
- `Title` — the document title (may differ from the filename).
- `Subject`
- `Keywords`
- `CreationDate` — when the document was created, often with timezone.
- `ModDate` — when it was last modified.
- `Trapped` — a print production flag, rarely interesting.

### The XMP Stream

XMP (Extensible Metadata Platform, developed by Adobe) is embedded as an XML packet inside the PDF. It is supposed to mirror the Info dict but frequently contains more. In practice, the XMP stream may include:

- `dc:creator` (Dublin Core creator) — author name
- `dc:title`, `dc:description`
- `pdf:Producer`
- `xmp:CreateDate`, `xmp:ModifyDate`, `xmp:MetadataDate`
- `xmpMM:DocumentID` — a unique identifier for this document, often a UUID
- `xmpMM:InstanceID` — a unique identifier for this version of the document
- `xmpMM:History` — a full history of edits, including which software touched the document and when
- `xmpMM:OriginalDocumentID` — if this PDF was derived from another document

The DocumentID and OriginalDocumentID fields deserve particular attention. They are globally unique identifiers that can link multiple versions of a document together, or link a PDF to the original Word file it was printed from.

### Embedded Fonts and File Attachments

Strictly speaking, embedded fonts and file attachments are not "metadata" — they are part of the document's content structure. However, they can carry identifying information:

- Font names may reveal internal naming conventions or software origins.
- File attachments (PDFs can embed other files) obviously carry their own metadata.
- Named destinations and form fields may contain internal system paths or usernames.

MetaScrub's PDF scrubber handles the Info dict and XMP stream. Embedded attachments and font names are left intact — stripping those changes the document's rendering.

---

## Real-World Risks of PDF Metadata

### Author and Creator fields

A PDF's `Author` field is often set from the OS user account name. On a company machine, this is typically the employee's full name. On a personal machine, it might be a personal name or even a username created years ago.

If you are a lawyer filing a document on behalf of a client and the `Author` field reads your name, your client's opposing counsel now knows who drafted it — before you have said so. If you are a whistleblower leaking a document and the `Author` field has your name, you are no longer anonymous.

### Production software

The `Producer` field tells a reader exactly which software converted the document to PDF, down to the version number. This information is sometimes used in forensic analysis to validate or challenge a document's provenance. In adversarial contexts, knowing the production software can also reveal patching levels or workflow details you may prefer to keep private.

### DocumentID linking

If an investigator has two PDFs with the same `xmpMM:OriginalDocumentID`, they know those PDFs share a common origin — even if the content is completely different. This can be used to link documents that are supposed to be unrelated.

### Redaction failures

PDF redaction failures — where text or images are visually covered but not actually removed from the file — are a separate (and much larger) problem from metadata. MetaScrub does not handle redaction of visual content; it handles metadata only. Do not confuse the two. For proper redaction, use Adobe Acrobat's built-in Redact tool, which burns the redaction into the content layer.

---

## Method 1: Adobe Acrobat — Document Properties and Sanitize

If you have access to Adobe Acrobat (not just Reader — the full Acrobat), the quickest route is:

**Remove metadata manually:**

1. Open the PDF in Acrobat.
2. Go to **File → Properties** (or **Cmd/Ctrl + D**).
3. Under the **Description** tab, clear Author, Title, Subject, Keywords.
4. Click OK and save.

This removes the Info dict fields but may not touch the XMP stream. Acrobat may re-write the XMP on save.

**Sanitize Document (more thorough):**

1. Go to **Tools → Redact → Sanitize Document**.
2. Acrobat strips metadata, embedded content, scripts, hidden layers, and overlapping content in one operation.
3. This creates a new sanitized copy.

Sanitize Document is more thorough than manually editing properties. It targets the XMP stream and the Info dict together.

**Limitation:** Requires a paid Acrobat license. The free Adobe Acrobat Reader does not expose metadata editing.

---

## Method 2: pdftk or exiftool on the Command Line

For Linux/macOS users or anyone who wants a scriptable solution:

### Using exiftool (open source, written in Perl)

```bash
# Install on macOS
brew install exiftool

# Install on Ubuntu/Debian
sudo apt-get install libimage-exiftool-perl

# Strip all metadata from a PDF
exiftool -all= document.pdf

# This modifies in place (creates document.pdf_original as backup)
# To write to a new file:
exiftool -all= -o document-clean.pdf document.pdf

# Verify the result
exiftool document-clean.pdf
```

ExifTool is comprehensive and widely trusted. It targets both the Info dict and the XMP stream.

### Using pdftk (open source)

pdftk (PDF Toolkit) can be used to rebuild a PDF without the Info dict:

```bash
# Install on macOS
brew install pdftk-java

# Dump metadata to see what's there
pdftk document.pdf dump_data > metadata.txt

# Strip metadata by updating with an empty info block
pdftk document.pdf update_info_utf8 /dev/null output document-clean.pdf
```

Note: `pdftk` handles the Info dict but may not remove the embedded XMP stream. Combining `pdftk` for structure and `exiftool` for the XMP block gives complete coverage.

---

## Method 3: MetaScrub CLI and Web Tool

MetaScrub provides a straightforward interface for PDF metadata stripping, useful when you want a consistent tool across PDF, DOCX, JPEG, and other formats in the same workflow.

### Install

```bash
npm install -g metascrub
```

### Inspect a PDF's metadata

```bash
metascrub view document.pdf
```

Output:

```
PDF Info
  Author        Jane Smith
  Creator       Microsoft Word for Microsoft 365
  Producer      Adobe PDF Library 15.0
  CreationDate  2024-11-12T09:34:17+02:00
  ModDate       2024-11-14T16:02:44+02:00
  Title         Q3 Financial Review - DRAFT

XMP
  dc:creator         Jane Smith
  xmpMM:DocumentID   uuid:4a2b1c3d-...
  xmpMM:InstanceID   uuid:9f8e7d6c-...
  xmpMM:History      [3 edit events]

Warnings
  Personal info found: Author = "Jane Smith"
  Document linked via DocumentID (potential tracking)
```

### Strip all metadata

```bash
metascrub scrub document.pdf --preset all
```

This clears the Info dict and rewrites the XMP stream with only the structurally required fields. It does not re-encode the PDF content — the text, fonts, images, and page structure are untouched. Output: `document.cleaned.pdf`.

### Strip personal fields only

```bash
metascrub scrub document.pdf --preset personal-only
```

This removes Author, Creator, Producer, DocumentID, and InstanceID but leaves CreationDate and ModDate intact. Useful when you want to preserve the timestamp but not the author identity.

### Batch process a folder

```bash
metascrub batch ./contracts --preset all --out ./contracts-clean
```

Every PDF in `./contracts` gets a cleaned copy in `./contracts-clean`. MetaScrub prints a per-file summary including which fields were removed.

### Verify the result

```bash
metascrub compare document.pdf document.cleaned.pdf
```

```
Removed:
  PDF.Info.Author        "Jane Smith"
  PDF.Info.Creator       "Microsoft Word for Microsoft 365"
  PDF.Info.Producer      "Adobe PDF Library 15.0"
  XMP.dc:creator         "Jane Smith"
  XMP.xmpMM.DocumentID   "uuid:4a2b1c3d-..."
  XMP.xmpMM.InstanceID   "uuid:9f8e7d6c-..."
  XMP.xmpMM.History      [removed]

Preserved:
  PDF.Info.CreationDate  "2024-11-12T09:34:17+02:00"
  PDF.Info.ModDate       "2024-11-14T16:02:44+02:00"
```

### Web tool (no install)

For single files without a terminal, use **https://metadatafinder.com** — drop the PDF, review the metadata, scrub, and download. All processing happens in your browser.

---

## Method Comparison

| Method                 | Cost | Batch? | XMP?    | Lossless? | Cross-platform? |
| ---------------------- | ---- | ------ | ------- | --------- | --------------- |
| Adobe Acrobat Sanitize | Paid | No     | Yes     | Yes       | macOS/Windows   |
| exiftool CLI           | Free | Yes    | Yes     | Yes       | All             |
| pdftk                  | Free | Yes    | Partial | Yes       | All             |
| MetaScrub CLI          | Free | Yes    | Yes     | Yes       | All (Node)      |
| metadatafinder.com     | Free | No     | Yes     | Yes       | Browser         |

---

## For Legal and Compliance Teams: Auditing PDF Outflow

If you manage document workflows at a law firm, an investment bank, or any organization that regularly shares PDFs with external parties, consider building a pre-send check into your process.

MetaScrub supports batch processing via the CLI, which can be integrated into a CI/CD pipeline, a pre-upload script, or a scheduled job:

```bash
# Check all PDFs in an outbound folder for personal metadata
metascrub batch ./outbound --preset all --dry-run
```

The `--dry-run` flag reports what would be stripped without modifying any files. Use it to audit first, then strip with the same command without `--dry-run`.

For Python environments, the MetaScrub Python package (`pip install metascrub`) provides the same batch capability with pandas integration for reporting.

For enterprise environments running self-hosted infrastructure, the MetaScrub Docker image exposes an HTTP API for metadata stripping — useful when you need to process documents through a server-side pipeline. See the Docker Hub page for details, or visit **https://metadatafinder.com** for full documentation.

---

## Next Steps

- **Check any PDF right now:** https://metadatafinder.com
- **Install MetaScrub CLI for batch use:** `npm install -g metascrub`
- **Python teams:** `pip install metascrub`
- **Learn what's in Word document metadata:** [Word Document Metadata Leaks](https://metadatafinder.com/blog/word-document-metadata-leaks)
- **Remove GPS from photo files:** [How to Remove GPS from Photos Before Posting](https://metadatafinder.com/blog/remove-gps-from-photos)

---

_MetaScrub — See and strip metadata from any file. Open source, MIT license. https://metadatafinder.com_
