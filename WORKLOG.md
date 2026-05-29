# WORKLOG

> Append-only log of each focused session.
> Most recent entry on top.

---

## 2026-05-30 — Session 2: Phase 2 (Format coverage)

**Goal**: Bring `@metascrub/core` from 4 formats (Phase 1) to all 25 spec formats.

**Work done**

- Started with XLSX/PPTX/EPUB/SVG already drafted in working tree from prior session prep — fixed two failures (SVG highlights.author wasn't routing through SVG.metadata.creator; EPUB scrub silently ran the DOCX path because scrub() called detectFormat() with no filename and any ZIP defaulted to docx). Fix: detectZipSubtype() in magic.ts sniffs ZIP local-file-header filenames + EPUB mimetype content; highlights now route through XLSX/PPTX/EPUB/SVG group names too.
- Committed XLSX/PPTX/EPUB/SVG (26 tests).
- Spawned three parallel `core-developer` agents in isolated worktrees for the rest:
  - Image batch (WebP, TIFF, HEIC, AVIF, RAW × 4): all parse via exifr. WebP round-trips (RIFF chunk drop + VP8X flag clear). TIFF round-trips for single-IFD only. HEIC/AVIF use in-place item-payload blanking via a shared \_heif.ts helper (renamed from agent's \_isobmff.ts to avoid colliding with video batch). RAW is parse-only — scrub throws SCRUB_ERROR.
  - Audio batch (MP3, FLAC, WAV, OGG, M4A): all round-trip. music-metadata for parsing. MP3 drops ID3v2+v1; FLAC walks blocks; WAV drops LIST/INFO; OGG recomputes page CRC32 (skips if comment packet spans pages); M4A uses ISOBMFF box walker with stco/co64 chunk-offset fixup.
  - Video batch (MP4, MOV, MKV, WebM): all round-trip. MP4/MOV replace moov.udta with a free box of identical size so mdat offsets stay valid (AtomicParsley pattern). MKV/WebM use a small custom EBML walker; drops Tags + SeekHead and blanks Info fields. Custom walkers instead of mp4box/ebml-iterator — kept bundle lean.
- Merged worktrees back to main: video's \_isobmff.ts kept as canonical; image's helper kept as \_heif.ts; magic.ts and detect.ts manually reconciled to merge all three batches' ISOBMFF/EBML/TIFF logic.
- Bumped core + CLI versions to 0.2.0. `supportedFormats()` now lists 25.

**Phase 2 quality gate**

- [x] TS types pass strict checks (core + cli).
- [x] All tests pass (80 in core, 7 in cli).
- [x] Formatter applied (prettier --write).
- [x] tsup builds clean (149 KB ESM with all 25 formats; music-metadata dynamically imported).
- [ ] eslint still not wired (carried forward; deferred to Phase 3).

**Decisions worth remembering**

- Two `_isobmff.ts` files came back from parallel agents with completely different APIs. Resolved by keeping video's (broader container helpers) and renaming image's to `_heif.ts` (HEIF item/iloc specifics for HEIC/AVIF).
- MP4 udta removal preserves byte layout via a `free` box of identical size — avoids rewriting stco/co64 chunk-offset tables. Standard editor technique.
- HEIC/AVIF v0.1 doesn't rewrite iinf/iloc; it only blanks the EXIF item payload. Downstream readers see "no EXIF" but the blanked bytes still occupy mdat. v0.2 should do real item removal.
- RAW (CR2/NEF/ARW/DNG) is intentionally parse-only — scrubbing risks corrupting per-vendor private IFD layouts. DNG could safely support gps-only in v0.2.
- ISOBMFF brand `mp4` overlaps M4A. detectFormat() prefers the extension when filename ends `.m4a`/`.m4b`/`.m4p`.
- EBML DocType reader differentiates Matroska from WebM by scanning the first 4 KiB for element ID 0x4282.

**Status**: Phase 2 code-complete. Core API frozen (no public-API changes). Anton approval required before `git push` and `npm publish`.

**Next session entry point**: Phase 3 — Browser extension + Python port (parallel streams). See ROADMAP Phase 3. Stream A (`extension-developer`): scaffold Vite + crxjs, build popup/options, draft store listings. Stream B (`python-developer`): port JPEG/PNG/PDF/DOCX/MP3 to PyPI package with parity tests.

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
