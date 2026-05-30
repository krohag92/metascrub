# WORKLOG

> Append-only log of each focused session.
> Most recent entry on top.

---

## 2026-05-30 — Session 5: Phase 5 (Desktop app + Content batch)

**Goal**: Tauri desktop ready for build on each platform + first SEO content published.

**Work done**

- Parallel agents: `desktop-developer` (Tauri app) + `docs-writer` (content). Both merged with `--no-ff` for traceability; no file conflicts (separate trees).
- Desktop (`packages/desktop/`): Tauri 2 scaffold with React UI. `src-tauri/Cargo.toml` + `tauri.conf.json` declaring bundle targets `app/dmg/msi/deb/appimage`, identifier `com.metadatafinder.metascrub.desktop`. `src-tauri/src/lib.rs` exposes 5 IPC commands (read_file_bytes / write_file_bytes / list_dir / pick_files / open_url). React three-pane UI (FileList / MetadataView / ScrubPanel / BatchProgress / WarningBadge / RecentFiles) with `@tauri-apps/plugin-store` for recent files. Native integrations: macOS NSServices array in tauri.conf.json (Finder right-click "Scrub metadata with MetaScrub"); Windows `wix/registry.wxs` fragment for HKCR\*\shell\MetaScrub; Linux `assets/metascrub.desktop` with MIME types for all 25 formats; Flathub manifest at `flathub/com.metadatafinder.metascrub.desktop.json`. Auto-update plugin points at metadatafinder.com (placeholder pubkey, flagged TODO). 41 tests passing.
- Content (`content/`): ~20,000 words across 25 files.
  - 4 long-form posts (1,600-2,000 words each) — what-is-exif-data / remove-gps-from-photos / strip-pdf-metadata / word-document-metadata. 40 backlinks to https://metadatafinder.com across them.
  - 12 cross-post variants (Dev.to / Hashnode / Medium per post), each with `canonical: https://metadatafinder.com/blog/<slug>` so search engines credit the main domain.
  - Substack launch post in Anton's voice (building-in-public).
  - Press kit: 50/150/300-word boilerplate, founder bio variants, 12 tagline one-liners, MetaScrub-at-a-glance stats sheet, embargoable press release template.
  - Extension privacy policy (`content/legal/extension-privacy-policy.md`) covering the same content used on the Tauri desktop.
  - `content/README.md` doubles as Anton's review queue with a status column per file.
  - 13 `[verify: ...]` placeholders flag specific historical incidents (Vice/McAfee EXIF 2012, Iraq dossier al-Marashi metadata, iOS Shortcuts action name) for Anton to fact-check before publishing.

**Phase 5 quality gate**

- [x] Desktop builds clean on the frontend side (`pnpm build:web`); `tauri build` requires Rust toolchain + per-OS SDKs — defer to Anton's local boxes.
- [x] All UI components have vitest coverage (41 tests).
- [x] TS typecheck clean across 9 TS packages.
- [x] 4 blog posts ready for Anton's review (each links metadatafinder.com 3+ times).
- [x] Cross-posts have canonical URLs pointing back to the main domain.
- [x] Press kit complete.
- [x] Privacy policy complete (reusable for desktop too).
- [x] No telemetry / analytics in either workstream.
- [ ] eslint still not wired (carried forward).

**Project-wide test count after Phase 5**: 80 core + 7 cli + 24 extension + 15 vscode + 15 obsidian + 31 raycast + 9 n8n + 12 figma + 16 docker-api + 13 huggingface + 41 desktop + 142 python = **405 tests passing**.

**Decisions worth remembering**

- Tauri's `bundle.targets` ships all four installer formats (`dmg`/`msi`/`deb`/`appimage`) from a single config — Anton runs `tauri build` on the matching OS to get each artifact. No CI matrix yet; that's Phase 7.
- Cross-post canonical URLs: every Dev.to / Hashnode / Medium variant has `canonical: https://metadatafinder.com/blog/<slug>` at the top. This is the SEO-correct way to cross-post — Google credits metadatafinder.com instead of dev.to.
- The `[verify: ...]` placeholders are honest hedges. Better to flag than fabricate. Anton will resolve them with a 10-minute fact-check pass.
- Same privacy policy file works for the extension AND the Tauri desktop — documented in the file header. Saves writing two near-identical pages.

**Status**: Phase 5 code-complete. Anton approval required before: publishing blog posts to metadatafinder.com, posting cross-posts, posting the Substack launch, building Tauri installers, Mac App Store / Microsoft Store submissions.

**Next session entry point**: Phase 6 — WordPress plugin + Hugging Face Space polish. Sequential: `wordpress-developer` first (PHP plugin with native JPEG/PNG/PDF scrubber, wp_handle_upload hook, bulk cleaner admin page, settings page, GPL-2.0+ license, readme.txt in WP format); then polish the HF Space (already shipped in Phase 4 — minor enhancements: better Gradio UI, README badges, a small "Try the live tool" CTA).

---

