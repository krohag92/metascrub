---
canonical: https://metadatafinder.com/blog/what-is-exif-data
tags: [privacy, exif, metadata, security, webdev]
title: 'What Is EXIF Data? A Plain-Language Guide to Hidden File Metadata'
subtitle: 'GPS coordinates, device serial numbers, editing history — all hidden inside your photos.'
published: false
---

> Originally published at [metadatafinder.com/blog/what-is-exif-data](https://metadatafinder.com/blog/what-is-exif-data)

---

Every photo you take carries a hidden payload. The pixels are what you see. The **EXIF data** is what your phone silently adds alongside them.

## What EXIF Is

EXIF (Exchangeable Image File Format) is a metadata standard that lives inside JPEG, TIFF, HEIC, and WebP files. When you take a photo, your camera or phone writes:

- Camera make and model
- Lens information and serial numbers
- Exposure settings (shutter speed, aperture, ISO)
- Date and time
- GPS coordinates — if location services are active

This block is invisible in normal file browsing. Windows Explorer and macOS Finder do not show it by default.

### The full metadata family

EXIF is one standard among several that can be present simultaneously:

- **IPTC** — press industry standard for captions and bylines, embedded in JPEG alongside EXIF
- **XMP** — Adobe's XML-based standard; can contain the full editing history, original file paths, and Adobe account identifiers
- **ID3** — metadata for MP3, FLAC, M4A, OGG, and WAV audio files

Documents carry their own equivalent: DOCX files embed author names, company fields, and tracked change history in `docProps/core.xml` and `docProps/app.xml`. PDFs carry an Info dict and an XMP stream.

## The Fields That Actually Matter

Most EXIF fields are benign. But these have real privacy implications:

| Field                          | What it reveals                         |
| ------------------------------ | --------------------------------------- |
| `GPSLatitude` / `GPSLongitude` | Precise location, accurate to meters    |
| `GPSAltitude`, `GPSSpeed`      | Additional location context             |
| `SerialNumber`                 | Ties an image to a specific camera body |
| `LensSerialNumber`             | Ties an image to a specific lens        |
| `Artist` / `OwnerName`         | Personal name                           |
| `Software`                     | Workflow and application details        |

XMP is often more revealing than EXIF: it may contain the original filename (with a local path like `/Users/yourname/Desktop/...`), every Lightroom edit ever applied, and a unique document ID tied to your Adobe account.

## A Real Incident

In January 2012, journalists from Vice published an article with photos taken alongside John McAfee, who was a wanted man at the time. The photos contained GPS coordinates in their EXIF data. [verify: widely reported that EXIF GPS data in photos published online led to McAfee's location in Guatemala being disclosed — confirm specific outlet and sequence] Within hours, those coordinates were extracted and reported publicly.

## How to Check Your Files

### Free, browser-only

Drop any file at [metadatafinder.com](https://metadatafinder.com). Supports JPEG, PNG, HEIC, WebP, PDF, DOCX, XLSX, MP3, MP4, and more. Nothing leaves your browser.

### CLI

```bash
npm install -g metascrub
metascrub view photo.jpg
```

Strip GPS:

```bash
metascrub scrub photo.jpg --preset gps-only
```

Strip everything:

```bash
metascrub scrub photo.jpg --preset all
```

Batch a folder:

```bash
metascrub batch ./photos --preset gps-only --out ./photos-clean
```

### Browser extension

MetaScrub adds a right-click option to images on any web page. Works in Chrome, Firefox, Edge, and Opera.

## One Thing to Keep

EXIF orientation tells viewers which way is up. Stripping it makes portrait photos display sideways. MetaScrub's presets preserve orientation by default. Use `metascrub compare` to verify exactly what was changed.

## Further Reading

- [How to Remove GPS from Photos Before Posting](https://metadatafinder.com/blog/remove-gps-from-photos)
- [Strip Metadata from a PDF](https://metadatafinder.com/blog/strip-pdf-metadata)
- [Word Document Metadata Leaks](https://metadatafinder.com/blog/word-document-metadata-leaks)

All tools at [metadatafinder.com](https://metadatafinder.com) — MIT licensed, open source.
