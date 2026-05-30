---
canonical: https://metadatafinder.com/blog/remove-gps-from-photos
tags: [privacy, security, tutorial, tools]
title: 'How to Remove GPS from Photos Before Posting Online'
subtitle: 'Five methods compared — from browser tools to CLI batch processing.'
published: false
---

> Originally published at [metadatafinder.com/blog/remove-gps-from-photos](https://metadatafinder.com/blog/remove-gps-from-photos)

---

Every photo from your smartphone contains GPS coordinates embedded in the EXIF data. These coordinates are invisible to the naked eye but readable by anyone with an EXIF viewer in about thirty seconds.

This post covers five practical methods to remove GPS from photos before posting, with a comparison table at the end.

## The Risk in Plain Terms

**GPSLatitude** and **GPSLongitude** in a photo's EXIF data resolve to a street address. No specialized knowledge required — just an EXIF viewer and a map.

The specific risks:

- A photo taken at home reveals the home address
- A photo from a regular location (gym, office, coffee shop) builds a pattern
- Photos shared during travel reveal location in real time
- For journalists: field photos can expose source locations

Platforms vary in what they preserve. Instagram strips most EXIF. GitHub issues attachments often preserve it. You cannot rely on platforms to protect you.

## Method 1: Use metadatafinder.com

The no-install route. Visit [metadatafinder.com](https://metadatafinder.com), drop a photo, see the GPS coordinates displayed, click Scrub → GPS only, download the cleaned file. In-browser, no upload.

## Method 2: MetaScrub CLI

Best for anyone handling more than a few files.

```bash
npm install -g metascrub

# Check what's there
metascrub view photo.jpg

# Strip GPS only
metascrub scrub photo.jpg --preset gps-only

# Batch a folder
metascrub batch ./photos --preset gps-only --out ./photos-clean

# Compare before and after
metascrub compare photo.jpg photo.cleaned.jpg
```

MetaScrub removes all GPS EXIF and XMP fields, leaves camera settings and author fields untouched, and writes a new file rather than modifying in place.

## Method 3: macOS Photos Export

Import → File → Export → uncheck "Include Location Information" → Export.

Note: this re-encodes the JPEG, which is a minor quality hit each time.

## Method 4: Windows File Properties

Right-click → Properties → Details → "Remove Properties and Personal Information" → check the GPS fields → OK.

Modifies in place; duplicate the file first if you want to keep the original.

## Method 5: iPhone Shortcut (iOS 16+)

Create a Shortcut with the "Remove EXIF data" action before sharing. [verify: confirm exact action name and iOS version availability] Or prevent GPS from being written at all: Settings → Privacy → Location Services → Camera → Never.

## Comparison Table

| Method             | OS            | Batch? | Lossless? | Free? |
| ------------------ | ------------- | ------ | --------- | ----- |
| metadatafinder.com | Any (browser) | No     | Yes       | Yes   |
| MetaScrub CLI      | Any (Node)    | Yes    | Yes       | Yes   |
| macOS Photos       | macOS         | No     | No        | Yes   |
| Windows Properties | Windows       | No     | Yes       | Yes   |
| iPhone Shortcut    | iOS           | No     | Yes       | Yes   |

## What Exactly Is Removed

With `--preset gps-only`, MetaScrub removes every GPS-related field in EXIF and XMP: latitude, longitude, altitude, speed, track, direction, timestamp, map datum, DOP. Camera model, exposure data, author name — all preserved.

To strip everything: `--preset all`. To strip only personal info (author, serial, software): `--preset personal-only`.

---

All tools: [metadatafinder.com](https://metadatafinder.com) — MIT licensed, open source.
