---
title: "Bulk-Cleaning Client Photos: A Photographer's Workflow"
slug: photographer-bulk-cleaning-workflow
target_keyword: 'bulk clean photo metadata photographer'
description: "Client photos contain GPS coordinates, equipment serial numbers, and shooting location data. This guide walks through a practical pre-delivery metadata cleaning workflow using MetaScrub's batch command."
published: false
canonical: https://metadatafinder.com/blog/photographer-bulk-cleaning-workflow
---

# Bulk-Cleaning Client Photos: A Photographer's Workflow

A delivered photo is not just the image. It is the image plus everything the camera recorded about the moment it was taken — which often includes the precise GPS coordinates of where you were standing.

For commercial photographers, this matters in ways that are not always obvious until something goes wrong.

---

## Why GPS in Client Photos Is a Problem

### Your Studio Address

After a product shoot at your studio, the EXIF data on every delivered image contains your studio's GPS coordinates. If a client reposts those images with metadata intact, or if someone scrapes the metadata from the client's public website, they now have your studio address. Whether that matters to you depends on your situation — but it is information you probably did not intend to share.

### Your Client's Location

For portrait and architectural shoots, the GPS coordinates in the delivered images may reveal where the client lives or works. A portrait session at a private residence, a family shoot at someone's home, a real estate shoot at a property that is not yet publicly listed — all of these result in photos whose metadata discloses the subject's address.

### Your Subject's Location (at the Moment of the Shot)

Street photographers, documentary photographers, and photojournalists face a more acute version of this problem. Photos of individuals taken in sensitive contexts — protests, healthcare facilities, immigration proceedings — may expose where those individuals were at a specific time, via GPS coordinates that are accurate to within a few meters.

### Equipment Serial Numbers

EXIF also records `LensSerialNumber` and `BodySerialNumber` for many camera/lens combinations. This is useful for insurance purposes; it is less useful when you are delivering work to a client who now has a record of your specific equipment serials. It is largely harmless, but if you sell gear, images you took years ago that are still online can be traced back to equipment you no longer own.

---

## What to Keep and What to Strip

The goal is not to destroy all metadata. Camera data (focal length, aperture, shutter speed, ISO) is often useful to the client — they may want to know how an image was shot. Copyright fields are useful to you. GPS and personal fields are what you want to remove.

MetaScrub's `--preset personal-only` is designed for this case. It strips:

- All GPS fields (`GPSLatitude`, `GPSLongitude`, `GPSAltitude`, `GPSSpeed`, `GPSTrack`, `GPSImgDirection`, and the `GPSInfo` IFD)
- `Artist`, `OwnerName`, `Copyright` author fields (preserving `Copyright` as a field but removing personal name data, depending on preset configuration — check your output)
- `LensSerialNumber`, `BodySerialNumber`, `CameraSerialNumber`
- DOCX/PDF personal properties (for any document files in the batch)

It keeps:

- `Make`, `Model` (camera manufacturer and model — this is non-personal technical data)
- All exposure data (`ExposureTime`, `FNumber`, `ISOSpeedRatings`, `FocalLength`, `Flash`)
- `DateTimeOriginal` (when the photo was taken — useful for the client)
- Color space, image dimensions, orientation

If you want to also keep copyright intact, use `--preset gps-only`, which strips only location data and leaves everything else untouched.

---

## The Pre-Delivery Workflow

### Step 1: Cull and Edit Normally

Work in Lightroom Classic, Lightroom CC, Capture One, or whatever you use. Export your final selects.

Lightroom's "Remove Location Info" export option is useful but only removes GPS fields. It does not touch serial numbers or other personal fields. This workflow handles the rest.

### Step 2: Export to a `to-clean/` Folder

Create a delivery export folder:

```
/client-jobs/
  jones-wedding-2026/
    finals/          ← your exports land here
    to-clean/        ← you will clean from this folder before delivering
    delivered/       ← cleaned files land here
```

Export from Lightroom/Capture One at full resolution and quality to `to-clean/`. Do not skip this step — clean the copies, not the originals.

### Step 3: Run the Batch Scrub

Install MetaScrub if you have not already:

```bash
npm install -g metascrub
```

Run the batch command:

```bash
metascrub batch to-clean/ \
  --preset personal-only \
  --out delivered/ \
  --report report.csv
```

