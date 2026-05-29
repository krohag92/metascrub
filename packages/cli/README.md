# metascrub

> View and strip metadata from images, videos, audio, and documents — from the command line.

Part of the [MetaScrub](https://metadatafinder.com) toolkit. Same logic, same presets, same output as the browser extension, desktop app, and library.

**Web app: [metadatafinder.com](https://metadatafinder.com)**

[![npm version](https://img.shields.io/npm/v/metascrub.svg)](https://npmjs.com/package/metascrub)
[![license](https://img.shields.io/npm/l/metascrub.svg)](LICENSE)

## Install

```bash
npm install -g metascrub
# or use one-off:
npx metascrub view photo.jpg
```

## Commands

```
metascrub view <file>            Print metadata of a file
metascrub scrub <file> [-o out]  Scrub metadata, write cleaned file
metascrub compare <a> <b>        Show metadata diff between two files
metascrub batch <dir> [options]  Process a directory recursively
metascrub formats                List supported formats
```

### `view`

```bash
metascrub view photo.jpg
metascrub view photo.jpg --json
metascrub view photo.jpg --warnings
metascrub view photo.jpg --only EXIF
```

### `scrub`

```bash
# Strip everything (default preset 'all'; orientation preserved)
metascrub scrub photo.jpg

# GPS only
metascrub scrub photo.jpg --preset gps-only

# Author/owner/software/serial only
metascrub scrub photo.jpg --preset personal-only

# Overwrite the original (use with care)
metascrub scrub photo.jpg --in-place

# Custom field list
metascrub scrub photo.jpg --preset custom \
  --remove "EXIF.Artist,EXIF.SerialNumber" \
  --keep "EXIF.Make,EXIF.Model"

# See what would be removed without writing
metascrub scrub photo.jpg --dry-run
```

### `compare`

```bash
metascrub compare original.jpg scrubbed.jpg
metascrub compare original.jpg scrubbed.jpg --json
```

### `batch`

```bash
# Strip GPS from every photo in a folder, recursively, in-place
metascrub batch ./photos --recursive --action scrub --preset gps-only --in-place

# Audit all PDFs in a folder, write a CSV report
metascrub batch ./reports --pattern "*.pdf" --report audit.csv

# Mirror folder structure into a clean copy
metascrub batch ./photos --recursive --action scrub --out-dir ./photos-clean
```

### `formats`

```bash
metascrub formats
metascrub formats --json
```

## Exit codes

| Code | Meaning                          |
| ---- | -------------------------------- |
| 0    | Success                          |
| 1    | One or more files failed         |
| 2    | Invalid arguments                |
| 3    | Unsupported file format          |

## Privacy

`metascrub` runs entirely on your machine. No network access, no telemetry, no analytics.

## License

MIT. See [LICENSE](../../LICENSE).
