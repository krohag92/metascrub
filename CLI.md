# @metascrub/cli — `metascrub` CLI

NPM-installable CLI that wraps `@metascrub/core`. Distributed via NPM and (later) Homebrew/Scoop/Chocolatey.

## Goals

- One-line install: `npm install -g metascrub` (or `npx metascrub …`).
- Works on macOS, Linux, Windows.
- Pipe-friendly: read from stdin, write to stdout when sensible.
- Pretty output by default (human), JSON with `--json`.

## Commands

```
metascrub view <file>                Print metadata of a file
metascrub scrub <file> [-o out]      Scrub metadata, write cleaned file
metascrub compare <a> <b>            Show metadata diff between two files
metascrub batch <dir> [options]      Process a directory recursively
metascrub formats                    List supported formats
metascrub --version
metascrub --help
```

### `metascrub view`

```
Usage: metascrub view <file> [options]

Options:
  --json           Output as JSON
  --csv            Output as CSV
  --pdf <out>      Write a PDF report
  --only <ns>      Show only one namespace (e.g. EXIF, XMP, PDF.Info)
  --warnings       Show only warnings (sensitive fields)
  -q, --quiet      Suppress non-error output
```

Example output (human):

```
metadatafinder.com — metascrub view photo.jpg

  Format        JPEG (3.2 MB)
  Captured      2024-08-12T14:23:11+00:00
  Device        Canon EOS R5

  ⚠ GPS coordinates found       40.7128, -74.0060
  ⚠ Camera serial found         123456789

  EXIF
    Make                       Canon
    Model                      EOS R5
    LensModel                  RF 24-70mm F2.8 L IS USM
    ExposureTime               1/250
    FNumber                    2.8
    ISO                        400
    ...

  GPS
    Latitude                   40.7128
    Longitude                  -74.0060
    Altitude                   12 m

Run `metascrub scrub photo.jpg` to remove sensitive metadata.
```

### `metascrub scrub`

```
Usage: metascrub scrub <file> [options]

Options:
  -o, --out <path>          Output path (default: <name>.clean.<ext>)
  --in-place                Overwrite the input file (BE CAREFUL)
  --preset <name>           all | gps-only | personal-only | keep-technical
                            (default: all)
  --keep <list>             Comma-separated fields to keep (custom preset)
  --remove <list>           Comma-separated fields to remove
  --dry-run                 Show what would be removed, don't write
  --json                    Output result as JSON
```

Example:

```bash
metascrub scrub photo.jpg --preset gps-only
# → wrote photo.clean.jpg (removed: GPSLatitude, GPSLongitude, GPSAltitude)
```

### `metascrub compare`

```
Usage: metascrub compare <a> <b> [options]

Options:
  --json           Output as JSON
  --only-changed   Hide identical fields (default)
  --all            Show identical fields too
```

### `metascrub batch`

```
Usage: metascrub batch <dir> [options]

Options:
  --action <view|scrub>      Default: view
  --recursive / -r           Recurse into subfolders
  --preset <name>            Scrub preset (only with --action=scrub)
  --pattern <glob>           File glob (default: all supported formats)
  --in-place                 Overwrite originals (with --action=scrub)
  --out-dir <path>           Mirror folder structure into out-dir
  --report <path>            Write CSV/JSON report
  --concurrency <n>          Parallelism (default: CPU count)
  --json                     Streaming JSON output for piping
```

Batch is the killer feature for journalists, agencies, photographers, and SEO teams cleaning client assets. Make sure it's robust.

## Folder layout

```
packages/cli/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts              # entry: parse argv, dispatch
│   ├── commands/
│   │   ├── view.ts
│   │   ├── scrub.ts
│   │   ├── compare.ts
│   │   ├── batch.ts
│   │   └── formats.ts
│   ├── render/
│   │   ├── human.ts          # pretty terminal output (uses kleur)
│   │   ├── json.ts
│   │   ├── csv.ts
│   │   └── pdf.ts            # uses pdf-lib
│   └── util/
│       ├── argv.ts           # uses commander or cac
│       └── progress.ts       # uses cli-progress
└── README.md
```

## package.json

```json
{
  "name": "metascrub",
  "version": "0.1.0",
  "description": "View and strip metadata from images, videos, audio, and documents. CLI for the metadatafinder.com toolkit.",
  "license": "MIT",
  "homepage": "https://metadatafinder.com",
  "repository": "github:metascrub/metascrub",
  "bin": {
    "metascrub": "./dist/index.js"
  },
  "scripts": {
    "build": "tsup",
    "test": "vitest run"
  },
  "dependencies": {
    "@metascrub/core": "workspace:*",
    "commander": "^12.0.0",
    "kleur": "^4.1.0",
    "cli-progress": "^3.12.0"
  },
  "keywords": [
    "metadata", "exif", "scrub", "strip", "cli",
    "privacy", "pdf", "docx", "image", "photo"
  ]
}
```

## Dependencies

- `commander` or `cac` — argv parsing (commander is more popular for SEO discoverability)
- `kleur` — terminal colors (4kb, zero deps)
- `cli-progress` — progress bar for batch

Keep total install size small.

## Output styling

- Use ANSI colors via `kleur` but respect `NO_COLOR` env var.
- Warnings in yellow/red, info in dim, success in green.
- The brand tagline ("metadatafinder.com — metascrub …") appears once at the top of human output, never in JSON output (to keep pipes clean).

## Error handling

- Exit code 0: success.
- Exit code 1: any file failed (in batch, this means at least one failure).
- Exit code 2: invalid arguments.
- Exit code 3: unsupported format.
- Always print errors to stderr.

## Testing

Use `execa` to spawn the CLI in tests. Fixtures from `@metascrub/core/test/fixtures`.

## README must include

- Install: `npm install -g metascrub` and `npx metascrub …`
- Full command reference
- 3-5 real-world examples (photographer, journalist, agency batch)
- Link: "Web app: https://metadatafinder.com"
- Badge row: NPM version, downloads, license, GitHub stars
- Screenshot of `metascrub view` output (asciinema is best — link to it)

## Homebrew formula (later)

```ruby
class Metascrub < Formula
  desc "View and strip metadata from any file"
  homepage "https://metadatafinder.com"
  url "https://registry.npmjs.org/metascrub/-/metascrub-X.Y.Z.tgz"
  # ...
end
```

We submit this to homebrew-core after `metascrub` has ~500 GitHub stars (their criterion).
