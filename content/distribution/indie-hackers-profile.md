# Indie Hackers — Founder Profile + Product Page

Anton pastes these into the Indie Hackers web forms. Two sections: personal founder profile, then the MetaScrub product page.

---

## Section 1 — Founder Profile (Anton Krokhmal)

**Display name:** Anton Krokhmal

**Tagline (≤ 160 chars):**

> Building MetaScrub — an open-source metadata viewer and scrubber across 15+ platforms. SEO Team Lead by day. Shipping in public.

**Bio (long form, paste into "About" field):**

I'm a developer and SEO practitioner based in Ukraine. I work as SEO Team Lead at Skelar, where I lead growth strategy for SaaS products, and as AI Operations Lead, applying large language models to content and research workflows.

MetaScrub started from a recurring problem I kept running into at work: files shared in ordinary professional workflows contain metadata their creators never intended to share. A photo from a client shoot with GPS coordinates pointing to their home address. A Word document with tracked changes and company names embedded in the document properties. A PDF that reveals exactly which version of Acrobat created it, and when.

I decided to build a proper tool for this — one that works the same way whether you're in a terminal, a browser, a VS Code window, or a Python data pipeline. The result is a single TypeScript core distributed across 15+ channels: NPM, PyPI, Chrome/Firefox/Edge/Opera extension stores, VS Code Marketplace, Obsidian, Raycast, n8n, Figma, Docker Hub, Hugging Face, and a Tauri desktop app.

The multi-channel approach is deliberate: the metadata problem appears in every environment where people work with files, and the tool needs to be accessible in each of them. It's also a link-building experiment — each platform listing is a high-DR backlink to metadatafinder.com, where the web version lives.

Currently in v0.1.0. Everything is MIT-licensed and open source.

**Links:**

- Website: https://metadatafinder.com
- GitHub: https://github.com/metascrub/metascrub
- Personal site: https://antonkrokhmal.com

---

## Section 2 — MetaScrub Product Page

**Product name:** MetaScrub

**URL:** https://metadatafinder.com

**Tagline (shown under the product name):**

> See and strip metadata from any file.

**What makes it different (2-3 sentences, paste into the "What makes your product different" field):**

MetaScrub is not a SaaS — there is no server, no account, no upload. Every file is processed locally on the user's device. It supports 25 file formats and ships across 15+ platforms from a single open-source TypeScript core, so you can use it however you work: in a browser, a terminal, VS Code, an Obsidian vault, an n8n workflow, or a Figma session.

**Description (long form):**

MetaScrub is an open-source metadata viewer and scrubber. It shows you the hidden content inside files — EXIF coordinates, author names, editing history, software fingerprints — and strips it with one command before you share the file.

**Why it exists**

Files contain metadata that travels with them invisibly. A photo from your phone includes GPS coordinates, phone model, date, and time. A Word document stores the creator's name, employer (often pulled from Active Directory), and every editor's tracked changes. A PDF retains the name of the application that generated it and a unique document ID. None of this is visible in the document itself. All of it goes along for the ride when you share the file.

MetaScrub makes this visible and gives you control over it.

**Formats supported (25 total)**

Images: JPEG, PNG, HEIC, WebP, AVIF, TIFF, RAW (Canon CR2, Nikon NEF, Sony ARW, Adobe DNG)
Audio: MP3, FLAC, M4A, OGG, WAV
Video: MP4, MOV, MKV, WebM
Documents: PDF, DOCX, XLSX, PPTX, EPUB, SVG

**Where it lives**

- Web tool: https://metadatafinder.com
- NPM CLI: `npm install -g metascrub`
- Python: `pip install metascrub`
- Browser extension: Chrome, Firefox, Edge, Opera
- VS Code extension, Obsidian plugin, Raycast extension, n8n node, Figma plugin
- Docker: `docker pull metascrub/metascrub`
- Desktop: Tauri app for macOS/Windows/Linux
- WordPress plugin (media library scrubbing)

**Pricing:** Free and open source (MIT). The web tool at metadatafinder.com is free to use. No paid tiers at v0.1.

**Build-in-public notes (for IH update threads):**

This is my attempt to answer a question I find genuinely interesting: can you distribute one open-source tool across 15+ platforms from a single core library, and does the backlink profile you build from all those platform listings actually move the needle for the main domain? Shipping everything in phases; Phase 1 (core + CLI) is done.

---

_Status: Draft — ready for Anton to paste and submit. No account setup needed beyond the Indie Hackers registration._
