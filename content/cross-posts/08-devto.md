---
canonical: https://metadatafinder.com/blog/journalist-protect-sources-metadata
tags: [security, privacy, journalism, metadata]
cover_image: ''
title: 'How Journalists Protect Sources by Checking Metadata'
published: false
---

> **Canonical URL:** This post was originally published at https://metadatafinder.com/blog/journalist-protect-sources-metadata

Document metadata is a well-documented failure mode in source protection. Here are the specific ways it exposes sources — and the workflow to prevent it.

## Failure Mode 1: PDF Producer Field

When a source prints a document to PDF, the `Producer` field records which software — and sometimes which printer — created the file. Some office printers embed their model name in `Producer` (e.g., `Xerox WorkCentre 7975 PDF`). In an organization where only one team uses that printer, the field is a fingerprint.

```bash
metascrub view document.pdf
# Look for: Producer, Creator, Author, CreationDate, ModDate
```

## Failure Mode 2: DOCX `lastModifiedBy`

A DOCX file stores the name of whoever last saved it in `cp:lastModifiedBy`. If the journalist edits the document to add notes and then shares it — with a colleague, a lawyer, or over a shared drive — the journalist's own display name is now in the file.

The reverse matters too: if the source's name is in `lastModifiedBy`, publishing any version of the document that retains the metadata publishes the source's name.

## Failure Mode 3: Embedded Image EXIF

A source photographs a physical document with their phone and sends the image. The image carries GPS coordinates — the location where the source was standing when they took the photo. Embedding that image in a published story, or sharing the original file, discloses that location.

```bash
metascrub view source-photo.jpg
# If GPSLatitude and GPSLongitude appear, the image has location data

metascrub scrub --preset gps-only source-photo.jpg --out source-photo-clean.jpg
```

## Failure Mode 4: Redactions That Don't Redact

A black rectangle drawn on top of text in a PDF editor visually obscures the text but leaves it in the PDF's text layer. Anyone can select and copy the "redacted" text.

The correct redaction workflow: use a tool that genuinely removes the underlying text (Adobe Acrobat's built-in Redact tool, or Dangerzone), then verify the output with `metascrub view` to check that no unexpected text metadata remains.

## The Intake Workflow

```bash
npm install -g metascrub

# 1. Capture metadata before opening (some apps modify ModDate on open)
metascrub view --json received.pdf > metadata-$(date +%Y%m%d).json

# 2. Strip personal metadata before sharing internally
metascrub scrub --preset personal-only received.pdf --out received-clean.pdf

# 3. Verify the output
metascrub view received-clean.pdf
# Confirm: no Author, Producer with personal data, no lastModifiedBy, no GPS

# 4. For embedded images in DOCX
unzip -d contents received.docx
metascrub view contents/word/media/image1.jpeg
```

## For Newsrooms

The [MetaScrub browser extension](https://metadatafinder.com) lets any journalist drag a file and see its metadata without installing software or sending the file anywhere. This lowers friction enough that checking becomes the default.

For documents on air-gapped machines: the MetaScrub desktop app runs entirely offline.

For systematic intake: the Docker API image accepts document uploads via REST and returns metadata JSON — integrates into existing document management systems.

[metadatafinder.com](https://metadatafinder.com) — browser-based inspection, no install.