## 2026-05-30 — Session 4: Phase 4 (Developer integrations)

**Goal**: Six wrappers ready for submission — VS Code, Obsidian, Raycast, n8n, Figma, Docker (CLI + API images), Hugging Face Space.

**Work done**

- Launched 5 parallel `integrations-developer` agents in isolated worktrees for the plugin batch (VS Code, Obsidian, Raycast, n8n, Figma); then 1 sequential `docker-developer`; then 1 sequential `python-developer` for the HF Space. Each landed independently because they touch separate top-level directories.
- VS Code (`packages/vscode/`): `metascrub.view` + `metascrub.scrub` commands wired into explorer context (15 supported extensions), `MetadataPanel` WebView with proper CSP + warnings, esbuild bundle 11.7 KB. 15 tests.
- Obsidian (`packages/obsidian/`): `metascrub:scan-attachments` command + ribbon + status bar; pure scanner module testable without Obsidian runtime; file-menu items "View metadata" / "Scrub metadata" per attachment. esbuild bundle 1.9 MB (core inlined for Electron runtime). 15 tests.
- Raycast (`packages/raycast/`): two commands `view-metadata` + `scrub` with arguments/preset dropdowns; pure-logic utils module fully tested; `ray build` exits clean. 31 tests.
- n8n (`packages/n8n-node/`): community node package `n8n-nodes-metascrub` with parse/scrub/compare operations + preset dropdown; binary input/output via `this.helpers`. 9 tests.
- Figma (`packages/figma/`): sandbox `code.ts` walks page nodes, collects image fills by hash; UI iframe runs @metascrub/core on bytes; "Scrub all" replaces canvas image in place or exports cleaned file. `networkAccess: { allowedDomains: ["none"] }` in manifest. Bundle 2.5 KB sandbox + 173 KB UI. 12 tests.
- Docker (`docker/`): `cli.Dockerfile` (`node:22-alpine`, ENTRYPOINT `metascrub`, OCI labels) + `api.Dockerfile` (multi-stage build of `docker/api/` Hono server). API endpoints `POST /parse|/scrub|/compare`, `GET /formats|/health`. Env `MAX_FILE_SIZE` (default 100mb) + `RATE_LIMIT` (default 60/min) enforced via in-memory per-IP counter; 413 on oversize, 415 on unsupported. `.github/workflows/docker.yml` publishes multi-arch to Docker Hub + GHCR on tag push (secrets gated). 16 tests. Local `docker build` deferred — daemon not running in this session.
- Hugging Face Space (`huggingface/`): Gradio 4 Blocks app with 3 tabs (View / Scrub / AI-detection). AI-detection is pure metadata heuristic (no ML model): looks for known generator names in EXIF.Software/XMP.CreatorTool/PDF.Producer (Midjourney, Stable Diffusion, DALL-E, Adobe Firefly, Leonardo, ComfyUI, Automatic1111, NovelAI, …), PNG iTXt keys (`parameters`/`prompt`/`negative_prompt`/`workflow`), C2PA manifest presence, and Stable Diffusion generation-parameter regex in Comment/UserComment fields. 13 tests.
- Two merge hygiene fixes during integration: (1) three plugin agents left their changes uncommitted — `cp -R` nested the dirs (`packages/vscode/vscode/`), fixed via `rsync` flatten; (2) HF agent's `metascrub @ file:./python` requirement broke under pip's resolution rules — replaced with a comment explaining the right local-install command.

**Phase 4 quality gate**

- [x] All 7 packages build clean.
- [x] All packages have README + LICENSE; metadatafinder.com link present.
- [x] No analytics, no telemetry, no phone-home in any wrapper.
- [x] TS typecheck clean across 8 TS packages (core, cli, extension, vscode, obsidian, raycast, n8n-node, figma + docker/api).
- [x] Test suite green: **111 new tests this phase**. Project-wide test count: 80 core + 7 cli + 24 extension + 15 vscode + 15 obsidian + 31 raycast + 9 n8n + 12 figma + 16 docker-api + 13 huggingface + 142 python = **364 tests**.
- [ ] Docker `docker build` smoke test deferred — Docker Desktop not running in this session; Dockerfiles validated via lint + multi-stage logic review.
- [ ] eslint still not wired (carried forward; deferred to Phase 7 catch-up).

**Decisions worth remembering**

- For plugin packages with chrome.storage-style APIs, the pure scanner / settings logic was extracted into separate testable modules so the agent could unit-test without a real Obsidian / Raycast / VS Code runtime — turned out to be a cleaner pattern than mocking the host API.
- The Docker API server is **deliberately auth-free**. README documents the reverse-proxy auth pattern (Caddy / nginx basic auth or oauth-proxy). Putting auth into the image would make it harder to compose into existing setups.
- Figma's manifest declares `networkAccess: { allowedDomains: ["none"] }` — the strongest privacy claim possible. The plugin literally cannot make network calls; verified at the manifest level.
- HF Space's AI-detection uses no ML — entirely heuristic. Avoids pulling PyTorch / Transformers (would make the Space slow to cold-start and bloat the image). Honest about its limits: returns `unknown` when no markers found.
- pnpm-workspace.yaml now includes `docker/api` so the Hono server picks up `@metascrub/core` as `workspace:*`.

