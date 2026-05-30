---
title: 'How Journalists Protect Sources by Checking Metadata'
slug: journalist-protect-sources-metadata
target_keyword: 'journalists protect sources metadata'
description: 'A leaked PDF can expose the journalist who received it. Embedded metadata — producer strings, last-modified names, GPS in images, failed redactions — are well-documented failure modes in newsrooms. This guide covers the inspection and cleaning workflow.'
published: false
canonical: https://metadatafinder.com/blog/journalist-protect-sources-metadata
---

# How Journalists Protect Sources by Checking Metadata

Before a journalist publishes a document, the document needs to be inspected. Not just for its content — for what it reveals about how it got there, who handled it, and where it came from.

This is not a theoretical concern. There are documented cases of sources being identified through metadata that the journalist either did not check or did not know to check. The failure modes are specific and preventable.

---

## The Failure Modes

### 1. The PDF Producer Field Reveals the Printer or Computer

When a whistleblower prints a document to PDF to share it, the resulting file carries a `Producer` field in its metadata. This field records which software created the PDF. Common values include:

- `Microsoft Print to PDF` — Windows built-in PDF printer
- `Adobe PDF Printer` — Acrobat's print driver
- `macOS Version 14.4.1 (Build 23E224)` — the macOS PDF generation system
- `Xerox WorkCentre 7975 PDF` — certain office printers generate PDF directly and stamp their model in the Producer field
- `HP LaserJet MFP M227fdw` — same pattern

The Xerox or HP model in the Producer field narrows the source to a specific machine — and in a workplace where only one team uses that printer, that is a meaningful fingerprint.

Beyond the printer, the `Creator` field often shows the application that generated the source document: `Microsoft Word 2019`, `LibreOffice Writer 7.3`. Combined with the `ModDate` timestamp, this can narrow the window of who had access to the document at the relevant time.

To check a PDF's Producer:

```bash
metascrub view document.pdf
```

Look for `Producer`, `Creator`, `Author`, `CreationDate`, and `ModDate` fields.

### 2. The `lastModifiedBy` Field Reveals an Editor's Name

A DOCX file's metadata includes a `lastModifiedBy` field containing the display name of whoever most recently saved the document. If a source sends a DOCX — or a PDF that was converted from a DOCX — this field may be present.

In a DOCX, this is stored in `docProps/core.xml`:

```xml
<cp:lastModifiedBy>Margaret Okonkwo</cp:lastModifiedBy>
```

If the source sent the document to the journalist and the journalist edited it (adding notes, highlighting passages), the journalist's own display name is now the `lastModifiedBy` field. If the journalist then shares that document — with a colleague, with a legal advisor, or even stores it in a shared folder — the journalist's name is embedded in the file.

This works in reverse too: if the journalist receives a document and the source's name is in `lastModifiedBy`, publishing any version of that document that retains the metadata publishes the source's name.

### 3. Embedded Images With GPS Reveal Locations

A common workflow: a source photographs a physical document with their phone and sends the image. The image carries full EXIF data, including GPS coordinates accurate to within a few meters — the coordinates of wherever the source was standing when they took the photo.

If the journalist embeds that image in a published story, or shares the original image file, the source's location at the moment of photographing is disclosed.

This applies to images embedded in documents as well. A PDF that contains scanned photos, or a DOCX with an embedded photo, carries EXIF data for each embedded image.

```bash
# Check EXIF on a photo received from a source
metascrub view source-photo.jpg
```

If `GPSLatitude` and `GPSLongitude` appear in the output, the image carries location data.

### 4. Redactions That Don't Actually Redact

This is the most dangerous failure mode, and it is not technically a metadata issue — but it appears in the same workflows.

A common mistake: adding a black rectangle on top of text in a PDF editor, saving the PDF, and calling it redacted. The text is visually obscured but remains in the PDF's text layer. Anyone can select the text in a PDF viewer, copy it, and paste it into a text editor to read it.

[verify: the Department of Justice released a document in 2011 (related to the Roger Clemens case) with visible redaction rectangles whose underlying text was selectable — this is a frequently cited example of this failure mode; confirm specific case details before citing]

A related failure mode specific to scanned documents: applying black-box redactions as image manipulations on scanned pages. If the PDF contains vector text (not a scan), the redaction must be in the PDF's vector layer to actually remove the text — an image overlay does not touch the text layer.

The correct workflow for redaction:

