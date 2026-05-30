# Product Hunt Launch Copy — MetaScrub

## Tagline (≤60 chars)

> See and strip metadata from any file

## Short description (for the product subtitle, ≤120 chars)

> Privacy-first metadata viewer and scrubber. CLI, browser extension, desktop app, and more.

## Long description

MetaScrub lets you see — and remove — the hidden metadata in your files before you share them.

Photos from your phone contain GPS coordinates. Word documents store the names of everyone who edited them. PDFs reveal which software created them, and sometimes which printer. MetaScrub shows you exactly what is in a file, and removes it with one command or one click.

**What it does:**

- View all metadata fields (EXIF, GPS, IPTC, XMP, ID3, PDF info dict, DOCX/XLSX/PPTX properties)
- Strip with four presets: All / GPS only / Personal only / Keep technical
- Compare metadata between two versions of a file
- Batch process folders with CSV reporting

**25 supported formats** across images, audio, video, and documents: JPEG, PNG, HEIC, WebP, AVIF, TIFF, RAW (CR2/NEF/ARW/DNG), MP3, FLAC, M4A, OGG, WAV, MP4, MOV, MKV, WebM, PDF, DOCX, XLSX, PPTX, EPUB, SVG.

**Available everywhere:**

- CLI: `npm install -g metascrub`
- Browser extension: Chrome, Firefox, Edge, Opera
- Desktop app: macOS, Windows, Linux
- Web tool: metadatafinder.com (no install)
- Python: `pip install metascrub`
- Docker, VS Code, Obsidian, Raycast, n8n, Figma

Everything runs locally. Your files never leave your device.

Open source, MIT license: github.com/metascrub/metascrub

---

## Gallery Captions (4–5 images)

**Screenshot 1 — Web tool**
Caption: "Drag any file onto metadatafinder.com. See every metadata field — EXIF, GPS, document properties — in your browser. Nothing uploaded."

**Screenshot 2 — Browser extension**
Caption: "The MetaScrub extension adds a right-click 'View metadata' option to any file download. One click to see what is in the file before saving."

**Screenshot 3 — CLI batch command**
Caption: "`metascrub batch ./photos/ --preset personal-only --report report.csv` — process a folder, strip GPS and personal fields, get a CSV of what was removed."

**Screenshot 4 — Desktop app**
Caption: "The MetaScrub desktop app. Drag a folder, choose a preset, run the scrub. Works offline. Three-pane layout: file list / metadata detail / scrub options."

**Screenshot 5 — CLI compare command**
Caption: "`metascrub compare before.docx after.docx` — diff metadata between two file versions. Useful for forensic review and verifying that a scrub did what you intended."

---

## Maker Comment Thread Plan

**Comment 1 — Context and motivation (post within first 30 minutes)**

"Hi Product Hunt! I built MetaScrub because I kept running into the same frustration: great tools exist for metadata removal (ExifTool, MAT2) but they require significant setup and are hard to share across a team. A journalist who needs to check a received PDF should not have to know what Perl is.

The goal was to make metadata inspection as low-friction as possible: drag a file onto a browser page, or run one command, and see everything. Then remove what you do not want to share.

Happy to answer any questions about how it works."

**Comment 2 — Technical design note (post during first 2 hours)**

"One detail that took some work: the browser extension and web tool process files entirely in the browser using WebAssembly and the JavaScript File API. Nothing is sent to a server. The 'works offline' claim is literal — the web tool at metadatafinder.com will work with no network connection once the page has loaded.

This mattered for the use case we cared about: newsrooms and legal teams handling sensitive documents should not have to trust a third party with their files."

**Comment 3 — Format coverage (when format questions come up)**

"Currently supports 25 formats: JPEG, PNG, HEIC, WebP, AVIF, TIFF, RAW (CR2/NEF/ARW/DNG), MP3, FLAC, M4A, OGG, WAV, MP4, MOV, MKV, WebM, PDF, DOCX, XLSX, PPTX, EPUB, SVG.

For formats outside this list, ExifTool (Perl) is still the gold standard and handles ~290 types including highly specialized camera MakerNotes. MetaScrub is not trying to out-parse ExifTool — it is trying to be the tool you can actually hand to a non-technical colleague."

**Comment 4 — Distribution note (when asked why so many platforms)**

"The distribution approach is deliberate. The project's theory is that if a tool is available everywhere someone already works — browser, VS Code, Obsidian, Raycast — the friction to using it drops below the 'I should probably check this' threshold.

All of the wrappers are thin shells around the same MIT-licensed TypeScript core: github.com/metascrub/metascrub"

**Comment 5 — Comparison to alternatives (when ExifTool or MAT2 come up)**

"ExifTool is the gold standard for parse depth and metadata writing. MAT2 is excellent for Linux-native privacy-conservative stripping. MetaScrub's contribution is the cross-platform distribution and the integrated view+scrub UX.

There is a full comparison post at metadatafinder.com/blog/oss-metadata-tools-compared. These tools are not competitors — they solve slightly different versions of the same problem."

**Comment 6 — Privacy confirmation (when privacy questions come up)**

"No analytics, no telemetry. No files are uploaded anywhere. The web tool and browser extension process files locally using the browser's built-in file APIs. The CLI, desktop, and all other wrappers run entirely locally. Privacy policy: metadatafinder.com/extension/privacy"

**Comment 7 — Roadmap teaser (later in the day)**

"A few things coming in the next releases: deeper RAW format support for camera MakerNote fields, a Figma plugin for checking design asset metadata before export, and a Hugging Face Space demo with an AI-image-detection angle (AI-generated images often have distinctive metadata signatures). Open to suggestions for formats and platforms worth prioritizing."

---

## First 1–2 Hours Reply Playbook

**FAQ: "How is this different from just right-clicking in Finder / Explorer?"**

"Finder and Explorer show a small subset of metadata fields in their 'Get Info' / 'Properties' panels. They do not show EXIF, GPS, XMP, PDF producer fields, or DOCX author chains. MetaScrub shows the full set, and also strips it."

**FAQ: "Is ExifTool better?"**

"ExifTool is the gold standard for parse depth, especially for camera-specific MakerNote fields. It also writes metadata, which MetaScrub does not do. MetaScrub's advantage is the multi-platform distribution: browser extension, desktop app, VS Code, and a web tool that requires no install. The right choice depends on your workflow."

**FAQ: "Why is this open source if it is free to use?"**

"MIT license. The code is at github.com/metascrub/metascrub. Open source means the privacy claims are verifiable — if the browser extension or web tool ever tried to send your files somewhere, anyone could check the code and find it."

**FAQ: "What about video files?"**

"MP4, MOV, MKV, and WebM are supported. Video metadata lives in container-level atoms (MP4/MOV) or Matroska tags (MKV/WebM) and includes fields like encoder, creation date, GPS, and embedded application identifiers."

**FAQ: "Does this work on mobile?"**

"iOS and Android apps are in development — mobile is last because App Store review takes the longest. For now, the web tool at metadatafinder.com works from any mobile browser."
