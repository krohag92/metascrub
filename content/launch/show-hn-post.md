# Show HN Post Draft — MetaScrub

## Title (≤80 chars)

```
Show HN: MetaScrub – open-source metadata viewer and scrubber for 25 file types
```

Character count: 79. Within limit.

---

## Body

MetaScrub is a metadata viewer and scrubber that runs locally. Source at github.com/metascrub/metascrub (MIT).

**What it does:**

- `view` — parses and displays all metadata in a file (EXIF, GPS, IPTC, XMP, ID3, PDF info dict + XMP packet, DOCX core/app/custom properties, video container atoms)
- `scrub` — removes metadata with four presets: all / GPS only / personal only / keep technical
- `compare` — diffs metadata between two files, useful for forensic review or verifying a scrub
- `batch` — processes folders with a CSV report of what was removed from each file

**25 formats:** JPEG, PNG, HEIC, WebP, AVIF, TIFF, RAW (CR2/NEF/ARW/DNG), MP3, FLAC, M4A, OGG, WAV, MP4, MOV, MKV, WebM, PDF, DOCX, XLSX, PPTX, EPUB, SVG.

**Distribution:** The same TypeScript core ships as a CLI (NPM), browser extension (Chrome/Firefox/Edge/Opera), desktop app (macOS/Windows/Linux via Tauri), Python package (PyPI), Docker image, and a handful of integrations (VS Code, Obsidian, Raycast, n8n, Figma). The web tool at metadatafinder.com runs the core in WebAssembly with no file upload.

The multi-platform distribution is part of the point — metadata leaks happen because people don't think to check, and lowering friction across every environment where files are handled seemed worth the engineering overhead.

**What's interesting technically:**

The core is a single TypeScript library with a format-dispatcher pattern: each format registers a parser and a scrubber, the dispatcher detects format by magic bytes (not file extension), and the public API is consistent regardless of format. The browser extension uses the same compiled bundle as the CLI via conditional module resolution. OOXML formats (DOCX, XLSX, PPTX, EPUB) share a base class since they are all ZIP archives of XML.

**Known limitations:**

- ExifTool (~290 formats, including proprietary camera MakerNotes) has much deeper parse coverage. MetaScrub does not try to replicate 20 years of camera MakerNote reverse-engineering.
- No metadata writing. View and strip only.
- Python package wraps the Node.js core, so Node.js is a dependency there.

Feedback welcome, especially on formats you'd want to see next or integration ideas.

---

## Best Time to Post

**Tuesday or Wednesday, 8–10 am Pacific Time.**

Reason: HN traffic peaks mid-morning Pacific on early weekdays. Tuesday and Wednesday consistently outperform Monday (readers are still clearing inboxes) and Thursday/Friday (early week momentum is gone). The Show HN window for front-page consideration is roughly the first 6 hours, so posting at 8–9 am PT gives the post the entire working day's traffic.

---

## Notes for Anton

- The HN submission should link to the GitHub repo (github.com/metascrub/metascrub), not to metadatafinder.com. HN culture prefers source code for Show HN posts; the web tool can be mentioned in the body.
- Keep the title factual. "Open-source" and the format count are verifiable and relevant to HN readers.
- Do not submit on the same day as a major Product Hunt launch — the audiences overlap enough that you want attention on each separately.
- The body text above is a draft. HN prefers shorter, denser posts. If you want to trim, cut the "what's interesting technically" section or the limitations section — but the limitations section tends to generate good discussion rather than bad press.
