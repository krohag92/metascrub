# Architecture

## Monorepo

Use **pnpm workspaces** + **Turborepo** for the TypeScript side.

```
metascrub/
├── package.json              # workspace root
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.base.json
├── packages/
│   ├── core/                 # @metascrub/core
│   ├── cli/                  # metascrub (NPM bin)
│   ├── extension/            # browser extension
│   ├── vscode/               # VS Code extension
│   ├── obsidian/             # Obsidian plugin
│   ├── raycast/              # Raycast extension
│   ├── n8n-node/             # n8n-nodes-metascrub
│   ├── mobile/               # Capacitor app
│   └── desktop/              # Tauri app
├── python/                   # PyPI package (separate, not in pnpm workspace)
├── wordpress/                # PHP plugin (separate)
└── docker/
```

## Tech stack

- **Language**: TypeScript everywhere on JS side.
- **Bundler**: tsup for libraries, Vite for extension UI, esbuild for VS Code.
- **WASM**: build core to WASM via wasm-bindgen if we need it in Python or for performance — but start with pure TS.
- **Mobile**: Capacitor (one codebase for iOS + Android using web UI).
- **Desktop**: Tauri (Rust shell, web UI, calls into core via Node sidecar or WASM).
- **Python wrapper**: native Python rewrite for the most common formats (PIL/Pillow + pypdf + python-docx + mutagen) OR FFI to WASM. Decision in PYTHON.md.

## Core library (`@metascrub/core`)

This is the brain. Every other package imports from here.

### Public API

```typescript
// Parse metadata from a file
export async function parse(input: FileInput): Promise<MetadataResult>;

// Scrub metadata from a file, return new file bytes
export async function scrub(
  input: FileInput,
  options: ScrubOptions
): Promise<Uint8Array>;

// Compare metadata between two files
export async function compare(
  a: FileInput,
  b: FileInput
): Promise<MetadataDiff>;

// Detect file format from bytes/extension
export function detectFormat(input: FileInput): FileFormat | null;

// List what formats are supported
export function supportedFormats(): FileFormat[];
```

### Types

```typescript
type FileInput =
  | { kind: 'bytes'; data: Uint8Array; filename?: string }
  | { kind: 'path'; path: string }              // Node only
  | { kind: 'stream'; stream: ReadableStream }; // future

type FileFormat =
  | 'jpeg' | 'png' | 'heic' | 'webp' | 'avif' | 'tiff'
  | 'raw-cr2' | 'raw-nef' | 'raw-arw' | 'raw-dng'
  | 'mp4' | 'mov' | 'mkv' | 'webm'
  | 'mp3' | 'flac' | 'm4a' | 'ogg' | 'wav'
  | 'pdf' | 'docx' | 'xlsx' | 'pptx' | 'epub'
  | 'svg';

type MetadataResult = {
  format: FileFormat;
  filename?: string;
  sizeBytes: number;
  // Grouped namespaces, depends on format
  groups: {
    [namespace: string]: MetadataField[]; // e.g. "EXIF", "IPTC", "XMP", "GPS", "PDF.Info"
  };
  // High-level convenience fields
  highlights: {
    gps?: { lat: number; lon: number; alt?: number };
    capturedAt?: string;          // ISO 8601
    device?: { make?: string; model?: string; serial?: string };
    software?: string;
    author?: string;
    lastModifiedBy?: string;
    revisionHistory?: number;     // count of tracked changes etc.
  };
  warnings: string[];             // e.g. "GPS found", "Author field non-empty"
};

type MetadataField = {
  key: string;
  label?: string;               // human-readable
  value: string | number | boolean | null;
  raw?: unknown;                // original parsed value
  sensitive?: boolean;          // GPS, serial, author, etc.
};

type ScrubOptions = {
  preset?: 'all' | 'gps-only' | 'personal-only' | 'keep-technical' | 'custom';
  // 'all' — remove everything stripping is safe for
  // 'gps-only' — remove GPS, keep the rest
  // 'personal-only' — remove author/owner/software/serial/lastModifiedBy
  // 'keep-technical' — keep camera/exposure/dimensions, drop everything else
  // 'custom' — use the `keep` and `remove` lists below
  keep?: string[];   // namespace.field paths to keep (e.g. "EXIF.ExposureTime")
  remove?: string[]; // explicit removals
};

type MetadataDiff = {
  onlyInA: MetadataField[];
  onlyInB: MetadataField[];
  changed: { a: MetadataField; b: MetadataField }[];
};
```

## Per-format parsers

Inside `packages/core/src/formats/`:

```
formats/
├── index.ts          # registry, detectFormat, dispatch
├── jpeg.ts           # uses 'exifr' for EXIF/IPTC/XMP/GPS
├── png.ts            # uses 'exifr' + custom tEXt/iTXt parser
├── heic.ts           # heic-decode + exifr
├── webp.ts
├── avif.ts
├── tiff.ts
├── raw.ts            # CR2/NEF/ARW/DNG — exifr handles all
├── mp4.ts            # mp4box.js for atoms; ffmetadata for tags
├── mov.ts            # same as mp4
├── mkv.ts            # ebml-iterator
├── mp3.ts            # node-id3 or music-metadata
├── flac.ts           # music-metadata
├── pdf.ts            # pdf-lib for write; pdfjs-dist for parse
├── docx.ts           # jszip + parse docProps/core.xml, app.xml, custom.xml
├── xlsx.ts           # same approach
├── pptx.ts           # same approach
├── epub.ts           # jszip + parse OPF
└── svg.ts            # parse XML, look for metadata/dc:* elements
```

Each parser file exports:

```typescript
export const parser: FormatParser = {
  format: 'jpeg',
  extensions: ['.jpg', '.jpeg'],
  mimeTypes: ['image/jpeg'],
  magic: [/^\xFF\xD8\xFF/],
  parse: async (bytes) => { /* ... */ },
  scrub: async (bytes, options) => { /* ... */ },
};
```

## Dependencies (suggested, all MIT/Apache compatible)

- `exifr` — images metadata (EXIF/IPTC/XMP/GPS), MIT
- `piexifjs` — alternative for JPEG scrubbing if exifr doesn't expose write
- `pdf-lib` — read/write PDF metadata
- `jszip` — for DOCX/XLSX/PPTX/EPUB (they're ZIPs)
- `music-metadata` — audio formats
- `mp4box` — MP4/MOV
- `ebml-iterator` — MKV
- `heic-decode` — HEIC

> Check each dep license before adding. We want MIT or Apache 2.0 for the core to keep our MIT license clean.

## Build outputs

`@metascrub/core` ships as:
- ESM (`dist/index.mjs`)
- CJS (`dist/index.cjs`)
- Types (`dist/index.d.ts`)
- A browser-friendly bundle (`dist/browser.mjs`) that does not import `fs`

## Linking back to metadatafinder.com

Every package must include in its README and "about" screen:

> MetaScrub is part of [metadatafinder.com](https://metadatafinder.com) — the metadata toolkit.

This is the link-building point — don't omit it.

## Testing

- `vitest` for core unit tests, one fixture file per format under `packages/core/test/fixtures/`.
- Snapshot tests for `parse()` output.
- Round-trip tests: parse → scrub → parse → assert no sensitive fields remain.
