# WORKLOG

> Append-only log of each focused session.
> Most recent entry on top.

---

## 2026-05-29 — Session 1: Phase 1 (Foundation)

**Goal**: Bring `@metascrub/core` + the `metascrub` CLI to working state with the top-4 formats (JPEG, PNG, PDF, DOCX) supported.

**Work done**

- Bootstrapped pnpm workspaces; installed root + per-package deps (no build-scripts approved — esbuild ignored, no impact on runtime).
- `@metascrub/core`:
  - Public API (`parse` / `scrub` / `compare` / `detectFormat` / `supportedFormats`) wired through a format registry.
  - Strict TS types in `src/types.ts` (FileInput / FileFormat / MetadataResult / ScrubOptions / FormatParser / MetaScrubError).
  - JPEG parser: exifr-backed EXIF/IPTC/XMP/GPS parse; segment-level scrubber that preserves SOI, JFIF (APP0), ICC profile (APP2), DQT/DHT/SOF/SOS/EOI, and always writes back a minimal EXIF segment containing only `Orientation` to honor the "never rotate by accident" rule.
  - PNG parser: tEXt / zTXt / iTXt / eXIf / tIME chunk walker with custom CRC32; scrub drops metadata chunks and recomputes CRCs.
  - PDF parser: pdf-lib for both read and write; scrubs Info dict + XMP stream (`Catalog.Metadata`); `keep-technical` and `personal-only` blank Info but preserve dates.
  - DOCX parser: JSZip + regex extraction of `docProps/core.xml` / `app.xml`; scrubber **regenerates** rather than deletes core.xml/app.xml (per spec — Word complains otherwise).
  - Highlights & warnings: GPS / captured-at / device / software / author / lastModifiedBy / revision-history derived from groups; "edited in", "edited by another user", "GPS found", "serial found" warnings.
  - Synthetic-fixture test helpers (no binary fixtures committed). 20 tests, all green.
  - tsup builds ESM (`.mjs`) + CJS (`.cjs`) + browser ESM bundle, all referenced from `exports`.
- `metascrub` CLI:
  - commander-driven, five commands: `view`, `scrub`, `compare`, `batch`, `formats`.
  - Render layers: human (kleur), JSON, CSV.
  - `batch` walks directories with worker-pool concurrency, progress bar, CSV/JSON report.
  - 7 integration tests via execa, all green. Builds to ~19 KB ESM bundle.
- READMEs:
  - `packages/core/README.md` and `packages/cli/README.md` both include the metadatafinder.com link, install instructions, API/command reference, and the privacy note.
  - LICENSE (MIT) copied into both packages.
- Quality gate run at end of session: `tsc --noEmit` on both packages, all tests pass, tsup builds clean for both, prettier --write applied.

**Phase 1 quality gate**

- [x] TS types pass strict checks (core + cli).
- [x] All tests pass (20 in core, 7 in cli).
- [x] Formatter applied (prettier --write).
- [x] READMEs include metadatafinder.com link.
- [x] LICENSE present in each package.
- [x] `homepage` field set to `https://metadatafinder.com`.
- [x] No console.log / debug statements left.
- [ ] eslint not yet wired (will follow Phase 2 alongside more formats).

**Decisions worth remembering**

- JPEG `keep-technical` currently collapses to orientation-only because partial-EXIF rewriting is non-trivial. Documented as a v0.1 limitation; full keep-technical lands in v0.2 when we have a proper TIFF/IFD writer.
- DOCX scrub regenerates `docProps/core.xml` with empty fields (Word refuses files where it's missing).
- ZIP-based magic shared by docx/xlsx/pptx/epub disambiguated by extension; v0.1 only registers `docx`.

**Status**: Phase 1 code-complete. Anton approval required before `git push` and `npm publish` (per CLAUDE.md gate).

**Next session entry point**: Phase 2 — format coverage expansion (HEIC/WebP/AVIF/TIFF/RAW images, MP3/FLAC/M4A/OGG/WAV audio, MP4/MOV/MKV/WebM video, XLSX/PPTX/EPUB, SVG). Use `orchestrator` with parallel `core-developer` invocations — each format lives in its own `packages/core/src/formats/<format>.ts`, so they don't conflict.
