# Awesome Python — MetaScrub Submission

## Target list

**Repository:** https://github.com/vinta/awesome-python

**Contributing guide:** https://github.com/vinta/awesome-python/blob/master/CONTRIBUTING.md

**Target section:** Files (look for "Files" or "File Manipulation" — vinta/awesome-python has a "Files" section; also consider "Cryptography and Security" or "Third-party APIs" if the Files section does not exist in the current version)

---

## Submission line

```markdown
- [metascrub](https://github.com/metascrub/metascrub) - Read and strip EXIF, GPS, ID3, XMP, and document metadata from images, audio, video, and documents. Pandas integration included.
```

---

## PR title

```
Add metascrub to Files section — metadata viewer and scrubber
```

## PR body

````markdown
Hi! Adding `metascrub` (Python package) to the Files section.

**What it does:** Python library and CLI for reading and stripping file metadata — EXIF, GPS coordinates, ID3 tags, XMP, IPTC, DOCX properties, PDF Info Dictionary. Supports JPEG, PNG, PDF, DOCX, and MP3 (Python package currently covers 5 core formats; [verify: confirm full Python format count at submission time]).

**Install:** `pip install metascrub`

**Quick example:**

```python
from metascrub import view, scrub

meta = view("photo.jpg")
# {'make': 'Apple', 'model': 'iPhone 15 Pro', 'gps': {'lat': 48.85, 'lon': 2.35}}

clean_bytes = scrub("photo.jpg", preset="gps-only")
```
````

**Pandas integration:**

```python
import pandas as pd
from metascrub import view

df = pd.DataFrame([view(f) for f in files])
```

**License:** MIT
**PyPI:** https://pypi.org/project/metascrub/
**Homepage:** https://metadatafinder.com

Checked the list — no existing entry for a dedicated metadata scrubbing library.

```

---

_Note: vinta/awesome-python is one of the largest awesome-lists on GitHub and has stricter curation. The package should have real PyPI downloads and a solid README before submitting. The pandas integration angle distinguishes it from raw EXIF libraries._
```