1. Use software that genuinely removes the underlying text (Adobe Acrobat's Redact tool, not a drawing tool; or Dangerzone, which converts documents to image-only PDFs)
2. Print to paper and scan to a new image-only PDF as a belt-and-suspenders approach
3. Run the output through `metascrub view` to check that the resulting file has no text metadata, author fields, or unexpected embedded content

---

## The Inspection Workflow

Before publishing or sharing any document received from a source, run through this checklist:

### Before You Read the Document

Capture the metadata before opening the file in any application. Some applications (Word, Adobe Reader) can silently update modification timestamps when a file is opened.

```bash
# Save metadata immediately upon receipt
metascrub view --json received-document.pdf > metadata-$(date +%Y%m%d).json

# Or for a DOCX
metascrub view --json received-document.docx > metadata-$(date +%Y%m%d).json
```

Review the JSON output. Note:

- `Author`, `Producer`, `Creator`, `lastModifiedBy`
- `CreationDate`, `ModDate` — do these match the claimed timeline?
- `Template` — does this point to an internal corporate template?
- `Company` — does this match the claimed source organization?

### Strip Personal Metadata Before Sharing

If you need to share the document with a colleague, legal advisor, or another journalist, strip the metadata first:

```bash
# Strip all personal metadata (keeps document content intact)
metascrub scrub --preset personal-only received-document.pdf --out received-document-clean.pdf

# Or strip everything
metascrub scrub --preset all received-document.pdf --out received-document-stripped.pdf
```

Verify the output:

```bash
metascrub view received-document-clean.pdf
```

Confirm that `Author`, `Producer`, `Creator`, `lastModifiedBy`, and any GPS fields are absent.

### Handle Embedded Images Separately

If you are publishing images received from a source, check each image:

```bash
metascrub view source-image.jpg
```

Strip GPS before publishing:

```bash
metascrub scrub --preset gps-only source-image.jpg --out source-image-clean.jpg
```

For images embedded in a DOCX, you need to unzip the DOCX and inspect the `word/media/` folder:

```bash
unzip -d doc-contents received-document.docx
metascrub view doc-contents/word/media/image1.jpeg
```

### For High-Sensitivity Documents

For documents with genuine security sensitivity, the inspection and publication workflow should go beyond command-line tools:

1. Receive the document on an air-gapped machine or via a secure channel (SecureDrop, Signal with disappearing messages)
2. Inspect metadata on the receiving machine using the [MetaScrub desktop app](https://metadatafinder.com) (runs offline, no upload)
3. Convert to image-only PDF using Dangerzone or a similar conversion tool before sharing internally
4. Redact using a proper redaction tool, not a drawing overlay
5. Verify the final published version against a fresh metadata check

---

## What the SecureDrop Community Says

The Freedom of the Press Foundation, which maintains SecureDrop, publishes guidance on metadata and document handling as part of its newsroom security recommendations.

[verify: FPF/SecureDrop documentation includes guidance on metadata removal before publishing documents — confirm the current URL for their newsroom-facing guidance at freedom.press or securedrop.org]

The key recommendations align with the workflow above: assume documents contain metadata, check before sharing, use conservative tools (those that refuse to process files they cannot fully sanitize rather than silently passing them through), and treat metadata inspection as a routine step in the publication workflow rather than an edge case.

The SecureDrop project's recommended tool list has historically included MAT2 for server-side stripping. For newsrooms that need cross-platform tooling including Windows and macOS, MetaScrub covers the same use cases.

---

## A Note on What Metadata Cannot Tell You

Metadata can raise questions; it does not definitively answer them.

A fabricated document can have fabricated metadata. A `ModDate` can be set to any date. An `Author` field can be edited. A `Producer` field can be spoofed. Verifying document authenticity requires more than metadata inspection — it requires corroborating evidence, source verification, and sometimes forensic comparison with known-authentic documents.

What metadata can do is surface discrepancies that prompt further investigation. A document claiming to be from 2019 that has a `CreationDate` of 2024 warrants a question. A document from an organization that uses Microsoft Office whose `Producer` says it was generated by LibreOffice warrants a question. These are starting points, not conclusions.

---

## For Newsroom IT

If your newsroom handles sensitive documents regularly, metadata inspection should be part of the standard intake workflow, not something individual journalists remember to do on their own.

Options for systematic implementation:

**Browser extension for ad-hoc checking:** The [MetaScrub browser extension](https://metadatafinder.com) lets any journalist drag a file from their desktop onto the browser and see its metadata without installing anything or sending the file anywhere. This lowers the friction to the point where checking becomes the default behavior.

**CLI in the editorial workflow:** For newsrooms using document management systems or scripted workflows, `metascrub batch` can process incoming documents automatically and flag any that contain personal metadata fields.

**Docker-based API for integration:** The MetaScrub Docker image exposes a REST API that can be integrated into document intake systems — a POST to `/parse` returns the metadata JSON for any uploaded file. See [metadatafinder.com](https://metadatafinder.com) for the Docker documentation.

**Desktop app for offline workflows:** The MetaScrub desktop app runs entirely offline and is appropriate for air-gapped environments or situations where documents must never reach a network-connected application.

---

## Next Steps

Quick inspection of any file, no install required:

Visit [metadatafinder.com](https://metadatafinder.com) and drag the file onto the page. Processing happens in your browser — nothing is uploaded.

CLI for newsroom workflows:

```bash
npm install -g metascrub
metascrub view --json received-document.pdf
metascrub scrub --preset personal-only received-document.pdf --out clean.pdf
```

For a detailed breakdown of what metadata fields exist in DOCX and PDF files, and what each field reveals, see the related posts on [metadatafinder.com/blog](https://metadatafinder.com).
