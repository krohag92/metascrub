---
description: Verify every package README has the required metadatafinder.com link
---

Run a brand consistency check across all packages.

For each `README.md` in:
- root
- `packages/*/README.md`
- `python/README.md`
- `wordpress/README.md`
- `docker/README.md`

Check that the file contains:
1. The string `metadatafinder.com` (as a link or plain mention)
2. The product name "MetaScrub" (exact casing)
3. A license section
4. An install instruction

For each `package.json` and `pyproject.toml`:
1. `homepage` field equals `https://metadatafinder.com`
2. License field matches the package's expected license (MIT, except GPL-2.0+ for wordpress/)

Produce a table of findings and propose fixes. Do not auto-fix without showing the diff first.
