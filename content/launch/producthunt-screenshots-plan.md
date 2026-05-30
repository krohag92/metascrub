# Product Hunt Screenshots Plan — MetaScrub

## Product Hunt Specifications

- Format: PNG or JPEG
- Aspect ratio: 1270×760 (16:9 recommended) or 630×380 minimum
- Count: up to 5 screenshots + 1 thumbnail
- Thumbnail: 240×240 px (square)
- Order matters: first screenshot is the hero shown in listings and cards

---

## Screenshot 1 — Web Tool (Hero)

**What to show:** The metadatafinder.com web tool with a JPEG file dropped onto it. Display the metadata panel open, showing GPS coordinates, camera make/model, and a few EXIF fields. Include a visible "Strip GPS" or "Scrub" button.

**Caption:** "See every metadata field in your browser. No install, no upload."

**Key elements:**

- The metadatafinder.com URL visible in browser bar
- Uploaded file thumbnail on the left
- Metadata fields panel on the right: `GPSLatitude`, `GPSLongitude`, `Make`, `Model`, `DateTimeOriginal`
- A scrub/remove button visible
- Clean, light UI

**Size:** 1270×760 px

---

## Screenshot 2 — Browser Extension

**What to show:** The MetaScrub browser extension popup, triggered on a downloaded JPEG. Show the compact metadata summary with GPS data highlighted, and the scrub preset selector.

**Caption:** "Right-click any file to view metadata. Works on downloads, pages, and local files."

**Key elements:**

- Browser toolbar with MetaScrub extension icon active
- Extension popup open showing: filename, file type, GPS fields highlighted in yellow/amber (privacy warning treatment)
- Preset selector: All / GPS only / Personal only / Keep technical
- "Scrub" button

**Size:** 1270×760 px

---

## Screenshot 3 — CLI Batch Command

**What to show:** A terminal (dark background) running `metascrub batch ./photos/ --preset personal-only --report report.csv`. Show the progress output and the final summary line (N files processed, N fields removed).

**Caption:** "`metascrub batch` — process a folder, strip GPS and personal fields, export a CSV report."

**Key elements:**

- Clean terminal (macOS Terminal or iTerm2, dark theme)
- The full command visible
- Progress output showing filenames being processed
- Summary line: `32 files processed. 128 fields removed. Report saved to report.csv.`
- No errors

**Size:** 1270×760 px

---

## Screenshot 4 — Desktop App

**What to show:** The MetaScrub desktop app on macOS, with a folder loaded. Three-pane layout: file list on the left, metadata detail in the center, scrub options on the right. One file selected showing GPS fields.

**Caption:** "Desktop app for macOS, Windows, and Linux. Drag folders, pick a preset, scrub."

**Key elements:**

- App window, macOS-style chrome (or neutral)
- Left pane: file list with 8–10 files, one highlighted
- Center pane: full metadata field breakdown for the selected file, GPS fields visible
- Right pane: preset selector + "Scrub Selected" / "Scrub All" buttons
- Status bar: "0 files scrubbed" before the scrub

**Size:** 1270×760 px

---

## Screenshot 5 — Compare Command (Forensics Use Case)

**What to show:** A terminal running `metascrub compare before.docx after.docx`. Show the diff output: fields present in one file but not the other, changed values (e.g., `lastModifiedBy` changed between versions, `ModDate` updated).

**Caption:** "`metascrub compare` — diff metadata between two file versions. For verification and forensic review."

**Key elements:**

- Clean terminal
- The compare command visible
- Diff output with clear color coding: green for fields in after but not before, red for fields removed, yellow for changed values
- At least 3–4 field differences shown
- Specifically: `lastModifiedBy` changed, `ModDate` changed, `cp:revision` changed

**Size:** 1270×760 px

---

## Thumbnail (for Product Hunt card)

**What to show:** The MetaScrub logo (navy + green, one-word "MetaScrub") on a clean background. Optionally: a simplified file icon with a metadata-inspect magnifying glass treatment.

**Size:** 240×240 px (square)

**Requirements:**

- Logo legible at small sizes
- No text beyond "MetaScrub" (tagline too small at 240px)
- Navy background with green accent works well for dark-mode Product Hunt feed

---

## Screenshot Order (final recommended order)

1. Web tool — hero, most accessible use case, no install barrier
2. Browser extension — next lowest friction, shows everyday use case
3. Desktop app — shows breadth of the product, different audience
4. CLI batch — developer audience, shows the power-user path
5. Compare command — forensics/power-user angle, differentiates from simple strippers

---

## Notes for Anton

- Screenshots need to be created from the actual running product, not mockups — Product Hunt reviewers notice mockups.
- For the terminal screenshots (3 and 5), use real output from running the actual CLI commands against sample files.
- The browser extension popup (screenshot 2) needs to be captured from a real browser with the extension installed and active on a file with GPS data.
- If the desktop app is not yet released, the CLI screenshots (3 and 5) and web tool screenshot (1) are the highest priority to have ready for launch.
