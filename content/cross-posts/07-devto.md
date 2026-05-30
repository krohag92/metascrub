---
canonical: https://metadatafinder.com/blog/photographer-bulk-cleaning-workflow
tags: [photography, privacy, workflow, cli]
cover_image: ''
title: "Bulk-Cleaning Client Photos: A Photographer's Workflow"
published: false
---

> **Canonical URL:** This post was originally published at https://metadatafinder.com/blog/photographer-bulk-cleaning-workflow

Client photos contain GPS coordinates. Before delivering a shoot, those coordinates should go. Here is the exact command sequence.

## Why It Matters

Every JPEG from your camera or phone embeds GPS coordinates in the EXIF data. After a portrait session at a client's home, every photo locates that home. After a product shoot at your studio, every photo locates your studio.

EXIF also records `LensSerialNumber` and `BodySerialNumber` — identifying your specific equipment.

## What to Strip, What to Keep

The goal is not to destroy all metadata. Camera data (focal length, aperture, ISO, shutter speed) is often useful to the client. Copyright fields are useful to you. GPS, serial numbers, and personal fields are what to remove.

MetaScrub's `--preset personal-only` strips:

- All GPS fields
- Serial number fields (`LensSerialNumber`, `BodySerialNumber`, `CameraSerialNumber`)
- Personal name fields

And keeps:

- Camera make and model
- All exposure data
- `DateTimeOriginal`

Use `--preset gps-only` to strip only location data and leave everything else untouched.

## The Workflow

```bash
# 1. One-time setup
npm install -g metascrub

# 2. Export from Lightroom/Capture One to to-clean/
# (do this in your editing software)

# 3. Run batch scrub
metascrub batch to-clean/ \
  --preset personal-only \
  --out delivered/ \
  --report report.csv

# 4. Spot-check
metascrub view delivered/IMG_0001.jpg

# 5. Compare one pair to confirm the diff is what you intended
metascrub compare to-clean/IMG_0001.jpg delivered/IMG_0001.jpg
```

## The CSV Report Columns

| Column           | Description                            |
| ---------------- | -------------------------------------- |
| `file`           | Filename                               |
| `status`         | `ok`, `skipped`, or `error`            |
| `fields_removed` | Comma-separated list of removed fields |
| `fields_kept`    | Count of retained fields               |
| `format`         | Detected file format                   |
| `error_message`  | Populated when `status` is `error`     |

Scan the `fields_removed` column to confirm GPS fields appear. Any `status: error` files should be investigated before delivery.

## Notes

- Lightroom's "Remove Location Info" export option handles GPS for JPEG exports. Use this workflow for files outside Lightroom's export, or when you also want serial numbers stripped.
- RAW files (DNG, CR2, NEF, ARW) are supported. For MakerNote GPS fields in RAW files, also run ExifTool as a belt-and-suspenders step for high-security workflows.
- HEIC from iPhones is supported.

For a visual spot-check without the terminal: [metadatafinder.com](https://metadatafinder.com) — drag a file, view its metadata in the browser.
