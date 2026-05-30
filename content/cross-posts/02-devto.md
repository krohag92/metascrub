---
canonical: https://metadatafinder.com/blog/remove-gps-from-photos
tags: [privacy, security, javascript, tutorial]
title: 'How to Remove GPS from Photos Before Posting Online'
published: false
---

> **Canonical URL:** This post was originally published at https://metadatafinder.com/blog/remove-gps-from-photos

Your phone embeds a GPS fix in every photo — accurate to a few meters. When you share that photo, the coordinates go with it. This post covers four practical methods to strip GPS before posting.

## Why This Matters

The GPS fields in EXIF data (`GPSLatitude`, `GPSLongitude`, `GPSAltitude`, and related fields) resolve to a physical address almost instantly. Any EXIF viewer — including the free one at [metadatafinder.com](https://metadatafinder.com) — can extract them.

Targeted risks:

- **Stalking / domestic safety** — a photo taken at home reveals the home address
- **Journalism** — a field photo can reveal a source's location
- **Real estate / corporate** — interior photos can confirm location for reconnaissance
- **Legal** — photos submitted as evidence may disclose unintended location context

Platforms like Instagram and Twitter strip EXIF on upload. Many others (forums, GitHub issues, Dropbox links, Slack files, email attachments) do not. You cannot always know which is which.

## Method 1: metadatafinder.com (No Install)

1. Go to [metadatafinder.com](https://metadatafinder.com)
2. Drop the photo
3. See the GPS coordinates displayed
4. Click Scrub → GPS only → Download

All processing is in-browser. No file is uploaded.

## Method 2: MetaScrub CLI (Best for Batches)

```bash
npm install -g metascrub
```

**Inspect first:**

```bash
metascrub view photo.jpg
```

```
GPS
  Latitude   48.8584° N
  Longitude  2.2945° E
  Altitude   35m

Warnings
  GPS coordinates found
```

**Strip GPS only:**

```bash
metascrub scrub photo.jpg --preset gps-only
# Output: photo.cleaned.jpg
```

**Batch a folder:**

```bash
metascrub batch ./photos --preset gps-only --out ./photos-clean
```

**Verify:**

```bash
metascrub compare photo.jpg photo.cleaned.jpg
```

## Method 3: macOS — Photos App Export

1. Import the photo into Photos
2. **File → Export → Export 1 Photo**
3. Uncheck **Include Location Information**
4. Export

Note: re-encodes the JPEG (not lossless).

## Method 4: Windows — File Properties

1. Right-click photo → Properties → Details tab
2. **Remove Properties and Personal Information** (bottom link)
3. Check GPS latitude, GPS longitude, and related fields
4. OK

## Method 5: iPhone — Prevent or Strip at Share Time

**Prevent from being written:**
Settings → Privacy & Security → Location Services → Camera → Never

**Strip at share time (iOS 16+):**
Create a Shortcut with "Remove EXIF data" action before sharing. [verify: confirm exact name and iOS version availability of the "Remove EXIF data" Shortcuts action]

## What Gets Removed with `--preset gps-only`

MetaScrub targets all GPS-related EXIF and XMP fields:

- `GPSLatitude`, `GPSLatitudeRef`
- `GPSLongitude`, `GPSLongitudeRef`
- `GPSAltitude`, `GPSAltitudeRef`
- `GPSSpeed`, `GPSTrack`, `GPSImgDirection`
- `GPSDateStamp`, `GPSTimeStamp`, `GPSMapDatum`, `GPSDOP`
- `XMP:GPSLatitude`, `XMP:GPSLongitude`

Camera settings, author name, software — all untouched. Use `--preset all` to strip everything, `--preset personal-only` for just author/serial/software fields.

## Method Comparison

| Method             | Batch? | Lossless? | Free? |
| ------------------ | ------ | --------- | ----- |
| metadatafinder.com | No     | Yes       | Yes   |
| MetaScrub CLI      | Yes    | Yes       | Yes   |
| macOS Photos       | No     | No        | Yes   |
| Windows Properties | No     | Yes       | Yes   |
| iPhone Shortcut    | No     | Yes       | Yes   |

## Further Reading

- [What Is EXIF Data?](https://metadatafinder.com/blog/what-is-exif-data)
- [Strip PDF Metadata](https://metadatafinder.com/blog/strip-pdf-metadata)

---

_MetaScrub — open source, MIT. Full docs at https://metadatafinder.com_
