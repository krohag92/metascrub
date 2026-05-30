# Awesome CLI Apps — MetaScrub Submission

## Target list

**Repository:** https://github.com/agarrharr/awesome-cli-apps

**Contributing guide:** https://github.com/agarrharr/awesome-cli-apps/blob/master/contributing.md

**Target section:** Files and Directories (or Privacy / Security — check which section exists in the current README before submitting)

---

## Submission line

```markdown
- [metascrub](https://github.com/metascrub/metascrub) - View and strip EXIF, GPS, and document metadata from images, audio, video, and documents. 25 formats.
```

---

## PR title

```
Add metascrub — metadata viewer and scrubber CLI
```

## PR body

```markdown
Hi! Adding `metascrub` to the Files / Privacy section.

**What it does:** Reads and strips hidden metadata (EXIF, GPS, ID3, XMP, IPTC, DOCX properties, PDF info) from files. Supports 25 formats: JPEG, PNG, HEIC, WebP, AVIF, TIFF, RAW, MP3, FLAC, M4A, OGG, WAV, MP4, MOV, MKV, WebM, PDF, DOCX, XLSX, PPTX, EPUB, SVG.

**Install:** `npm install -g metascrub`

**Usage:**
```

metascrub view photo.jpg # show all metadata
metascrub scrub photo.jpg # strip all metadata
metascrub scrub --gps-only photo.jpg
metascrub compare before.jpg after.jpg
metascrub batch --dir ./photos

```

**License:** MIT
**Homepage:** https://metadatafinder.com
**NPM:** https://www.npmjs.com/package/metascrub

I checked the list and did not find an existing entry for metascrub or a substantially equivalent tool. ExifTool is not currently listed either; if there is a policy against adding metadata tools, happy to discuss.
```

---

_Note: Check the current section structure of the list before submitting — the maintainer agarrharr reorganizes sections periodically. As of last check the relevant section is "Files and Directories"._
