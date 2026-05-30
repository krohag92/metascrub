---
canonical: https://metadatafinder.com/blog/remove-gps-from-photos
title: 'Remove GPS from Your Photos Before You Post Them'
subtitle: "Your phone knows exactly where you were. Here's how to stop it from telling everyone."
tags: [privacy, photography, technology, security]
published: false
---

> Originally published at [metadatafinder.com](https://metadatafinder.com/blog/remove-gps-from-photos)

---

Your smartphone's camera is a remarkably accurate GPS receiver. Every photo it takes carries the latitude and longitude of where you were standing when you took it, embedded invisibly in the file. That data travels when you share the photo — unless you remove it first.

Most people don't remove it, because most people don't know it's there.

---

## The scenario that matters

Imagine you post a photo to a local parents' Facebook group — your child's birthday party, taken at home. Someone in that group downloads the photo and opens it in an EXIF viewer. (This takes about 30 seconds and requires only a browser at [metadatafinder.com](https://metadatafinder.com).) The GPS data in the EXIF resolves to your street address.

This is not a sophisticated attack. It requires no programming knowledge. It requires only that the person have access to the photo and know that EXIF data exists.

The same scenario applies to: photos posted from shelters or safe houses, photos journalists take in the field, photos shared by activists, product photos that reveal a warehouse location, real estate photos that confirm an address before a crime.

---

## Platforms are inconsistent

Instagram strips EXIF. Twitter/X strips EXIF. But GitHub issue attachments often preserve it. Email attachments preserve it. Forums preserve it. Slack files preserve it. Cloud storage shared links often preserve it.

You cannot know in advance what any given platform will do with your file's metadata.

---

## Four ways to remove it

**In a browser, no install required:**

Go to [metadatafinder.com](https://metadatafinder.com). Drop your photo. See the GPS coordinates. Click Scrub, choose "GPS only," download the cleaned photo. Done in under a minute, and nothing ever left your browser.

**Via command line (fast for batches):**

```bash
npm install -g metascrub
metascrub scrub photo.jpg --preset gps-only
# Entire folder:
metascrub batch ./photos --preset gps-only --out ./photos-clean
```

**On a Mac:**

Open Photos, import the photo, then export via File → Export → Export 1 Photo, and uncheck "Include Location Information."

**On Windows:**

Right-click the file → Properties → Details → "Remove Properties and Personal Information" → check the GPS fields.

---

## The simplest long-term fix

Disable GPS for your camera app entirely:

- **iPhone:** Settings → Privacy & Security → Location Services → Camera → Never
- **Android:** Open Camera → Settings → turn off location tagging

You will still have GPS in the photo in your camera roll if you want to use location-based photo search later. But photos you share will be clean.

---

Check any file — free, in-browser, no signup: [metadatafinder.com](https://metadatafinder.com)
