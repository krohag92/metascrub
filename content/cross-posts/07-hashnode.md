---
canonical: https://metadatafinder.com/blog/photographer-bulk-cleaning-workflow
tags: [photography, privacy, metadata, workflow]
cover_image: ''
title: "Bulk-Cleaning Client Photos: A Photographer's Workflow"
published: false
---

> **Canonical URL:** This post was originally published at https://metadatafinder.com/blog/photographer-bulk-cleaning-workflow

A practical guide to stripping GPS and personal metadata from client photos before delivery, while keeping camera technical data intact.

## The Problem

Every photo from your camera or phone carries EXIF metadata. After a portrait session at a client's home, the EXIF on every delivered image contains the GPS coordinates of that home. After a product shoot at your studio, every image contains your studio's location.

Your camera also records `LensSerialNumber` and `BodySerialNumber` — identifying your specific gear.

Most clients never look at this data. But once you hand over the files, you have no control over where those files go or who checks the metadata.

## Strip vs. Keep: The Decision

Not all metadata is bad. Camera technical data — focal length, aperture, ISO, shutter speed — is often valued by clients and helps authenticate your work. Copyright fields matter for licensing.

GPS, serial numbers, and personal name fields are the ones to remove.

MetaScrub's presets:

| Preset           | Strips                                      | Keeps                            |
| ---------------- | ------------------------------------------- | -------------------------------- |
| `gps-only`       | All GPS/location fields                     | Everything else                  |
| `personal-only`  | GPS + serial numbers + personal name fields | Camera technical data, copyright |
| `all`            | Everything                                  | Nothing                          |
| `keep-technical` | Personal + GPS                              | Exposure settings                |

For most client delivery: `--preset personal-only`.

## Complete Workflow

**Setup (once):**

```bash
npm install -g metascrub
```

**Folder structure:**

```
client-job/
  to-clean/     ← Lightroom/Capture One exports land here
  delivered/    ← cleaned files
```

**Run the scrub:**

```bash
metascrub batch to-clean/ \
  --preset personal-only \
  --out delivered/ \
  --report report.csv
```

**Verify a sample:**

```bash
metascrub view delivered/IMG_0001.jpg
# Confirm: no GPSLatitude, no GPSLongitude, no serial number fields
# Confirm: ExposureTime, FNumber, ISO, Model are still present
```

**Confirm the diff:**

```bash
metascrub compare to-clean/IMG_0001.jpg delivered/IMG_0001.jpg
```

**Deliver from `delivered/`.**

## The CSV Report

The `report.csv` file has these columns:

```
file, status, fields_removed, fields_kept, format, error_message
```

- `status`: `ok`, `skipped`, or `error`
- `fields_removed`: comma-separated list of every field name that was stripped
- `fields_kept`: count of fields remaining in the output file

Review this before delivery. If any row shows `status: error`, investigate that file.

## Format Support

Supported for this workflow: JPEG, PNG, HEIC, WebP, AVIF, TIFF, DNG, CR2, NEF, ARW.

Note: RAW files may carry manufacturer-specific GPS data in MakerNote blocks. For high-security workflows, supplement with ExifTool (`exiftool -gps:all= file.cr2`) to catch any MakerNote GPS fields MetaScrub does not parse.

For occasional spot-checks without the terminal: drag a file onto [metadatafinder.com](https://metadatafinder.com).
