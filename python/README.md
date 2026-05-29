# metascrub

**See and strip metadata from any file** — Python native implementation.

[![PyPI version](https://badge.fury.io/py/metascrub.svg)](https://badge.fury.io/py/metascrub)
[![Python versions](https://img.shields.io/pypi/pyversions/metascrub.svg)](https://pypi.org/project/metascrub/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Web version and full docs: **https://metadatafinder.com**

JS / TypeScript version: `npm install @metascrub/core`

---

## Install

```bash
pip install metascrub
```

## Quick start

```python
from metascrub import parse, scrub, compare, detect_format

# Parse metadata from a file
result = parse("photo.jpg")

print(result.format)              # "jpeg"
print(result.highlights.gps)     # GPSCoords(lat=37.7749, lon=-122.4194) or None
print(result.warnings)           # ["GPS coordinates found (37.7749, -122.4194)", ...]

for group_name, fields in result.groups.items():
    for field in fields:
        print(f"{group_name}.{field.key} = {field.value}")

# Scrub GPS only
clean = scrub("photo.jpg", preset="gps-only")
with open("photo.clean.jpg", "wb") as f:
    f.write(clean)

# Scrub all metadata
clean_all = scrub("photo.jpg", preset="all")

# Compare two files
diff = compare("original.jpg", "scrubbed.jpg")
print(diff.only_in_a)   # fields only in original
print(diff.only_in_b)   # fields only in scrubbed
print(diff.changed)     # fields that changed

# Detect format
fmt = detect_format("photo.jpg")   # "jpeg"
```

## CLI

```bash
# View metadata
metascrub view photo.jpg

# Scrub all metadata (save to photo.clean.jpg)
metascrub scrub photo.jpg -o photo.clean.jpg

# Scrub GPS only
metascrub scrub photo.jpg --preset gps-only -o photo.nogps.jpg

# Compare two files
metascrub compare original.jpg scrubbed.jpg

# Batch process a directory
metascrub batch ./photos/

# List supported formats
metascrub formats

# JSON output
metascrub view photo.jpg --json
```

## Pandas integration

```python
from metascrub import batch_view

df = batch_view("./photos", as_dataframe=True)
# columns: filename, format, captured_at, gps_lat, gps_lon, author, warnings_count, ...
print(df.head())
```

Requires `pip install "metascrub[pandas]"`.

## Supported formats (v0.1)

| Format | Extensions | Parse | Scrub |
|--------|-----------|-------|-------|
| JPEG   | .jpg, .jpeg | Yes  | Yes   |
| PNG    | .png        | Yes  | Yes   |
| PDF    | .pdf        | Yes  | Yes   |
| DOCX   | .docx       | Yes  | Yes   |
| MP3    | .mp3        | Yes  | Yes   |

## Scrub presets

| Preset | Description |
|--------|-------------|
| `all` | Remove every metadata field that is safe to strip (default) |
| `gps-only` | Remove GPS coordinates only; keep everything else |
| `personal-only` | Remove author/owner/software/serial/edit-history fields |
| `keep-technical` | Keep camera/exposure/dimensions; drop everything else |

## Type mapping (TS core → Python)

| TypeScript | Python |
|-----------|--------|
| `MetadataResult` | `MetadataResult` dataclass |
| `MetadataField` | `MetadataField` dataclass |
| `MetadataHighlights` | `MetadataHighlights` dataclass |
| `MetadataDiff` | `MetadataDiff` dataclass |
| `sizeBytes` | `size_bytes` |
| `capturedAt` | `captured_at` |
| `lastModifiedBy` | `last_modified_by` |
| `revisionHistory` | `revision_history` |
| `onlyInA` | `only_in_a` |
| `onlyInB` | `only_in_b` |

## Privacy

All processing is done locally. No data is sent anywhere.
See: https://metadatafinder.com/extension/privacy

## License

MIT — see [LICENSE](LICENSE).

MetaScrub is part of [metadatafinder.com](https://metadatafinder.com) — the metadata toolkit.
