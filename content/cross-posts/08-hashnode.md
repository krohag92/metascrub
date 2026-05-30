---
canonical: https://metadatafinder.com/blog/journalist-protect-sources-metadata
tags: [security, privacy, journalism, osint]
cover_image: ''
title: 'How Journalists Protect Sources by Checking Metadata'
published: false
---

> **Canonical URL:** This post was originally published at https://metadatafinder.com/blog/journalist-protect-sources-metadata

Source protection failure via document metadata is not a theoretical risk. It is a documented pattern with specific, preventable failure modes.

## The Four Failure Modes

### 1. PDF Producer / Creator Fields

The `Producer` field in a PDF records which software — and sometimes which specific printer — generated the file. Some office printers stamp their model name in `Producer`. In an organization where a specific printer is used by one team, this is a fingerprint that narrows the field of possible sources.

The `Creator` field records the original application: `Microsoft Word 2019`, `LibreOffice Writer 7.3`. Combined with `ModDate`, this constrains which users had access to the document in which application at the relevant time.

### 2. DOCX `lastModifiedBy` Field

Every DOCX stores `cp:lastModifiedBy` — the display name from the Microsoft account or Active Directory profile of whoever most recently saved the file. If a journalist edits the document and then shares it with a colleague, the journalist's name is now in the file. If a source sends a DOCX with their own name in `lastModifiedBy` and the journalist publishes any version that retains the metadata, the source's name is public.

### 3. GPS in Source-Provided Photos

A source photographs a document with their phone and sends the image. The image carries GPS coordinates — accurate to within a few meters — of where the photo was taken. If that image is published or the original shared, the source's location at the moment of photographing is disclosed.

### 4. Visible-But-Not-Actual Redaction

A black box drawn over text in a PDF editor does not remove the text — it only hides it visually. The text remains in the PDF's text layer and can be selected and copied. This is a widely documented failure mode.

## The Inspection and Scrub Workflow

```bash
npm install -g metascrub

# Before opening the document in any application:
metascrub view --json received-document.pdf > forensic-log-$(date +%Y%m%d).json

# Review: Author, Producer, Creator, lastModifiedBy, CreationDate, ModDate

# Before sharing internally:
metascrub scrub --preset personal-only received-document.pdf --out shared-version.pdf

# Verify:
metascrub view shared-version.pdf
# Confirm all personal fields are absent

# For embedded images:
unzip -d contents received-document.docx
metascrub view contents/word/media/image1.jpeg
metascrub scrub --preset gps-only contents/word/media/image1.jpeg --out image-clean.jpeg
```

## Redaction Checklist

Before publishing a document with redacted sections:

1. Use a tool that genuinely removes text (Acrobat's Redact tool, not the drawing tools; or Dangerzone for document conversion to image-only PDF)
2. If using a print-to-PDF approach, print the document to paper first and then scan — this creates a pure image PDF with no text layer to leak
3. Run `metascrub view` on the output to confirm no unexpected metadata remains
4. Check that the resulting file shows no `Author`, `Creator`, or personal fields

## Implementation Options for Newsrooms

| Use case                            | Tool                                                                  |
| ----------------------------------- | --------------------------------------------------------------------- |
| Individual journalists, quick check | Browser extension or [metadatafinder.com](https://metadatafinder.com) |
| CLI workflow, technical staff       | `npm install -g metascrub`                                            |
| Air-gapped machines                 | MetaScrub desktop app (fully offline)                                 |
| Systematic document intake          | MetaScrub Docker API image                                            |

The Freedom of the Press Foundation's SecureDrop documentation includes guidance on metadata removal as part of newsroom security practices.

[verify: confirm current FPF/SecureDrop URL for newsroom metadata guidance]
