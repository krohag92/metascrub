---
title: "Word Document Metadata Leaks: What's Stored and How to Clean It"
slug: word-document-metadata-leaks
target_keyword: 'Word document metadata leaks'
description: 'DOCX files store author names, revision history, company fields, tracked changes, and comments. This guide explains what leaks and how to clean it — for individuals and IT teams.'
published: false
canonical: https://metadatafinder.com/blog/word-document-metadata-leaks
---

# Word Document Metadata Leaks: What's Stored and How to Clean It

When you create a Word document on your work laptop, Microsoft 365 quietly embeds your name, your employer's company name, and a log of every revision into the file. When you share that document — with a client, a regulator, or a journalist — all of that travels with it.

Most people are aware, in a vague way, that documents have "properties." Almost nobody checks them before sending. This guide explains exactly what is stored inside a DOCX file, walks through the most well-known incident of document metadata being used to expose what a document's authors wanted to hide, and covers three concrete methods to clean a DOCX before it leaves your organization.

---

## The Structure of DOCX Metadata

A DOCX file is a ZIP archive. If you rename `document.docx` to `document.zip` and unzip it, you will find a folder hierarchy containing XML files. Three of those XML files are the primary containers for metadata.

### `docProps/core.xml` — The Core Properties

This file holds the basic Dublin Core metadata for the document:

```xml
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
                   xmlns:dc="http://purl.org/dc/elements/1.1/"
                   xmlns:dcterms="http://purl.org/dc/terms/">
  <dc:creator>Jane Smith</dc:creator>
  <cp:lastModifiedBy>Thomas Nguyen</cp:lastModifiedBy>
  <cp:revision>14</cp:revision>
  <dcterms:created xsi:type="dcterms:W3CDTF">2024-09-03T10:12:00Z</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">2024-11-07T16:45:22Z</dcterms:modified>
</cp:coreProperties>
```

Fields to pay attention to:

- `dc:creator` — the name of the person who created the document, typically the display name from the Microsoft account or Active Directory profile of whoever first saved it.
- `cp:lastModifiedBy` — the name of the most recent editor. If multiple people have touched the document, this shows only the last one — but the revision history in the body of the document can show all of them.
- `cp:revision` — a revision counter. After 14 revisions, the counter reads 14. This alone tells a reader that the document was revised many times.
- `dcterms:created` and `dcterms:modified` — creation and modification timestamps.

### `docProps/app.xml` — The Application Properties

This file records properties about the application and organization:

```xml
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">
  <Application>Microsoft Office Word</Application>
  <AppVersion>16.0000</AppVersion>
  <Company>Acme Corporation</Company>
  <Manager>Regional VP Operations</Manager>
  <Template>Normal.dotm</Template>
  <Pages>12</Pages>
  <Words>3847</Words>
  <Characters>21943</Characters>
</Properties>
```

Fields to pay attention to:

- `Company` — the company name registered in Word's settings. On a work-managed Microsoft 365 tenant, this is typically populated from the Active Directory organization name. Many employees do not know this field exists.
- `Manager` — if populated, this is the manager's name from the organization chart.
- `Template` — which document template was used. On-premise organizations sometimes have template names that reveal internal project or department names.
- `Application` and `AppVersion` — the Word version, useful for forensic dating of a document.

### Tracked Changes and Comments

Tracked changes (`<w:ins>`, `<w:del>`) and comments (`<w:comment>`) inside `word/document.xml` are not "metadata" in the traditional sense — they are part of the document body. But they are one of the most common sources of unintended disclosure.

A document that has been through multiple rounds of review can contain:

- Deleted text that is still in the file, just marked as deleted
- All inserted text, attributed to the reviewer who inserted it
- Comments containing internal discussion ("why are we claiming this?", "legal hasn't approved this number")
- Author names attached to each tracked change and comment

These fields are visible to anyone who turns on "Show All Markup" in Word. They are invisible in normal view, but present in the file.

### `word/settings.xml` — Revision Tracking Settings

This file records whether revision tracking is enabled and the user identity used for tracking. It may contain the user's name and initials as configured in Word's identity settings at the time of editing.

---

## The Blair Iraq Dossier: The Classic Example