**Status**: Phase 4 code-complete. Anton approval required before: extension store submissions, `vsce publish` (VS Code), Obsidian PR, Raycast publish, `npm publish` for n8n node, Figma Community submission, `docker push`, `git push`, HF Space push to Hub.

**Next session entry point**: Phase 5 — Desktop app (Tauri) + Content batch (4 SEO blog posts + press kit + privacy policy page). Two parallel streams per ROADMAP.md: `desktop-developer` (Tauri 2 scaffold, three-pane UI, drag-drop, batch progress, per-OS installer builds, Flathub manifest) and `docs-writer` (4 SEO blog posts + cross-post versions + Substack + press kit + privacy policy).

---

## 2026-05-30 — Session 3: Phase 3 (Extension + Python)

**Goal**: Ship browser extension submission-ready for 4 stores + PyPI package ready to publish.

**Work done**

- Spawned two parallel agents in isolated worktrees per the roadmap's "Stream A / Stream B" split:
  - `extension-developer`: built `packages/extension/` — MV3 manifest (Chrome family) + Firefox manifest with gecko ID; Vite + @crxjs/vite-plugin; React 18 + Tailwind v4 popup with FileDrop/MetadataView/ScrubPanel/WarningBadge; options page persisting to chrome.storage.sync; background service worker registering "View metadata" + "Download cleaned copy" context menus and dispatching to @metascrub/core; lib/fetch-bytes + lib/download. Builds `dist.zip` (~1.1 MB) and `dist-firefox.zip` (~1.1 MB). Placeholder icons — Anton swaps before submission.
  - `python-developer`: built `python/` — PyPI package porting JPEG/PNG/PDF/DOCX/MP3 natively (no WASM bridge per PYTHON.md). Pillow + piexif for JPEG; native chunk walker for PNG; pypdf for PDF; zipfile+xml for DOCX (regenerates core.xml/app.xml like TS); **tinytag** (MIT) for MP3 reads, native syncsafe byte surgery for scrub — explicitly avoided mutagen (GPL-2.0+ conflict). click CLI mirrors TS commands (view/scrub/compare/batch/formats) with JSON/CSV/human output. Optional pandas dep for `batch_view(as_dataframe=True)`. Wheel 31 KB, sdist 38 KB.
- Both worktrees merged with `--no-ff` for traceability; no merge conflicts (separate trees: `packages/extension/` and `python/`).
- Verified clean install on a fresh venv: `python3 -m venv && pip install -e . pytest && pytest` → 142 passing including 25 parity assertions vs the TS core dist.
- Full QA sweep across the monorepo: 80 core + 7 CLI + 24 extension + 142 Python = **253 tests passing**. TS typecheck clean for all 3 TS packages.

**Phase 3 quality gate**

- [x] Extension `dist.zip` + `dist-firefox.zip` build clean.
- [x] Python wheel + sdist build clean.
- [x] Parity tests: 25/25 Python vs TS core (highlights, warnings, per-group keys; documented divergences for XMP, GPS float precision, PDF dates — none affect highlights).
- [x] All tests pass (253 across the project).
- [x] TS typecheck clean on core/cli/extension.
- [x] README in each package with metadatafinder.com link.
- [x] LICENSE present in each package.
- [x] No telemetry / analytics added to any wrapper.
- [ ] eslint still not wired (carried from Phase 1; deferred — will batch with Phase 4 integrations).
- [ ] Real icons + screenshots required before store submission (Anton supplies).

**Decisions worth remembering**

- Extension bundle is ~1.1 MB unpacked vs the 500 KB spec target. The overage is fixed core cost (exifr 418 KB + jszip 96 KB + music-metadata 75 KB + React 186 KB) — gzipped it's ~340 KB which fits any store quota. Trimming below 500 KB would mean dropping format support, out of scope here.
- Python MP3: tinytag is MIT and read-only; we own the byte-surgery scrub so we don't need any writer library. This avoids the mutagen GPL conflict cleanly.
- Python's XMP support is a single `XMP.raw` group field (Pillow doesn't decode structurally). Parity tests document this so highlights still match TS.
- Both wrappers depend on the core's public API surface only — they don't reach into internals. Confirms the API freeze was right-sized.

**Status**: Phase 3 code-complete. Anton approval required before extension store submissions and `twine upload`. Local builds verified.

**Next session entry point**: Phase 4 — Developer integrations (parallel batch). VS Code, Obsidian, Raycast, n8n, Figma plugins (each in `packages/<name>/`) via `integrations-developer` agents; then Docker images (`docker/`) sequentially; then Hugging Face Space. See ROADMAP Phase 4 + INTEGRATIONS.md + DOCKER.md.

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
