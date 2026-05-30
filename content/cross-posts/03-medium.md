---
canonical: https://metadatafinder.com/blog/strip-pdf-metadata
title: 'The Hidden Metadata Inside Every PDF You Send'
subtitle: "Your author name, your editing software, a unique document ID — it's all there."
tags: [privacy, documents, law, technology]
published: false
---

> Originally published at [metadatafinder.com](https://metadatafinder.com/blog/strip-pdf-metadata)

---

When you hand someone a printed document, they get the words on the page. Nothing else.

When you email them a PDF, they get the words on the page — plus your name, the software you used, when you created it, when you last modified it, a unique document identifier, and possibly a record of every edit you made.

Most people sending PDFs don't know this.

---

## What's actually in a PDF

A PDF contains at minimum an Author field (usually your full name, pulled from your OS account), a Creator field (the application that made the document), and a Producer field (the PDF export engine).

It also typically contains an embedded XMP metadata stream — an XML packet that carries more detailed information: a DocumentID (a globally unique identifier tied to this document), a History field (which software touched it and when), and an OriginalDocumentID (linking the PDF back to the Word or Pages file it was created from).

Drop any PDF into [metadatafinder.com](https://metadatafinder.com) and you'll see this immediately.

---

## The professional risks

**For lawyers:** The Author field names whoever drafted the document. If that's you, opposing counsel knows. This is usually not what you want, and it happens automatically.

**For compliance and finance teams:** DocumentID fields can link different versions of a document together — drafts, signed copies, redlines — even if their content looks completely different.

**For journalists and researchers:** PDF metadata tells you who prepared a document, with what software, on what timeline. This can be genuinely useful when analyzing documents you've received. It's a risk when you're distributing your own.

---

## How to clean a PDF

**Free, browser-based:** Drop the file at [metadatafinder.com](https://metadatafinder.com). Review everything, click Scrub, download the result.

**Command line (exiftool):**

```bash
exiftool -all= -o document-clean.pdf document.pdf
```

**Command line (MetaScrub, cross-format):**

```bash
npm install -g metascrub
metascrub scrub document.pdf --preset all

# For a folder of contracts:
metascrub batch ./contracts --preset all --out ./contracts-clean
```

**Adobe Acrobat:** Tools → Redact → Sanitize Document. Requires the paid version.

---

## For teams with ongoing document flows

The MetaScrub CLI supports a `--dry-run` flag that audits a folder and reports what would be removed without touching any files. Run it on your outbound folder before you build the habit of stripping everything automatically.

`pip install metascrub` if you prefer Python. A Docker API is also available for server-side pipelines — see [metadatafinder.com](https://metadatafinder.com) for details.

---

[Check your PDFs now — free, in-browser: metadatafinder.com](https://metadatafinder.com)
