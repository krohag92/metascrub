# @metascrub/core

The TypeScript library that powers every wrapper. Pure logic, zero UI, no Node-specific code in the browser bundle.

## Goals

- One source of truth for parsing and scrubbing metadata.
- Works in Node 18+, Bun, Deno, browsers, Cloudflare Workers, React Native.
- Zero side effects on import (no global state, no FS reads at startup).
- Streams when possible, falls back to in-memory `Uint8Array`.

## Folder layout

```
packages/core/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts              # public API exports
│   ├── types.ts              # all exported types
│   ├── parse.ts              # top-level parse() dispatcher
│   ├── scrub.ts              # top-level scrub() dispatcher
│   ├── compare.ts            # diff utility
│   ├── detect.ts             # detectFormat()
│   ├── presets.ts            # ScrubOptions presets resolution
│   ├── formats/
│   │   ├── index.ts          # registry
│   │   ├── jpeg.ts
│   │   ├── ...
│   ├── utils/
│   │   ├── bytes.ts          # FileInput → Uint8Array
│   │   ├── magic.ts          # magic-number detection
│   │   └── highlights.ts     # build highlights{} from groups{}
│   └── env.ts                # env detection (node vs browser)
├── test/
│   ├── fixtures/
│   │   ├── jpeg/
│   │   │   ├── canon-with-gps.jpg
│   │   │   ├── no-metadata.jpg
│   │   │   └── ...
│   │   ├── pdf/
│   │   ├── docx/
│   │   └── ...
│   └── *.test.ts
└── README.md
```

## package.json

```json
{
  "name": "@metascrub/core",
  "version": "0.1.0",
  "description": "Parse and scrub metadata from images, videos, audio, and documents.",
  "license": "MIT",
  "homepage": "https://metadatafinder.com",
  "repository": "github:metascrub/metascrub",
  "type": "module",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    },
    "./browser": {
      "import": "./dist/browser.mjs",
      "types": "./dist/index.d.ts"
    }
  },
  "files": ["dist", "README.md"],
  "scripts": {
    "build": "tsup",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "keywords": [
    "metadata", "exif", "iptc", "xmp", "gps",
    "privacy", "scrub", "strip", "pdf", "docx",
    "image", "photo", "metadatafinder"
  ]
}
```

## Public API surface

```typescript
// packages/core/src/index.ts
export { parse } from './parse.js';
export { scrub } from './scrub.js';
export { compare } from './compare.js';
export { detectFormat, supportedFormats } from './detect.js';
export type {
  FileInput, FileFormat,
  MetadataResult, MetadataField, MetadataDiff,
  ScrubOptions
} from './types.js';
```

## Implementation order (for Claude Code)

Build in this order so we always have a shippable subset:

1. **Skeleton + types** (`src/types.ts`, `src/index.ts`, format registry).
2. **JPEG** — most common, fixture available, validates the whole pipeline.
3. **PNG**.
4. **PDF** — high-impact for journalism/legal use-cases.
5. **DOCX** — same.
6. **HEIC + WebP + AVIF + TIFF + RAW** — images batch.
7. **MP3 + FLAC** — audio batch.
8. **MP4 + MOV + MKV** — video batch.
9. **XLSX + PPTX + EPUB** — Office/EPUB batch.
10. **SVG**.

For each format the steps are:
1. Add fixture(s) under `test/fixtures/<format>/`.
2. Write `parse()` returning `MetadataResult`.
3. Write `scrub()` returning clean `Uint8Array`.
4. Write parse → scrub → parse round-trip test.
5. Register parser in `formats/index.ts`.

## Scrub presets (in `src/presets.ts`)

```typescript
const PRESETS = {
  'all': {
    description: 'Remove every metadata field that is safe to strip.',
    // Implementation per-format: keep only structurally required fields.
  },
  'gps-only': {
    description: 'Remove GPS coordinates only; keep everything else.',
    remove: ['EXIF.GPS*', 'XMP.geo*'],
  },
  'personal-only': {
    description: 'Remove author/owner/software/serial/edits.',
    remove: [
      'EXIF.Artist', 'EXIF.Copyright', 'EXIF.OwnerName',
      'EXIF.SerialNumber', 'EXIF.LensSerialNumber',
      'EXIF.Software', 'EXIF.HostComputer',
      'IPTC.By-line', 'IPTC.Credit',
      'XMP.creator', 'XMP.rights',
      'PDF.Info.Author', 'PDF.Info.Producer',
      'DOCX.core.creator', 'DOCX.core.lastModifiedBy',
      'DOCX.app.Company', 'DOCX.app.Manager',
    ],
  },
  'keep-technical': {
    description: 'Keep camera/exposure/dimensions; drop everything else.',
    keep: [
      'EXIF.Make', 'EXIF.Model', 'EXIF.LensModel',
      'EXIF.ExposureTime', 'EXIF.FNumber', 'EXIF.ISO',
      'EXIF.FocalLength', 'EXIF.ColorSpace',
      'EXIF.PixelXDimension', 'EXIF.PixelYDimension',
      'EXIF.Orientation',
    ],
  },
};
```

## Warnings logic (`src/utils/highlights.ts`)

After parsing, generate user-facing warnings for fields that often leak:

- GPS present → "GPS coordinates found".
- `Artist`, `OwnerName`, `LensSerialNumber` non-empty → "Personal info found: {field}".
- DOCX `lastModifiedBy` differs from `creator` → "File was edited by another user".
- DOCX has revision history → "Tracked changes / revisions present".
- PDF `Producer` mentions known editing software (Acrobat, Word, etc.) → "Edited in {software}".

This drives the UX in wrappers — Chrome extension highlights warnings in red, CLI prints them at the end of `metascrub view`.

## Streaming and large files

For files > 100MB:
- In Node: accept `path` and stream.
- In browser: accept `File` (Blob) and slice for headers; only load full file when scrubbing.

Decision: implement non-streaming first, add streaming for MP4/MKV in v0.2.

## Error handling

```typescript
class MetaScrubError extends Error {
  code: 'UNSUPPORTED_FORMAT' | 'CORRUPT_FILE' | 'PARSE_ERROR' | 'SCRUB_ERROR';
  format?: FileFormat;
  cause?: unknown;
}
```

Throw on unrecoverable errors, surface partial results when possible via `warnings`.

## What to ask the user / what to assume

If anything is ambiguous when implementing a format, ask before guessing. Default decisions:
- Always preserve EXIF orientation when scrubbing (rotating a photo by stripping orientation is a bug).
- Always preserve color profile (ICC) unless the user explicitly opts to strip it.
- For DOCX: when scrubbing, REGENERATE `docProps/core.xml` with empty author/lastModifiedBy rather than deleting the file (Word complains if it's missing).

## Documentation

`README.md` must include:
- Install: `npm install @metascrub/core`
- Quick example for `parse()` and `scrub()`
- Link: "Online version and docs: https://metadatafinder.com"
- License: MIT
- Badge row: npm version, downloads, license, Hugging Face Space link (later)
