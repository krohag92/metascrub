---
canonical: https://metadatafinder.com/blog/photographer-bulk-cleaning-workflow
title: "Bulk-Cleaning Client Photos: A Photographer's Workflow"
subtitle: 'How to strip GPS and personal data before delivery, without destroying the metadata your clients actually want'
published: false
---

> **Originally published at** https://metadatafinder.com/blog/photographer-bulk-cleaning-workflow

Most photographers know, in a vague way, that photos contain hidden metadata. Fewer think about this before delivering a client shoot.

Here is the specific problem: every JPEG from your camera or phone contains GPS coordinates in its EXIF data. After a portrait session at someone's home, those coordinates locate that home. After a product shoot at your studio, they locate your studio. Once you hand the files to the client, you have no control over where those files end up or who reads the metadata.

This is easy to fix, and the fix should not require the client's photos to arrive stripped of all useful data.

### What to Keep, What to Remove

The goal is targeted removal. Camera technical data — focal length, aperture, ISO, shutter speed, camera model — is often useful to the client and helps authenticate your work as a professional. What you want to remove is location data, equipment serial numbers, and personal name fields.

MetaScrub's `--preset personal-only` handles this distinction: it strips GPS coordinates, `LensSerialNumber`, `BodySerialNumber`, and personal name fields, while keeping all the exposure data, the camera make and model, and the shooting timestamp.

If you only want to strip location data and keep everything else — including serial numbers — use `--preset gps-only`.

### The Workflow

Install MetaScrub once:

```bash
npm install -g metascrub
```

Create a folder structure for the job. Export your final selects from Lightroom or Capture One into a `to-clean` folder. Then run:

```bash
metascrub batch to-clean/ \
  --preset personal-only \
  --out delivered/ \
  --report report.csv
```

This processes every image in `to-clean/`, writes cleaned copies to `delivered/`, and generates a CSV report of what was removed from each file. The originals are untouched.

Before delivering, spot-check a few files:

```bash
metascrub view delivered/IMG_0001.jpg
```

Confirm that `GPSLatitude`, `GPSLongitude`, and serial number fields are absent. Confirm that `ExposureTime`, `FNumber`, `ISOSpeedRatings`, and `Model` are still present.

For a visual check without the terminal, drag a file onto [metadatafinder.com](https://metadatafinder.com).

### The Report

The CSV report has a `fields_removed` column listing every metadata field that was stripped from each file. This is useful both for your own records and for documentation if a client ever asks what processing was applied to their photos. Any row with `status: error` should be investigated before delivery.

### A Note on Lightroom's Export Option

Lightroom Classic and Lightroom CC include a "Remove Location Info" checkbox in the export dialog. If you are already using this, it handles the GPS problem for JPEG exports from Lightroom.

This workflow adds value for files outside Lightroom's export — phone photos, client-provided files, RAW files exported through other tools — and for stripping serial numbers and personal name fields in addition to GPS.

The two approaches are complementary. If you use Lightroom's option, you still benefit from running `metascrub view` to verify the output, and from the CSV report for documentation.
