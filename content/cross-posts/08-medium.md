---
canonical: https://metadatafinder.com/blog/journalist-protect-sources-metadata
title: 'How Journalists Protect Sources by Checking Metadata'
subtitle: 'The specific ways file metadata exposes sources — and how to prevent it'
published: false
---

> **Originally published at** https://metadatafinder.com/blog/journalist-protect-sources-metadata

Source protection in journalism involves a long list of precautions. Near the top of that list, for anyone who handles digital documents, should be metadata inspection.

This is not abstract. There are specific, documented ways that metadata in PDF and Word files has contributed to the identification of sources. They are not hard to prevent once you know what to look for.

### The Problem with PDFs

When someone prints a document to PDF to share with a journalist, the resulting file contains a `Producer` field recording which software created it. In many cases, this means an operating system version, a printer model, or an application name. Some office printers write their own model name into the `Producer` field of every PDF they generate.

In an organization with dozens of printers, this narrows the field. In an organization where a specific printer is used by a specific team, it can narrow it to a very small group.

The `Creator` field records the original application — `Microsoft Word 2019`, `LibreOffice Writer 7.3`. Combined with the `ModDate` timestamp, this constrains which users had access to the document in which software at the relevant time.

### The Problem with Word Files

Every DOCX file stores the display name of whoever last saved it in a field called `lastModifiedBy`. This name comes from the Microsoft account or Active Directory profile registered on the machine.

There are two source-protection failures here. The first: if a source sends a DOCX and their name is in `lastModifiedBy`, any version of the document the journalist publishes that retains the metadata also publishes the source's name. The second: if the journalist edits the document to add notes, the journalist's own name is now `lastModifiedBy`. Share that version with a colleague and the colleague now knows the journalist was working on this document at that time.

### The Problem with Source-Provided Photos

A source photographs a physical document with their phone and sends the image. The image carries GPS coordinates accurate to a few meters. Publishing that image, or sharing the original file, discloses where the source was at the moment they took the photo.

This applies to images embedded in documents too. A DOCX or PDF with embedded photos carries EXIF data for each embedded image.

### Checking and Cleaning

The workflow is straightforward. Before reading a document received from a source, run:

```bash
npm install -g metascrub
metascrub view --json received-document.pdf
```

Look at the output for `Producer`, `Creator`, `Author`, `lastModifiedBy`, `CreationDate`, and `ModDate`. Before sharing the document internally — with a colleague, a lawyer, an editor — strip the personal metadata:

```bash
metascrub scrub --preset personal-only received-document.pdf --out shared-version.pdf
```

For photos from a source, check for GPS and strip it before publishing:

```bash
metascrub view source-photo.jpg
metascrub scrub --preset gps-only source-photo.jpg --out source-photo-clean.jpg
```

For a quick check without installing anything: drag the file onto [metadatafinder.com](https://metadatafinder.com). Processing happens locally in the browser — nothing is uploaded.

### A Note on Redaction

This is not technically a metadata issue, but it belongs in the same conversation. A black rectangle drawn on top of text in a PDF editor does not remove the text. It visually obscures it while leaving the text in the PDF's text layer, where it can be selected, copied, and read.

Genuine redaction requires a tool that actually removes the underlying text — not an image overlay. Adobe Acrobat's Redact feature does this. Dangerzone (an open source tool from the Freedom of the Press Foundation) converts documents to image-only PDFs, eliminating any text layer. A print-to-paper and rescan workflow achieves the same result.

After redacting, run `metascrub view` on the output to confirm that no personal metadata fields remain in the published version.
