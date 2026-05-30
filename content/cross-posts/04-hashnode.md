---
canonical: https://metadatafinder.com/blog/word-document-metadata-leaks
tags: [privacy, microsoft, security, compliance, tools]
title: "Word Document Metadata Leaks: What's Stored and How to Clean It"
subtitle: 'Author names, company fields, tracked changes, comments — your DOCX carries more than you think.'
published: false
---

> Originally published at [metadatafinder.com/blog/word-document-metadata-leaks](https://metadatafinder.com/blog/word-document-metadata-leaks)

---

A DOCX file is a ZIP archive. If you rename it to `.zip` and unpack it, you'll find XML files — including `docProps/core.xml` and `docProps/app.xml`, which store structured metadata that travels with the document every time it's shared.

## What `docProps/core.xml` Contains

```xml
<dc:creator>Jane Smith</dc:creator>
<cp:lastModifiedBy>Thomas Nguyen</cp:lastModifiedBy>
<cp:revision>14</cp:revision>
<dcterms:created>2024-09-03T10:12:00Z</dcterms:created>
<dcterms:modified>2024-11-07T16:45:22Z</dcterms:modified>
```

The `creator` and `lastModifiedBy` fields are the most commonly exposed personal data. They're populated automatically from the Microsoft account or Active Directory profile of whoever created or last edited the file.

## What `docProps/app.xml` Contains

```xml
<Company>Acme Corporation</Company>
<Manager>Regional VP Operations</Manager>
<Application>Microsoft Office Word</Application>
<Template>Normal.dotm</Template>
```

The `Company` field is often surprising. On a work-managed Microsoft 365 tenant, it's populated from the Active Directory organization name. Most employees have no idea it's being embedded in every document they create.

## Tracked Changes: The Biggest Risk

Tracked changes and comments are stored in `word/document.xml`. They are:

- Invisible in normal view
- Fully visible when "Show All Markup" is enabled
- Attributed to named editors
- Contains deleted text that is still in the file

A document with a long revision history can contain internal discussions, contradicted claims, and identities that the final document's author would prefer to remain private.

## A Notable Example

The British government's Iraq dossier (published September 2002) was distributed as a Word document. Analysis of its revision history and metadata found the document had been compiled partly from a published academic paper without attribution. [verify: confirm specific details — the al-Marashi paper sourcing and the metadata analysis — multiple sources including BBC and Guardian reported on this; confirm the year 2002/2003 for the specific dossier in question] The metadata told a story the authors hadn't intended to share.

## Three Ways to Clean DOCX Files

### Word's Document Inspector (No Extra Tools)

File → Info → Check for Issues → Inspect Document → Remove All per category.

Covers properties, comments, and revisions. Requires Word. One file at a time.

### MetaScrub CLI (Batch Capable)

```bash
npm install -g metascrub

# See what's there
metascrub view contract.docx

# Clean personal metadata only
metascrub scrub contract.docx --preset personal-only

# Clean everything including tracked changes
metascrub scrub contract.docx --preset all

# Batch a folder
metascrub batch ./contracts --preset all --out ./contracts-clean

# Audit without touching files
metascrub batch ./contracts --preset all --dry-run
```

### metadatafinder.com (Browser, No Install)

Drop the file at [metadatafinder.com](https://metadatafinder.com). Review, scrub, download. In-browser.

## XLSX and PPTX

Same structure, same commands:

```bash
metascrub scrub report.xlsx --preset all
metascrub scrub slides.pptx --preset personal-only
```

## For IT and Compliance Teams

A pre-send audit script using MetaScrub's `--dry-run` flag lets you check every outgoing document for personal metadata without modifying anything. Then strip automatically when the audit is clean.

Python: `pip install metascrub`
Docker API: see [metadatafinder.com](https://metadatafinder.com)

---

_MIT licensed, open source. [metadatafinder.com](https://metadatafinder.com)_
