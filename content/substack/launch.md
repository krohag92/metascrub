---
title: "I Built the Same Tool for 15 Platforms at Once. Here's Why."
subtitle: 'Introducing MetaScrub — and the experiment behind it.'
published: false
---

# I Built the Same Tool for 15 Platforms at Once. Here's Why.

A few months ago I was helping a client with some product photography. They sent over a folder of JPEGs. I ran them through a quick metadata check — standard practice — and found GPS coordinates in a third of them. Coordinates that pointed to the photographer's home address.

It wasn't malicious. The photographer had no idea this was happening. Their phone was set to embed location, they'd been doing it for years, and nobody had ever told them that the files they were delivering to clients contained a precise fix on where they lived.

I mentioned it to the photographer. They didn't know what EXIF data was.

I sent them to a web tool to check the files. They found the tool confusing. I sent them a command to run in Terminal. They didn't have Node installed.

At that point I thought: this is a solved problem technically, but it is not a solved problem for most people who encounter it. The tools that exist are either aimed at forensic professionals or assume a level of technical comfort that many users don't have.

---

## What I built

**MetaScrub** is a metadata viewer and scrubber. It shows you what is hidden inside a file — EXIF data, GPS coordinates, author names, editing history, document properties — and lets you strip whatever you want before sharing.

That is the whole thing. There is nothing else. No AI, no subscription, no account.

The home is **[metadatafinder.com](https://metadatafinder.com)** — a web tool that processes files entirely in your browser, nothing uploaded. But MetaScrub is also:

- An NPM package and CLI (`npm install -g metascrub`)
- A Python package (`pip install metascrub`)
- A browser extension for Chrome, Firefox, Edge, and Opera
- A VS Code extension (for developers who want to inspect files from the editor)
- A Docker image for self-hosted batch processing and API
- An Obsidian plugin (check metadata of vault attachments)
- A Raycast extension (macOS quick-access)
- An n8n community node (workflow automation)
- A Figma plugin
- A Tauri desktop app (macOS, Windows, Linux)
- A WordPress plugin (bulk-clean media library uploads)
- iOS and Android apps (in progress)

Fifteen platforms. One core library.

---

## Why so many platforms?

Part of the answer is SEO strategy, and I'll be honest about that.

Each platform listing — Chrome Web Store, NPM, PyPI, VS Code Marketplace, Docker Hub, Raycast Store, and so on — is a backlink to metadatafinder.com from a high-authority domain. A thoughtful, genuinely useful tool on each platform is a better link-building vehicle than any link-buying scheme, and it creates actual value for the people who install it.

But the other part of the answer is that a tool is only useful to someone if it's accessible in the environment they're already in. A lawyer who needs to clean a PDF before filing it is not going to install Node. They need a web tool. A developer who processes documents in a Python pipeline needs a Python library. A journalist who checks photos on their phone needs a mobile app.

The same metadata problem exists everywhere. The solution should be everywhere too.

---

## What the tool covers

MetaScrub handles:

**Images:** JPEG, PNG, HEIC, WebP, AVIF, TIFF, RAW (Canon CR2, Nikon NEF, Sony ARW, Adobe DNG)

**Audio:** MP3, FLAC, M4A, OGG, WAV

**Video:** MP4, MOV, MKV, WebM

**Documents:** PDF, DOCX, XLSX, PPTX, EPUB

**Other:** SVG (embedded XML metadata)

For each format: view all metadata, strip with one of four presets (all / GPS only / personal only / keep technical), compare before and after, batch process folders.

---

## What's live today

- **Web tool** at [metadatafinder.com](https://metadatafinder.com)
- **NPM CLI** — `npm install -g metascrub`
- **Python package** — `pip install metascrub`
- **Browser extension** — Chrome, Firefox, Edge, Opera
- **Docker image** — CLI + HTTP API server
- **VS Code, Obsidian, Raycast, n8n, Figma** integrations

Desktop app and mobile apps are building. WordPress plugin is in review. More coming.

---

## What I'll be writing here

This newsletter is a build-in-public account of the project. I'll cover:

- Technical details of how the parsers work (some file formats are fascinating and some are maddening)
- The distribution experiment — what's working across which platforms, what's not
- Metadata incidents worth knowing about (there are more than you'd expect)
- Privacy topics adjacent to MetaScrub's use cases

No pitch deck, no growth hacks. Just the actual work.

If this sounds like something you want to follow: subscribe. I publish when there's something worth saying, not on a schedule.

And if you have files you're curious about right now: [metadatafinder.com](https://metadatafinder.com). No account, no install, no upload.

---

_Anton Krokhmal — building MetaScrub. SEO at Skelar. [metadatafinder.com](https://metadatafinder.com)_
