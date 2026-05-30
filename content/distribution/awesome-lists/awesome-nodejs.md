# Awesome Node.js — MetaScrub Submission

## Target list

**Repository:** https://github.com/sindresorhus/awesome-nodejs

**Contributing guide:** https://github.com/sindresorhus/awesome-nodejs/blob/main/contributing.md

**Target section:** Files and Parsing (look for "Parsing" or "Files" — the list uses a "Parsing" section for format-specific libraries; alternatively "File System" for file-handling utilities)

---

## Submission line

```markdown
- [@metascrub/core](https://github.com/metascrub/metascrub) - Read and strip metadata (EXIF, GPS, ID3, XMP, DOCX properties, PDF info) from 25 file formats.
```

---

## PR title

```
Add @metascrub/core to Parsing section
```

## PR body

````markdown
Hi! Adding `@metascrub/core` to the Parsing section.

**What it does:** TypeScript library for reading and stripping file metadata. Parses EXIF, IPTC, XMP, GPS coordinates, ID3 tags, PDF Info Dictionary + XMP stream, DOCX core/app/custom properties, and video container metadata. Supports 25 formats.

**Install:** `npm install @metascrub/core`

**Quick example:**

```js
import { view, scrub } from '@metascrub/core';

const meta = await view(buffer, 'image/jpeg');
// { make: 'Apple', model: 'iPhone 15 Pro', gps: { lat: 48.85, lon: 2.35 }, ... }

const clean = await scrub(buffer, 'image/jpeg', 'gps-only');
// Returns new buffer with GPS stripped, other metadata intact
```
````

**License:** MIT
**NPM:** https://www.npmjs.com/package/@metascrub/core
**Homepage:** https://metadatafinder.com

The package runs in Node 18+, Bun, Deno, browsers, Cloudflare Workers, and React Native. Zero side effects on import.

Checked the contributing guide — the package has >10 GitHub stars [verify: confirm star count at submission time] and is actively maintained.

```

---

_Note: sindresorhus/awesome-nodejs has strict quality criteria — the package must have a meaningful number of GitHub stars and a solid README. Confirm the repo's star count and README quality before submitting. The contributing guide explicitly requires an existing user base._
```
