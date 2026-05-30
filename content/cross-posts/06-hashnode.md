---
canonical: https://metadatafinder.com/blog/oss-metadata-tools-compared
tags: [opensource, privacy, security, tools]
cover_image: ''
title: 'Open Source Metadata Tools Compared: ExifTool, MAT2, MetaScrub'
published: false
---

> **Canonical URL:** This post was originally published at https://metadatafinder.com/blog/oss-metadata-tools-compared

There are three open source tools that come up repeatedly when people search for metadata management. Here is what each one actually does, where it excels, and where it falls short — without the marketing framing.

## ExifTool (est. ~2003, Perl, Artistic/GPL)

Phil Harvey's ExifTool has been the reference implementation for metadata parsing since the early 2000s. It reads approximately 290 file types, including manufacturer-specific MakerNote binary structures for major camera brands. Nothing else comes close on parse depth.

It also writes metadata — adding copyright tags, correcting timestamps, embedding custom fields — which neither MAT2 nor MetaScrub currently support.

The main friction: it is command-line only, Perl-based, and has a large configuration surface. On Windows, you install a standalone executable; on macOS and Linux, Perl is typically pre-installed.

```bash
# View GPS fields
exiftool -gps:all photo.jpg

# Remove GPS fields (creates backup as photo.jpg_original)
exiftool -gps:all= photo.jpg

# Remove all metadata recursively
exiftool -all= -r ./photos/

# JSON output
exiftool -json photo.jpg
```

Best for: comprehensive parsing, metadata writing, Linux/macOS power users, camera-specific MakerNote data.

## MAT2 (est. 2017, Python 3, GPLv3)

Julien Voisin's MAT2 is designed with a single, clear purpose: strip metadata from files before sharing them. Its design philosophy is conservative — if it cannot completely sanitize a file, it refuses and reports the limitation rather than processing it incompletely.

It supports approximately 20 file formats: JPEG, PNG, TIFF, MP3, OGG, FLAC, MP4, DOCX, XLSX, PPTX, ODT, ODS, ODP, PDF, ZIP, EPUB, and a few others. It is packaged in Debian/Ubuntu repositories and recommended in Tails OS documentation. A GNOME Nautilus extension provides right-click desktop access on Linux.

MAT2 does not run natively on macOS or Windows. Its viewing/inspection capability is minimal — the `--show` flag gives a simple key-value output rather than a structured breakdown.

```bash
apt install mat2

mat2 --show document.pdf      # inspect
mat2 document.pdf             # strip (output: document.cleaned.pdf)
mat2 --lightweight file.jpg   # faster, less thorough
```

Best for: Linux users, SecureDrop/Tails environments, privacy-conservative bulk stripping.

## MetaScrub (est. 2026, TypeScript + Python, MIT)

MetaScrub combines viewing and stripping with four scrub presets (All / GPS only / Personal only / Keep technical) and a compare command for diffing metadata between two files. The MIT license means no downstream GPL concerns.

The main differentiator is the number of distribution channels: CLI, browser extension (Chrome/Firefox/Edge/Opera), desktop app, web tool at [metadatafinder.com](https://metadatafinder.com), Python package, Docker image, VS Code extension, and integrations for Raycast, Obsidian, n8n, and Figma. This makes it practical to roll out across a team with varied technical backgrounds.

25 supported formats covers the common cases. For camera-specific MakerNote fields or metadata writing, ExifTool is still the right tool.

```bash
npm install -g metascrub

metascrub view photo.jpg                        # inspect
metascrub scrub --preset gps-only photo.jpg     # strip GPS
metascrub compare before.jpg after.jpg          # diff
metascrub batch ./photos/ --preset personal-only --report report.csv  # batch
```

Best for: cross-platform teams, integrated view+scrub workflow, batch processing with reporting, non-technical users via browser extension or web tool.

## Choosing Between Them

| Scenario                                         | Recommended          |
| ------------------------------------------------ | -------------------- |
| Comprehensive parsing, including MakerNotes      | ExifTool             |
| Writing / modifying metadata fields              | ExifTool             |
| Linux pipeline, privacy-conservative stripping   | MAT2                 |
| SecureDrop or Tails environment                  | MAT2                 |
| Cross-platform team with varied technical levels | MetaScrub            |
| Batch processing with CSV report                 | MetaScrub            |
| Browser-based inspection, no install             | MetaScrub (web tool) |
| Camera-specific RAW metadata                     | ExifTool             |

These tools complement each other. A sophisticated workflow might use ExifTool for deep parsing, MAT2 in a Linux pipeline for conservative stripping, and MetaScrub for the team members who use Windows or prefer a GUI.

[metadatafinder.com](https://metadatafinder.com) — no install required for basic inspection.