In September 2002, the British government published a dossier — "Iraq's Weapons of Mass Destruction: The Assessment of the British Government" — as part of the political case for the Iraq War. [verify: the dossier was published in September 2002; confirm the exact metadata findings — multiple journalistic and academic sources have documented the revision history and author name fields revealed by analysis of the DOCX; the specific detail that text was sourced from a published academic paper was a major finding]

The document was distributed as a Word file. A Cambridge academic named Glen Rangwala and others analyzed the metadata and revision history of the document. The analysis revealed that portions of the dossier had been taken largely from a 2002 journal article by Ibrahim al-Marashi, a postgraduate student, without attribution and with alterations. The revision history in the document showed the editing process and the names of officials involved.

The episode became known as the "dodgy dossier" affair and contributed significantly to the erosion of public trust in the intelligence claims made ahead of the Iraq War. [verify: confirm that it was specifically Word metadata / revision history that enabled the analysis, and that the al-Marashi article sourcing was confirmed through this or through direct textual comparison; multiple sources including the BBC and Guardian covered this]

The lesson is uncomfortable but specific: document metadata and revision history can reveal not just who wrote a document, but how a document was assembled from other sources, and by whom.

---

## Method 1: Word's Built-In Document Inspector

Microsoft Word includes a Document Inspector, accessible from within the application.

**In Word for Microsoft 365 (Windows or Mac):**

1. Open the document.
2. Go to **File → Info**.
3. Click **Check for Issues → Inspect Document**.
4. The Document Inspector dialog appears, with categories:
   - Comments, Revisions, Versions, and Annotations
   - Document Properties and Personal Information
   - Hidden Text
   - Embedded Documents
   - Macros, Forms, and ActiveX Controls
5. Check the boxes for the categories you want to inspect.
6. Click **Inspect**.
7. Click **Remove All** next to any category that found content you want to remove.
8. Save the document.

**What this covers:**

- Document Inspector removes core properties (creator, last modifier), app properties (company, manager), tracked changes, and comments in one operation.
- It does not remove hidden text visually — you need to accept or reject tracked changes first if the hidden text is from deleted content.

**Limitation:** Document Inspector requires opening the file in Word. If you need to process many files, this is not practical.

---

## Method 2: MetaScrub CLI — Automate and Audit at Scale

The MetaScrub CLI processes DOCX files without requiring Microsoft Word to be installed, and supports batch operations.

### Install

```bash
npm install -g metascrub
```

### Inspect a DOCX

```bash
metascrub view contract.docx
```

Output:

```
DOCX Core Properties
  creator         Jane Smith
  lastModifiedBy  Thomas Nguyen
  revision        14
  created         2024-09-03T10:12:00Z
  modified        2024-11-07T16:45:22Z

DOCX App Properties
  Application     Microsoft Office Word
  AppVersion      16.0000
  Company         Acme Corporation
  Manager         Regional VP Operations

Warnings
  File was edited by another user (lastModifiedBy differs from creator)
  Tracked changes / revisions present (revision count: 14)
  Personal info found: creator = "Jane Smith"
  Personal info found: Company = "Acme Corporation"
```

### Strip personal metadata

```bash
metascrub scrub contract.docx --preset personal-only
```

This targets `creator`, `lastModifiedBy`, `Company`, and `Manager` fields. It regenerates `docProps/core.xml` and `docProps/app.xml` with those fields blank. It does not touch tracked changes or comments (those are in the document body, not the properties files).

### Strip everything: properties and revision history

```bash
metascrub scrub contract.docx --preset all
```

This removes all properties and accepts all tracked changes (effectively flattening the revision history into the final document state). Comments are removed. The result is a clean document with no attribution metadata and no revision trail.

### Batch process a folder

```bash
metascrub batch ./outgoing-docs --preset all --out ./outgoing-clean
```

Every DOCX (and XLSX, PPTX) in the folder gets a cleaned copy. MetaScrub reports which files had issues.

### Verify the result

```bash
metascrub compare contract.docx contract.cleaned.docx
```

```
Removed:
  DOCX.core.creator          "Jane Smith"
  DOCX.core.lastModifiedBy   "Thomas Nguyen"
  DOCX.app.Company           "Acme Corporation"
  DOCX.app.Manager           "Regional VP Operations"
  DOCX.revisions             14 tracked changes cleared

Preserved:
  DOCX.core.revision         14 (counter preserved; content cleared)
  DOCX.core.created          2024-09-03T10:12:00Z
  DOCX.core.modified         2024-11-07T16:45:22Z
```

