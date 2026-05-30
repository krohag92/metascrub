---
title: 'How to Remove GPS from Photos Before Posting Online'
slug: remove-gps-from-photos
target_keyword: 'remove GPS from photos before posting'
description: 'Step-by-step guide to stripping GPS coordinates from photos before you upload them. Four methods compared: online tool, macOS, Windows, and CLI.'
published: false
canonical: https://metadatafinder.com/blog/remove-gps-from-photos
---

# How to Remove GPS from Photos Before Posting Online

Your phone takes a photo. Embedded inside it, invisible to anyone just looking at the image, is a precise GPS fix — latitude, longitude, altitude, and in some cases compass bearing — accurate to within a few meters. You post the photo to a forum, send it in an email, or upload it to a portfolio site. The coordinates go with it.

This guide explains why GPS in photos is a concrete risk (not an abstract one), then walks through four methods to remove GPS from photos before posting: an online tool that needs no install, built-in options on macOS and Windows, an iPhone Shortcut, and the MetaScrub CLI for anyone who needs to handle batches or automate the step.

---

## Why GPS in Photos Is a Real Problem

Latitude and longitude embedded in a JPEG will resolve to a physical address in seconds. Any EXIF viewer — including the free one at **https://metadatafinder.com** — can extract those coordinates and link them to a map. The technical barrier is near zero.

### Social-engineering attacks

The concern is not that someone will run a scraper across all public images and cross-reference GPS data at scale (though this is technically possible). The more common threat is targeted: a stalker, an abusive ex-partner, a fraudster, or an investigative adversary who looks at a photo you posted and wants to know where you are or where you live.

Photos posted from home — of a new piece of furniture, a pet, a meal — frequently contain GPS coordinates that point directly at a home address. A photo taken at a regular gym or coffee shop creates a pattern. A photo from a hotel during travel gives away your location in real time.

None of these scenarios require sophisticated attackers. They require only someone with a motive and thirty seconds with an EXIF viewer.

### Professional contexts

Beyond individual privacy, GPS in photos creates institutional problems:

- Lawyers sharing photos as evidence may inadvertently disclose where photos were taken.
- Journalists protecting source locations embed GPS in their field photos.
- Corporate photographers posting product photos may reveal manufacturing or warehouse locations.
- Real estate agents posting interior photos can confirm an address to within a few meters — useful for burglars doing reconnaissance.

### Platforms that preserve EXIF

Many platforms strip EXIF data when you upload. Instagram does. Twitter/X does. But many do not: forums, Dropbox shared links, Google Drive shared files, email attachments, Slack files, GitHub issues (images attached to GitHub issues commonly preserve EXIF), and many portfolio platforms.

You cannot always know the policy in advance. The safe approach is to strip GPS before sharing rather than trusting each platform to do it.

---

## Method 1: Use metadatafinder.com (Online, No Install)

The fastest option for single files is the web tool at **https://metadatafinder.com**.

1. Visit https://metadatafinder.com.
2. Drop your photo into the browser window.
3. The tool displays all metadata, including GPS if present.
4. Click "Scrub" and choose "GPS only" to remove just the location fields.
5. Download the cleaned file.

Everything happens in your browser — no file is sent to any server. This works on any OS and any device with a browser.

**Best for:** One-off files, quick checks before posting, or when you are on a machine where you cannot install software.

---

## Method 2: macOS — Remove GPS via Preview or Image Capture

macOS does not offer a one-click "remove all EXIF" option in the Finder, but there are a few built-in routes.

### Using Photos app

1. Import the photo into Photos.
2. Select it and choose **File → Export → Export 1 Photo**.
3. In the export dialog, uncheck **Include Location Information**.
4. Export. The exported file will not contain GPS data.

Note: the file exported from Photos is re-encoded, which means this is not lossless for JPEGs.

### Using Image Capture (for connected devices)

Image Capture does not strip metadata — skip it for this purpose.

### Third-party: ImageOptim

ImageOptim (free, open source) can strip EXIF when saving. Enable **Strip EXIF** in preferences. It handles batches and is lossless for JPEG.

**Best for:** Mac users, infrequent use, comfortable using the Photos app.

---

## Method 3: Windows — Remove GPS via File Properties

Windows 10 and 11 have a built-in property eraser.

1. Right-click the photo in File Explorer.
2. Select **Properties → Details** tab.
3. At the bottom of the Details tab: **Remove Properties and Personal Information**.
4. A dialog appears. Select **Remove the following properties from this file**.
5. Check **GPS latitude**, **GPS longitude**, and any other GPS fields.
6. Click OK.

This modifies the file in place. The operation is not logged, and there is no undo via this dialog (so duplicate the file first if you want to keep the original).

**Limitation:** Windows removes the specific fields you check, but does not guarantee it catches every GPS-related field in extended EXIF or XMP. For thorough stripping, prefer a dedicated tool.

**Best for:** Windows users, one or a few files at a time.