What this does:

- Reads every supported image file in `to-clean/`
- Strips GPS, serial numbers, and personal fields using the `personal-only` preset
- Writes cleaned copies to `delivered/` (original files in `to-clean/` are not modified)
- Generates `report.csv` in the current directory

### Step 4: Review the Report

The CSV report has the following columns:

| Column           | Description                                                    |
| ---------------- | -------------------------------------------------------------- |
| `file`           | Filename (not full path)                                       |
| `status`         | `ok`, `skipped`, or `error`                                    |
| `fields_removed` | Comma-separated list of metadata field names that were removed |
| `fields_kept`    | Count of fields retained in the output file                    |
| `format`         | Detected file format (e.g., `image/jpeg`)                      |
| `error_message`  | Populated only when `status` is `error`                        |

Open this in Numbers, Excel, or any CSV reader. Scan the `fields_removed` column to confirm GPS fields were stripped. If any files show `status: error`, investigate before delivering.

### Step 5: Spot-Check a Sample

Pick three to five representative images from `delivered/` and verify them:

```bash
metascrub view delivered/IMG_0234.jpg
```

Confirm that no GPS fields appear in the output. Confirm that `ExposureTime`, `FNumber`, `ISOSpeedRatings`, and `Model` are still present if those are fields you want the client to see.

You can also drag the file onto [metadatafinder.com](https://metadatafinder.com) for a quick visual check if you prefer not to use the terminal.

### Step 6: Deliver from `delivered/`

Zip the `delivered/` folder and deliver to the client via your normal method (WeTransfer, Google Drive, USB drive, whatever). The originals in `to-clean/` and your Lightroom library are unaffected.

---

## Full Example Commands

```bash
# One-time setup
npm install -g metascrub

# Create folder structure
mkdir -p to-clean delivered

# (Export from Lightroom to to-clean/ here)

# Run batch scrub: GPS only (keeps everything else, including serial numbers)
metascrub batch to-clean/ \
  --preset gps-only \
  --out delivered/ \
  --report gps-only-report.csv

# OR: run batch scrub: personal-only (strips GPS + serial numbers + personal fields)
metascrub batch to-clean/ \
  --preset personal-only \
  --out delivered/ \
  --report personal-report.csv

# Spot-check a file
metascrub view delivered/IMG_0001.jpg

# Compare original vs. cleaned (confirm the diff is what you intended)
metascrub compare to-clean/IMG_0001.jpg delivered/IMG_0001.jpg
```

---

## Notes on Raw Files

If you export DNGs or other raw formats, MetaScrub supports DNG, CR2, NEF, and ARW. HEIC files (common from iPhones) are also supported.

HEIC files from iPhone carry `GPSLatitude` and `GPSLongitude` in their EXIF block like JPEG does, plus sometimes additional location data in XMP. The `personal-only` and `gps-only` presets both clear these.

RAW files from older camera bodies may have manufacturer-specific metadata structures (MakerNotes) that contain embedded GPS data in proprietary formats that MetaScrub may not parse completely. For high-security workflows involving RAW files, run through ExifTool as well (`exiftool -gps:all= file.cr2`) to catch any MakerNote GPS fields. For most client delivery workflows, JPEG exports are the relevant format.

---

## A Note on Lightroom's "Remove Location Info"

Lightroom Classic and Lightroom CC have a "Remove Location Info" checkbox in the export dialog. This removes GPS fields at export time. If you are already using this option, it handles the GPS problem for JPEG exports from Lightroom.

This workflow is still useful for:

- Files not exported from Lightroom (phone photos, client-provided files, scans)
- Removing serial numbers and other personal fields beyond GPS
- Files where you want a CSV report for documentation
- Batch-processing folders that mix image types

The two approaches are complementary. Use Lightroom's option if you are comfortable with it; run `metascrub batch` for anything outside that workflow.

---

## Next Steps

- Web tool (no install): [metadatafinder.com](https://metadatafinder.com)
- Install the CLI: `npm install -g metascrub`
- Browser extension: available in the Chrome Web Store, Firefox AMO, Edge, and Opera (search "MetaScrub")
- Desktop app for drag-and-drop batch processing without the terminal: [metadatafinder.com](https://metadatafinder.com)
