---
canonical: https://metadatafinder.com/blog/what-is-exif-data
title: 'What Is EXIF Data? The Hidden Information Inside Every Photo'
subtitle: "Your photos know where you were. Here's what that means."
tags: [privacy, technology, photography, security]
published: false
---

> This article was originally published at [metadatafinder.com](https://metadatafinder.com/blog/what-is-exif-data).

---

There is a second version of every photo you take. The one you see is the image. The one you don't see is called **EXIF data**, and it has been quietly tagging your photos with your GPS location, your device's serial number, and your name for decades.

Most people don't know it's there.

---

## The short version

EXIF data is a block of structured information embedded inside image files. Your camera or phone writes it automatically when you take a photo. It contains things like:

- The camera or phone model you used
- The date and time of the photo
- Your GPS location at the time — if location services were on
- Your name, if you configured it in the camera settings
- The software that last edited the photo

When you share that photo — post it to a forum, email it, attach it to a message — all of that travels along.

---

## Why it matters

Most of the time, EXIF data is harmless. The troubling cases are specific:

**Home address.** A photo taken at home, shared online, contains coordinates that resolve to your street address in seconds with any map tool. Someone with a reason to find you can do that without knowing anything about you technically — they just need your photo and a browser.

**Identity.** Camera serial numbers are tied to purchase records and warranty registrations. A photo that was supposed to be anonymous can be traced to a specific camera, and from there to a specific owner.

**Work history.** Photos edited in Adobe Lightroom often carry XMP data containing the original file path on your computer, a history of every edit, and identifiers tied to your Adobe account.

---

## Who's been burned by this

In 2012, Vice journalists published photos of John McAfee, who was a wanted man at the time. The photos contained GPS coordinates. [verify: multiple news reports confirm GPS EXIF data in the Vice photos led to location disclosure — check the exact sequence and confirm details before citing without hedge] Those coordinates were found by readers within hours. The location was published and McAfee was found.

Document metadata has caused similar incidents. In 2003, a British government dossier presented to justify the Iraq War was found to have been compiled from other sources — the Word document's revision history and metadata revealed the editing chain. [verify: the Blair dossier metadata incident is widely reported; confirm that revision history analysis was specifically what revealed the sourcing from al-Marashi's paper]

---

## Related standards: IPTC, XMP, ID3

EXIF is the most widely known standard but not the only one. Files can carry several simultaneously:

**IPTC** — a press-industry standard from the 1990s for embedding captions, bylines, and keywords in images. Mostly intentional when used; worth knowing about.

**XMP** — Adobe's XML-based system that can live inside any file format. More flexible and more detailed than EXIF. Lightroom and Photoshop write extensive XMP data automatically.

**ID3** — the tagging standard for MP3 files. Stores artist, album, track, year, lyrics, and sometimes geolocation data.

---

## Three ways to check your own files

**Free, no download:** Visit [metadatafinder.com](https://metadatafinder.com) and drop a file. You will see every metadata field in the file, including GPS. Nothing is uploaded — it all runs in your browser.

**Command line:**

```bash
npm install -g metascrub
metascrub view photo.jpg
# Shows all EXIF, GPS, XMP data

metascrub scrub photo.jpg --preset gps-only
# Removes GPS, keeps everything else
```

**Browser extension:** The MetaScrub extension adds a "View metadata" option when you right-click any image on any web page. Available for Chrome, Firefox, Edge, and Opera at [metadatafinder.com](https://metadatafinder.com).

---

## One thing to not strip

The EXIF `Orientation` tag tells software which way the photo is right-side-up. Remove it and a portrait photo displays sideways. MetaScrub's cleaning presets are careful to preserve this. If you want to verify what was and wasn't changed, run `metascrub compare original.jpg cleaned.jpg`.

---

The issue isn't complicated, and the fix takes less than a minute. The only requirement is knowing the problem exists.

[Check your files at metadatafinder.com](https://metadatafinder.com)