**Note on revision counters:** MetaScrub preserves the revision counter by default because zeroing it can cause Word to behave unexpectedly. The counter itself reveals only that the document was revised; the names and content of the revisions are what we remove.

### For Python environments

```bash
pip install metascrub
```

```python
from metascrub import scrub, ScrubOptions

with open("contract.docx", "rb") as f:
    result = scrub(f.read(), ScrubOptions(preset="all"))

with open("contract.cleaned.docx", "wb") as f:
    f.write(result.data)
```

---

## Method 3: metadatafinder.com Web Tool

For single files without a command line, **https://metadatafinder.com** handles DOCX files directly in the browser:

1. Visit https://metadatafinder.com.
2. Drop the DOCX file into the browser.
3. Review the metadata panel — it will flag any personal info fields.
4. Click "Scrub" and choose a preset.
5. Download the cleaned DOCX.

No file is uploaded; all processing is in-browser.

---

## XLSX and PPTX: Same Problem, Same Fix

XLSX (Excel) and PPTX (PowerPoint) files use the same OOXML ZIP structure as DOCX. The metadata files are identical in format and location: `docProps/core.xml` and `docProps/app.xml`. The Company, creator, lastModifiedBy, and revision fields are all present.

MetaScrub handles XLSX and PPTX with the same commands:

```bash
metascrub scrub spreadsheet.xlsx --preset all
metascrub scrub presentation.pptx --preset personal-only
```

---

## For IT and Compliance Teams: Integrating Into CI

If your organization regularly sends documents to external parties — contracts, proposals, financial reports — consider building metadata stripping into the workflow rather than relying on individuals to do it manually.

Options:

**Pre-send script (Node.js):**

```bash
metascrub batch ./outbound --preset all --dry-run --report json > metadata-audit.json
```

The `--dry-run` flag lets you audit without modifying files. The `--report json` flag outputs a JSON file listing every document and every field that would be removed. Review it, then run again without `--dry-run` to clean.

**Docker API:**

The MetaScrub Docker image exposes an HTTP API:

```bash
curl -X POST http://localhost:3000/scrub \
  -F "file=@contract.docx" \
  -F "preset=all" \
  --output contract.cleaned.docx
```

Integrate this endpoint into your document management system's upload flow.

**Python CI pipeline:**

```bash
pip install metascrub
python -c "
import metascrub, glob, pathlib
for p in glob.glob('outbound/**/*.docx', recursive=True):
    data = pathlib.Path(p).read_bytes()
    result = metascrub.scrub(data, metascrub.ScrubOptions(preset='all'))
    pathlib.Path(p).write_bytes(result.data)
print('Done.')
"
```

For full documentation, batch options, and the Docker image reference, see **https://metadatafinder.com**.

---

## What MetaScrub Does NOT Do

To avoid confusion:

- MetaScrub does not redact visible text. If a document contains sensitive text that you want removed, you need to delete it manually or use a dedicated redaction tool.
- MetaScrub does not modify password-protected or rights-managed documents — it cannot write to locked files.
- MetaScrub does not scan document content for sensitive phrases — it only handles structured metadata fields.

---

## Summary

DOCX files carry three categories of potentially sensitive metadata:

1. **Core properties** (`docProps/core.xml`) — creator name, last modifier, revision count, timestamps.
2. **App properties** (`docProps/app.xml`) — company name, manager name, Word version, template name.
3. **Tracked changes and comments** — inline revision history attributed to named editors.

The three methods covered here — Word's Document Inspector, the MetaScrub CLI, and the MetaScrub web tool — address all three categories. For organizations with regular external document flows, the CLI or Docker API is the most practical choice.

Check any document before it leaves your desk: **https://metadatafinder.com**.

---

## Next Steps

- **Check any DOCX right now:** https://metadatafinder.com
- **Install MetaScrub CLI:** `npm install -g metascrub`
- **Python and data engineering teams:** `pip install metascrub`
- **For PDF metadata (same issue, different format):** [How to Strip Metadata from a PDF](https://metadatafinder.com/blog/strip-pdf-metadata)
- **For photo metadata:** [What Is EXIF Data?](https://metadatafinder.com/blog/what-is-exif-data)

---

_MetaScrub — See and strip metadata from any file. Open source, MIT license. https://metadatafinder.com_
