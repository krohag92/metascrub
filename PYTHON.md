# Python — `metascrub` PyPI package

A native-Python implementation (preferred) or WASM bridge to `@metascrub/core` (fallback) for the most common formats.

## Decision: native-Python first

For PyPI we use native Python libraries rather than a WASM bridge, because:
- WASM in Python (via wasmtime-py) adds complexity and a non-trivial dependency.
- Native Python libs (`Pillow`, `pypdf`, `python-docx`, `mutagen`, `pymediainfo`) are mature and widely trusted.
- Python users expect a `pip install` to "just work" without WASM runtime quirks.

Trade-off: we duplicate the logic in Python. Acceptable because the metadata semantics are the same — we keep the public API and presets identical to TS core.

## Goals

- `pip install metascrub` → CLI + library.
- API mirrors the TypeScript core.
- Useful in Jupyter notebooks (returns dicts and pandas DataFrames when asked).

## Folder layout

```
python/
├── pyproject.toml
├── src/
│   └── metascrub/
│       ├── __init__.py
│       ├── api.py            # parse(), scrub(), compare(), detect_format()
│       ├── types.py
│       ├── presets.py
│       ├── cli.py            # entry point: python -m metascrub or `metascrub` bin
│       ├── formats/
│       │   ├── __init__.py   # registry
│       │   ├── jpeg.py       # Pillow + piexif
│       │   ├── png.py
│       │   ├── pdf.py        # pypdf
│       │   ├── docx.py       # python-docx + zipfile
│       │   ├── mp3.py        # mutagen
│       │   ├── mp4.py        # pymediainfo + mutagen for tags
│       │   └── ...
│       └── utils/
│           ├── bytes.py
│           ├── magic.py
│           └── highlights.py
├── tests/
│   ├── fixtures/             # mirror the TS fixtures
│   └── test_*.py
└── README.md
```

## pyproject.toml

```toml
[project]
name = "metascrub"
version = "0.1.0"
description = "View and strip metadata from images, videos, audio, and documents. Python port of the metadatafinder.com toolkit."
license = { text = "MIT" }
readme = "README.md"
authors = [{ name = "metadatafinder.com" }]
requires-python = ">=3.9"
keywords = ["metadata", "exif", "iptc", "xmp", "gps", "privacy", "scrub", "pdf", "docx"]
dependencies = [
  "Pillow>=10.0",
  "piexif>=1.1",
  "pypdf>=4.0",
  "python-docx>=1.0",
  "mutagen>=1.47",
  "click>=8.1",
]

[project.urls]
Homepage = "https://metadatafinder.com"
Repository = "https://github.com/metascrub/metascrub"
Documentation = "https://metadatafinder.com/docs/python"

[project.scripts]
metascrub = "metascrub.cli:main"

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"
```

## Public API

```python
from metascrub import parse, scrub, compare, detect_format

# parse
result = parse("photo.jpg")
# or
with open("photo.jpg", "rb") as f:
    result = parse(f.read(), filename="photo.jpg")

print(result.format)         # "jpeg"
print(result.highlights.gps) # (40.7128, -74.0060) or None
print(result.warnings)       # ["GPS coordinates found", ...]
for group_name, fields in result.groups.items():
    for field in fields:
        print(group_name, field.key, field.value)

# scrub
clean_bytes = scrub("photo.jpg", preset="gps-only")
with open("photo.clean.jpg", "wb") as f:
    f.write(clean_bytes)

# compare
diff = compare("a.jpg", "b.jpg")
print(diff.only_in_a, diff.only_in_b, diff.changed)
```

Use Python dataclasses for return types. `MetadataResult.to_dict()` for JSON-friendly output.

## CLI (mirrors TS CLI)

```
metascrub view <file>
metascrub scrub <file> [-o out] [--preset all|gps-only|personal-only|keep-technical]
metascrub compare <a> <b>
metascrub batch <dir> [...]
```

Implement with `click`.

## Parity testing

Run the same fixture files through TS core and Python core. Assert equal `highlights` and warnings. Test harness:

```
tests/parity/
├── run_parity.py            # generates JSON from Python parse
├── run_parity.ts            # generates JSON from TS parse
└── compare.py               # diffs both JSON outputs
```

CI runs both, fails if they diverge on tracked fields. (Document expected diffs for fields where Python lib reports differently — e.g. floating point precision.)

## Pandas integration (nice-to-have)

```python
import pandas as pd
from metascrub import batch_view

df = batch_view("./photos", as_dataframe=True)
# columns: filename, format, captured_at, gps_lat, gps_lon, author, warnings_count, ...
```

This is a draw for data-science users and SEO folks doing audits.

## Distribution

- **PyPI**: `python -m build && twine upload dist/*`
- **conda-forge**: submit recipe after PyPI launch (high-DR backlink).
- **Docker Hub**: include Python flavor in the Docker image too.

## README

- `pip install metascrub`
- Quick example (parse + scrub)
- Link: "Web version: https://metadatafinder.com"
- Link: "JS / TS version: `npm install @metascrub/core`"
- Badges: PyPI version, Python versions supported, downloads, license
- License: MIT

## License compatibility

Verify each Python dep before adding:
- Pillow — HPND (MIT-compatible)
- piexif — MIT
- pypdf — BSD-3-Clause
- python-docx — MIT
- mutagen — GPL-2.0+ → **conflict with our MIT license**. Replace with `tinytag` (MIT) for read-only audio metadata, or implement a small ID3 parser ourselves for the fields we care about. Decide in implementation.
- click — BSD-3-Clause
