# @metascrub/core

> See and strip metadata from any file.

The TypeScript core library that powers every wrapper in the [MetaScrub](https://metadatafinder.com) toolkit (CLI, browser extension, desktop, mobile, Python port, integrations).

**Online version and docs: [metadatafinder.com](https://metadatafinder.com)**

[![npm version](https://img.shields.io/npm/v/@metascrub/core.svg)](https://npmjs.com/package/@metascrub/core)
[![license](https://img.shields.io/npm/l/@metascrub/core.svg)](LICENSE)

## Install

```bash
npm install @metascrub/core
```

## Quick start

```ts
import { parse, scrub } from '@metascrub/core';
import { readFile, writeFile } from 'node:fs/promises';

// Inspect
const bytes = new Uint8Array(await readFile('photo.jpg'));
const result = await parse({ kind: 'bytes', data: bytes, filename: 'photo.jpg' });

console.log(result.highlights.gps);     // { lat, lon, alt? } if GPS is present
console.log(result.highlights.device);  // { make, model, serial? }
console.log(result.warnings);           // ["GPS coordinates found (40.71, -74.01)", ...]

// Strip
const cleaned = await scrub(
  { kind: 'bytes', data: bytes },
  { preset: 'all' },           // 'all' | 'gps-only' | 'personal-only' | 'keep-technical' | 'custom'
);
await writeFile('photo.clean.jpg', cleaned);
```

## API

### `parse(input): Promise<MetadataResult>`

Returns grouped metadata fields plus a `highlights` object and `warnings` array.

### `scrub(input, options): Promise<Uint8Array>`

Returns scrubbed file bytes. Presets:

| Preset            | What it does                                                            |
| ----------------- | ----------------------------------------------------------------------- |
| `all`             | Removes every metadata field that is safe to strip (orientation kept).  |
| `gps-only`        | Strips GPS coordinates and altitude; keeps everything else.             |
| `personal-only`   | Removes author/owner/software/serial/`lastModifiedBy` and similar.      |
| `keep-technical`  | Keeps camera/exposure/dimensions; drops everything else.                |
| `custom`          | Uses the explicit `keep` / `remove` arrays in `options`.                |

### `compare(a, b): Promise<MetadataDiff>`

Returns `{ onlyInA, onlyInB, changed }`.

### `detectFormat(input): Promise<FileFormat | null>`

### `supportedFormats(): FileFormat[]`

## Supported formats (v0.1)

- JPEG — EXIF, IPTC, XMP, GPS; segment-level scrub preserving orientation and ICC profile.
- PNG — `tEXt`, `zTXt`, `iTXt`, `eXIf`, `tIME` chunks.
- PDF — `/Info` dictionary and XMP metadata stream.
- DOCX — `docProps/core.xml`, `docProps/app.xml`; scrub regenerates rather than deletes (Word will refuse files with missing core).

More formats land in v0.2 — see the [project ROADMAP](https://github.com/metascrub/metascrub/blob/main/ROADMAP.md).

## Privacy

`@metascrub/core` performs all parsing and scrubbing locally on the caller's machine. There is no network access, no telemetry, no analytics. The package has zero side effects on import.

## License

MIT. See [LICENSE](../../LICENSE).
