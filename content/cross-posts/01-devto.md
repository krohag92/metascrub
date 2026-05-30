---
canonical: https://metadatafinder.com/blog/what-is-exif-data
tags: [privacy, exif, metadata, security]
cover_image: ''
title: 'What Is EXIF Data? A Plain-Language Guide to Hidden File Metadata'
published: false
---

> **Canonical URL:** This post was originally published at https://metadatafinder.com/blog/what-is-exif-data

Every digital photo contains a hidden payload called **EXIF data**. Most people have no idea it's there. This post covers what it is, what leaks, and how to check your own files.

## What EXIF Is (and Its Siblings)

EXIF (Exchangeable Image File Format) is a metadata standard embedded in JPEG, TIFF, HEIC, and WebP files since the mid-1990s. When your phone takes a photo, it writes an EXIF block alongside the pixels: camera model, exposure settings, date, and — if location services are on — precise GPS coordinates.

Related standards you will encounter:

- **IPTC** — older standard for press captions and bylines; embedded in JPEG alongside EXIF
- **XMP** — Adobe's XML-based standard; richer, often contains editing history and file paths
- **ID3** — metadata for MP3 and audio files (artist, album, geolocation fields)

## What Actually Leaks

Not every EXIF field is sensitive. But these are:

- `GPSLatitude` / `GPSLongitude` — accurate to a few meters
- `GPSAltitude`, `GPSSpeed`, `GPSImgDirection`
- `SerialNumber` / `LensSerialNumber` — identifies specific hardware
- `Artist`, `OwnerName`, `Copyright` — personal info
- `Software`, `HostComputer` — reveals your workflow

XMP editing history can contain the original local file path, which may include your username, and a history of every Lightroom edit.

## A Real Incident

In 2012, a Vice journalist published photos taken with John McAfee, a fugitive at the time. The photos' EXIF data contained GPS coordinates. [verify: multiple reports confirm GPS EXIF data in photos published alongside a Vice article disclosed McAfee's location in Guatemala — confirm details before removing hedge] Those coordinates were extracted and the location was disclosed publicly.

The point: once you share a file, you share everything in it.

## How to Check Your Files

**No install — browser only:**

Visit [metadatafinder.com](https://metadatafinder.com) and drop any file. Displays EXIF, IPTC, XMP, GPS, PDF info, DOCX properties. Processing is in-browser; nothing is uploaded.

**CLI — for bulk and automation:**

```bash
npm install -g metascrub
metascrub view photo.jpg
```

```
GPS
  Latitude   48.8584° N
  Longitude  2.2945° E

Warnings
  GPS coordinates found
  Personal info found: Artist = "Anton K."
```

Strip GPS before sharing:

```bash
metascrub scrub photo.jpg --preset gps-only
```

Strip everything:

```bash
metascrub scrub photo.jpg --preset all
```

**Browser extension:**

MetaScrub adds a right-click "View metadata" item to images on any web page. Available for Chrome, Firefox, Edge, and Opera.

## Not All Metadata Is Bad

Preserve orientation (`Orientation` tag) — stripping it rotates photos incorrectly. MetaScrub's `--preset all` keeps structurally required fields intact. Use `metascrub compare original.jpg cleaned.jpg` to see exactly what was removed.

## Next Steps

- Check your files: [metadatafinder.com](https://metadatafinder.com)
- CLI: `npm install -g metascrub`
- Extension: search "MetaScrub" in your browser's extension store
- More: [How to Remove GPS from Photos](https://metadatafinder.com/blog/remove-gps-from-photos)

---

_MetaScrub is open source under MIT license. Source and docs at https://metadatafinder.com_