---

## Method 4: iPhone — Remove GPS Before Sharing

The cleanest mobile approach is to prevent GPS from being written in the first place.

**Disable location for Camera app:**

1. Go to **Settings → Privacy & Security → Location Services**.
2. Scroll down to **Camera**.
3. Set to **Never**.

GPS will no longer be embedded in photos from that point forward.

**Strip GPS at share time with a Shortcut:**
If you want to keep GPS in your library but strip it when sharing:

1. Open the Shortcuts app.
2. Create a Shortcut with actions: **Get Photos from Input → Remove EXIF data** (available as a Shortcut action on iOS 16+). [verify: confirm the exact name and availability of the "Remove EXIF data" Shortcuts action on iOS 16 and later; Apple's Shortcuts documentation should confirm this]
3. Add **Share** at the end.
4. Run the Shortcut before posting a sensitive photo.

**Best for:** Mobile users who want GPS stripped before sharing from their phone.

---

## Method 5: MetaScrub CLI — For Batches and Automation

If you have more than a handful of photos to clean, or if you want to integrate GPS stripping into a workflow, the MetaScrub CLI is the most practical option.

### Install

```bash
npm install -g metascrub
```

### Inspect a file first

```bash
metascrub view photo.jpg
```

This shows you what GPS fields are present before you strip anything.

### Strip GPS only from a single file

```bash
metascrub scrub photo.jpg --preset gps-only
```

By default, this writes a new file alongside the original: `photo.cleaned.jpg`. Pass `--overwrite` to replace in place (careful — no undo).

### Strip GPS from an entire folder

```bash
metascrub batch ./photos --preset gps-only --out ./photos-clean
```

MetaScrub processes every supported image format in the folder and writes cleaned copies to `./photos-clean`, preserving filenames. A summary is printed at the end: how many files were processed, how many had GPS, how many were already clean.

### Verify the result

```bash
metascrub view photo.cleaned.jpg
```

Or compare before and after:

```bash
metascrub compare photo.jpg photo.cleaned.jpg
```

The compare output shows exactly which fields were removed and which were preserved.

**Best for:** Photographers with folders of client images, developers automating a pipeline, CI environments where outgoing photos need to be checked before deployment.

---

## Method Comparison Table

| Method                  | OS         | Batch? | Lossless?       | GPS only?    | Free? |
| ----------------------- | ---------- | ------ | --------------- | ------------ | ----- |
| metadatafinder.com      | Any        | No     | Yes             | Yes          | Yes   |
| macOS Photos export     | macOS      | No     | No (re-encoded) | Yes          | Yes   |
| Windows File Properties | Windows    | No     | Yes             | Yes (manual) | Yes   |
| iPhone Shortcut         | iOS        | No     | Yes             | Yes          | Yes   |
| MetaScrub CLI           | Any (Node) | Yes    | Yes             | Yes          | Yes   |

**Lossless** means the pixel data of the image is not re-compressed. Re-encoding a JPEG loses some image quality each time.

---

## What MetaScrub's GPS-Only Preset Removes

When you run `--preset gps-only`, MetaScrub targets the following fields across EXIF and XMP:

- `GPSLatitude`, `GPSLatitudeRef`
- `GPSLongitude`, `GPSLongitudeRef`
- `GPSAltitude`, `GPSAltitudeRef`
- `GPSSpeed`, `GPSSpeedRef`
- `GPSTrack`, `GPSTrackRef`
- `GPSImgDirection`, `GPSImgDirectionRef`
- `GPSDateStamp`, `GPSTimeStamp`
- `GPSMapDatum`
- `GPSDOP` (dilution of precision)
- `XMP:GPSLatitude`, `XMP:GPSLongitude`

Everything else — camera model, capture settings, software, date — is left intact. If you want to strip all of that too, use `--preset all`. If you want to strip only personal info fields (author name, serial numbers, software) without touching capture data, use `--preset personal-only`.

---

## Privacy First: What MetaScrub Does Not Do

MetaScrub processes files locally. If you use the CLI or the desktop app, no file data, no metadata, and no coordinates are ever sent to a server. If you use the web tool at https://metadatafinder.com, the processing happens in your browser using WebAssembly — the file stays on your machine.

The extension similarly processes files in the browser context. Full privacy policy at https://metadatafinder.com/extension/privacy.

---

## Next Steps

- **Check any photo right now:** https://metadatafinder.com
- **Install the CLI for batch processing:** `npm install -g metascrub`
- **Install the browser extension:** available for Chrome, Firefox, Edge, and Opera — links at https://metadatafinder.com
- **Learn what else is in your files:** [What Is EXIF Data?](https://metadatafinder.com/blog/what-is-exif-data)
- **Strip PDF metadata:** [How to Strip Metadata from a PDF](https://metadatafinder.com/blog/strip-pdf-metadata)

---

_MetaScrub — See and strip metadata from any file. Open source, MIT license. https://metadatafinder.com_
