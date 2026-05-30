---
canonical: https://metadatafinder.com/blog/word-document-metadata-leaks
title: 'The Names and Secrets Hiding Inside Every Word Document'
subtitle: "That contract you just sent? It has your employer's name, your colleague's name, and possibly a record of every edit ever made to it."
tags: [privacy, business, technology, documents]
published: false
---

> Originally published at [metadatafinder.com](https://metadatafinder.com/blog/word-document-metadata-leaks)

---

The contract is finalized. You export it to PDF, attach it to an email, and send it.

But you sent the DOCX version by accident last week, to a different client. And that DOCX contained your name, your colleague's name, your employer's company name, and fourteen rounds of revision history — including the comment your manager left on draft three that said "we should not be agreeing to this clause."

This happens more often than most people want to admit.

---

## What's in a DOCX

A DOCX file is a ZIP archive containing XML files. Two of them store structured metadata:

**`docProps/core.xml`** contains the creator's name, the last editor's name, a revision counter, and creation and modification timestamps. These are populated automatically from your Microsoft account and you never see them.

**`docProps/app.xml`** contains the application name, the version of Word, and — often surprisingly — your employer's company name. On Microsoft 365 tenants, this is pulled from Active Directory and embedded in every document every employee creates.

Then there are tracked changes and comments, stored in the document body but invisible in normal view. Turn on "Show All Markup" in Word and you can read everything that was ever added, deleted, or commented on, along with the name of the editor who did it.

---

## Why this matters

A law firm that sends a DOCX rather than a PDF has potentially disclosed the name of the associate who drafted it, the company that manages the firm's Microsoft 365 account, and every edit made during internal review.

A company sharing a proposal with a client has embedded its company name, the account that created the document, and how many revision cycles it went through (useful competitive intelligence for the client).

A journalist preparing a document with anonymized sources has potentially included the name of whoever typed the document — depending on how the file was created.

---

## The fix is easy

**One file, browser-based:** Drop the DOCX at [metadatafinder.com](https://metadatafinder.com). It shows every metadata field, flags warnings, lets you scrub, and downloads the cleaned file. Nothing is uploaded.

**In Word itself:** File → Info → Check for Issues → Inspect Document. Check "Comments, Revisions" and "Document Properties." Click Remove All. Save.

**Command line (for batches):**

```bash
npm install -g metascrub
metascrub scrub contract.docx --preset all

# Entire folder:
metascrub batch ./contracts --preset all --out ./contracts-clean
```

---

## The same applies to XLSX and PPTX

Excel and PowerPoint files use the same internal structure. The same `core.xml` and `app.xml` files carry the same fields. The same commands strip them.

```bash
metascrub scrub report.xlsx --preset all
metascrub scrub presentation.pptx --preset all
```

---

It's a 30-second check that avoids a conversation you don't want to have.

[metadatafinder.com — free, in-browser, no signup](https://metadatafinder.com)
