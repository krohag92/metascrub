---
title: 'Forensics Use Cases: Catching Metadata in Leaked Documents'
slug: forensics-leaked-documents
target_keyword: 'metadata forensics leaked documents'
description: 'Journalists, fact-checkers, and legal teams use document metadata to verify authenticity, trace authorship, and detect tampering. This guide covers what metadata reveals in leaked DOCX and PDF files — and how to run your own forensic workflow.'
published: false
canonical: https://metadatafinder.com/blog/forensics-leaked-documents
---

# Forensics Use Cases: Catching Metadata in Leaked Documents

When a document lands in a journalist's inbox claiming to prove something explosive, the first question is not "does this look real?" The first question is "what does the metadata say?"

Metadata forensics — examining the hidden properties embedded in a document file — has been a standard part of investigative journalism and legal discovery for over two decades. It has exposed plagiarism, revealed the identity of anonymous authors, confirmed the authenticity of disputed files, and — in at least one well-documented case — helped unravel the evidentiary basis claimed for a military intervention.

This guide covers what metadata can reveal in a leaked DOCX or PDF, how document metadata forensics has been used in real public cases, and how to set up a basic forensic review workflow using [MetaScrub](https://metadatafinder.com) and its CLI.

---

## What Metadata Can Reveal in a Leaked Document

### DOCX Files: A Rich Audit Trail

A DOCX file is a ZIP archive containing XML files. The properties most useful for forensic analysis live in three places.

**`docProps/core.xml`** stores:

- `dc:creator` — the name of whoever created the document, typically pulled from the Microsoft account or Active Directory profile registered on the machine at creation time
- `cp:lastModifiedBy` — the display name of the most recent editor
- `cp:revision` — how many times the document has been saved
- `dcterms:created` and `dcterms:modified` — UTC timestamps

**`docProps/app.xml`** stores:

- `Application` — the word processor used (e.g., `Microsoft Office Word 16.0000`, `LibreOffice Writer 7.5`)
- `AppVersion` — specific version of the application
- `Company` — the organization name registered in the Office install
- `Manager` — a field sometimes populated in enterprise installs
- `Template` — which template the document was created from

**The document body** (`word/document.xml`) may contain:

- Tracked changes with author names and timestamps for each individual edit
- Comments attributed to specific named reviewers
- Embedded images, each of which may carry its own EXIF metadata — including GPS coordinates if the image was taken on a phone

**Custom XML parts** can hold arbitrary additional properties. Enterprise document management systems sometimes stamp files with project codes, classification labels, or system identifiers that survive the document's whole lifecycle.

### PDF Files: Producer, Creator, and XMP

PDF metadata lives in two structures that can contain different — sometimes contradictory — information.

**The info dictionary** holds:

- `Producer` — the software that generated the PDF (e.g., `Adobe Acrobat 23.6.20320`, `Microsoft Word for Microsoft 365`, `GPL Ghostscript 9.54`)
- `Creator` — the application that produced the source document
- `Author`
- `CreationDate` and `ModDate`

**The XMP packet** (an XML block embedded in the file body) often contains:

- A more verbose version of the same fields
- `xmp:CreateDate`, `xmp:ModifyDate`, `xmp:MetadataDate`
- `xmpMM:DocumentID` and `xmpMM:InstanceID` — GUIDs that can link multiple versions of the same document to a common origin
- `pdf:Producer`, `dc:creator`, `dc:description`

When a DOCX is converted to PDF by saving from Word, the `Creator` field typically reads `Microsoft Word` and the `Producer` field reads the specific Office build number. When converted via a third-party tool or print driver, the `Producer` field reflects that tool instead. This distinction can confirm or contradict a document's claimed origin.

### Embedded Images With EXIF

Both DOCX and PDF files can contain embedded images. In DOCX, images live in the `word/media/` folder inside the ZIP. Those images may carry full EXIF metadata — including GPS coordinates from the device that took the photo. A photo taken at a source's home, then embedded in a document, leaks the location of that home regardless of what the surrounding text says.

### SVG: Editor Signatures in Vector Files

SVG files (Scalable Vector Graphics) store metadata in XML namespaces. An SVG created in Inkscape, Adobe Illustrator, or Affinity Designer carries:

- `dc:creator` — often populated from OS account settings
- Editor-specific attributes (`inkscape:version`, for example) that identify both the application and its version
- Embedded RDF metadata blocks with creation timestamps

When SVGs are embedded in documents or published as standalone files, these editor signatures travel with them.

---

## Real Cases Where Document Metadata Changed the Story

### The Iraq Dossier (2002)

In September 2002, the UK government published a dossier titled "Iraq's Weapons of Mass Destruction: The Assessment of the British Government," intended to build the public case that Iraq posed an active threat.

Shortly after publication, researchers examining the document's revision history and author fields found that the `lastModifiedBy` fields pointed to Downing Street communications staff, and a textual comparison revealed that substantial portions — including typographical errors and sentence structure — had been copied verbatim from a thesis by Ibrahim al-Marashi, a postgraduate student, without attribution.

[verify: the al-Marashi sourcing was established primarily through direct textual comparison of the published dossier against his published thesis; the DOCX metadata reportedly named Downing Street communications staff as editors, confirming government authorship; verify the precise role of the metadata fields vs. the textual comparison before publishing — the BBC, Channel 4, and Guardian all reported on this; the "dodgy dossier" label attached to this document specifically]

The incident damaged public confidence in the intelligence case for the invasion and led to formal parliamentary inquiries into how the document had been assembled.

### Document Metadata in Legal Discovery

In US civil litigation, DOCX and PDF metadata regularly becomes evidence. The `lastModifiedBy` field, combined with revision timestamps, can demonstrate that a contract was edited after a claimed signing date. Custom properties can reveal document management system labels that contradict a party's account of a document's status.

[verify: metadata evidence has been cited in numerous US federal cases under Federal Rule of Civil Procedure 26(b)(2)(B); specific case citations would strengthen this — recommend searching Westlaw for "document metadata" + "FRCP 26" or asking a legal research assistant for cases where Word metadata was used to impeach witness testimony]

This is why law firms typically scrub client documents before production — not just for privilege review, but to remove metadata that could be used to undermine the client's narrative.

### Printer Steganography and Document Fingerprinting

Some printers embed tiny yellow dots on every page — a steganographic tracking code known as Machine Identification Code (MIC) or "printer dots." The pattern encodes the printer's serial number and the printing date.

[verify: this is a well-documented NSA-linked program; the EFF published detailed research on this; the Reality Winner leak case (2017) is widely cited as a case where document fingerprinting — though via printed document scanning artifacts, not file metadata — contributed to the identification of the source]

This is technically different from file metadata, but the principle is the same: documents carry more information than their visible content.

---

## Setting Up a Forensic Review Workflow

### Step 1: Capture the Metadata Before Opening

Before reading a leaked document in any application, extract and log its metadata. Applications can modify file metadata just by opening a document. Capture the state first.

Using the [MetaScrub](https://metadatafinder.com) CLI:

```bash
# Install once
npm install -g metascrub

# Capture all metadata as JSON
metascrub view --json leaked-document.pdf > forensics-log-$(date +%Y%m%d-%H%M%S).json

# Human-readable terminal view
metascrub view leaked-document.docx
```

The JSON output captures every parsed field in a structured format you can share with colleagues, diff against later versions, or feed into automated pipelines.

### Step 2: Compare Two Versions

If you receive multiple versions of a document — or if a source claims the document has not been modified — run a compare:

```bash
metascrub compare version-a.docx version-b.docx
```

This produces a diff of every metadata field that differs between the two files. Useful for detecting:

- Author names that changed between versions (someone cleaned up a draft)
- A `ModDate` that changed when the `CreationDate` did not (the file was re-exported)
- A revision counter that reset to 1 (the text was copy-pasted into a new document to discard history)

Fields that are **present in one file but absent in the other** are flagged separately, which can be as informative as a changed value.

### Step 3: Inspect Embedded Images

A DOCX file is a ZIP archive, so you can unzip it to inspect embedded images directly:

```bash
# Unzip the DOCX
unzip -d docx-contents leaked-document.docx

# View EXIF of each embedded image
metascrub view docx-contents/word/media/image1.jpeg
metascrub view docx-contents/word/media/image2.jpeg
```

For PDFs, the `pdfimages` tool (part of the poppler utilities) can extract embedded images for separate EXIF inspection.

### Step 4: Batch-Process a Document Set

Large leaks arrive as collections. Process them all at once and look for patterns:

```bash
metascrub batch ./leak-folder/ --format json > all-metadata.json
```

The JSON output can be queried with `jq`. For example, to find every document whose `lastModifiedBy` field is not empty:

```bash
jq '[.[] | select(.fields.lastModifiedBy != null)]' all-metadata.json
```

Or to find documents that claim to be from Word but whose `Producer` field suggests a different application:

```bash
jq '[.[] | select(.fields.Producer | test("Ghostscript|LibreOffice|OpenOffice"))]' all-metadata.json
```

### Step 5: Document the Chain of Custody

If forensic findings may be used in legal proceedings or published as evidence:

1. Hash original files before any processing: `sha256sum leaked-document.pdf > hashes.txt`
2. Run `metascrub view --json` and save output alongside the hash file
3. Record the date, MetaScrub version (`metascrub --version`), and the machine used
4. Do not modify the original files; work from verified copies

---

## What Metadata Cannot Tell You

Metadata forensics has real limits worth stating plainly.

**Metadata can be altered.** Anyone with the right tools can change creation dates, author names, and `Producer` fields. The presence of plausible-looking metadata is not proof of authenticity, and sophisticated forgeries will have consistent metadata.

**Timestamps can be wrong.** File system modification times are set by the OS, not by the file's internal metadata. A document's `DateTimeOriginal` reflects the device's clock at creation time, which may be incorrect. Camera clocks drift. VMs run in wrong timezones. Don't anchor forensic conclusions solely on timestamps.

**Different tools surface different fields.** A tool that only reads the PDF info dictionary will miss XMP packet data. A tool that doesn't parse custom XML parts will miss enterprise document management stamps. For high-stakes documents, use more than one tool and compare results. [MetaScrub at metadatafinder.com](https://metadatafinder.com) reads both the info dictionary and the XMP packet.

**Stripped metadata is itself a signal.** A document with no author, no creation date, and no application fingerprint is not neutral. Someone removed that information. Note this in your forensic log.

---

## Next Steps

For quick spot-checks of individual files without installing anything, drag a PDF or DOCX onto [metadatafinder.com](https://metadatafinder.com). Processing happens in your browser; nothing is uploaded to a server.

For forensic workflows involving many documents or requiring automation:

```bash
npm install -g metascrub
metascrub view --json <file>           # capture metadata
metascrub compare <file-a> <file-b>    # diff two versions
metascrub batch <folder/> --format json # process many files
```

For newsrooms handling sensitive documents on machines that cannot connect to the internet, the [MetaScrub desktop app](https://metadatafinder.com) runs entirely offline. Your files never leave the machine.
