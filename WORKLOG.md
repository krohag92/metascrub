# WORKLOG

> Append-only log of each focused session.
> Most recent entry on top.

---

## 2026-10-25 — Image Metadata Viewer port

**Goal**: Bring the live Chrome listing (id `cflaiadbiijlghmaigkmdajbkbjnjjeo`, v1.0) into the monorepo as its own package, fix the CORS "Error" overlay, and stop writing untrusted strings as HTML.

**Work done**

- Added `packages/extension-image-metadata-viewer` at version 1.1.0. Same name and no `update_url`, so it can ship as an update to the existing Chrome item. Separate from `packages/extension`.
- Image bytes and EXIF are read in the background (`exifreader@4.31.0`, MPL-2.0, license copied to `licenses/`). The content script only paints the overlay. CSS is inserted on use. Drag listeners bind once. Overlay DOM uses `textContent`.
- Chromium zip (service worker) and Firefox zip (`image-metadata-viewer@metadatafinder.com`, background scripts, `data_collection_permissions.required: ["none"]`). `homepage_url` is `https://metadatafinder.com/jpg-metadata-viewer`. Powered-by UTM identifies the browser.
- `PRIVACY.md` says nothing is collected and that `https://metadatafinder.com/extension/privacy` 404s. Icons come from `pnpm brand:icons`.

**Quality gate**

- [x] Package tests — 17 passed, including a headless Chrome for Testing run against a cross-origin JPEG with no CORS header
- [x] `pnpm build`, `pnpm test` (317 tests), `pnpm lint`, and `pnpm typecheck`

**Next**: a person hosts `PRIVACY.md` and uploads the zips. Do not publish from an agent session.

---

## 2026-10-25 — Brand kit and icon generator

**Goal**: Replace solid-colour placeholder icons with a real MetaScrub / Metadata Finder mark and a script that renders every size the packages ship.

**Work done**

- Added `brand/` with `logo/mark.svg` (16px-grid viewfinder + lens), generated `logo/wordmark.svg`, `tokens.json` / `tokens.css` (press-kit navy `#0F172A`, green `#22C55E`, paper `#F8FAFC`), and `pnpm brand:icons` (`brand/generate.mjs`, sharp).
- Wired rendered icons into the extension (including the committed zips), VS Code (128 and 256), Raycast (512), Obsidian, Figma, n8n SVG, Tauri PNG/ICO/ICNS, Capacitor iOS/Android/PWA, and store tiles (440×280, 1400×560, 1280×640).
- 6 brand tests check dimensions, token colours, and that the extension zips carry the new 128px mark.

**Quality gate**

- [x] `pnpm --filter @metascrub/brand test` — 6 passed
- [x] `pnpm build` and `pnpm test` — 300 tests across 13 workspace projects
- [x] `pnpm lint` and `pnpm typecheck`

**Next**: port the live Image Metadata Viewer extension onto this icon set.

---

## 2026-05-30 — Session 9: Beyond Phase 8 (eslint + Sessionize)

**Goal**: Close the eslint quality gate that's been deferred since Phase 1, plus author one "Beyond Phase 8" content artifact from the roadmap.

**Work done**

- **eslint wired across the monorepo.** Installed eslint 8 + `@typescript-eslint`/`react`/`react-hooks` plugins at the root. Authored `.eslintrc.json` with `eslint:recommended` + TS-strict + React recommended, ignoring `dist`/`node_modules`/`*.d.ts`/per-package generated dirs (`packages/desktop/src-tauri`, `wordpress/`, `huggingface/`, `python/`, `content/`, mobile native dirs).
- Per-package `lint` scripts wired (`pnpm exec eslint src test --max-warnings 0`) for core/cli/extension/vscode/obsidian/n8n-node/figma/desktop/mobile + docker/api. Obsidian's script also includes `main.ts`; n8n-node's lints `nodes` instead of `src`. Raycast is intentionally skipped at the monorepo level — its `ray build` toolchain runs its own Prettier 3.8.3 + ESLint at publish time and bundles ship from `ray publish`, so trying to align it with our root config fights the tool.
- Two collision fixes for turbo/pnpm workspace name uniqueness: `packages/vscode` renamed from `metascrub` → `metascrub-vscode` (marketplace install command updated in README from `ext install metadatafinder.metascrub` → `ext install metadatafinder.metascrub-vscode`); `packages/raycast` renamed from `metascrub` → `metascrub-raycast` (Raycast Store still discovers by `author + name`).
- Two pre-existing lint warnings fixed at source: `packages/core/src/formats/ogg.ts` had a write-only `packetLen` accumulator in the comment-page scrubber's second walk — removed; `packages/core/test/avif.test.ts` imported `parse` but never used it — dropped; `docker/api/test/server.test.ts` imported `beforeAll` but never used it — dropped.
- **Sessionize speaker profile + talk pitch** (`content/distribution/sessionize-speaker-profile.md`): 50/150/300-word bio variants for Anton, a long-form talk abstract titled "Building 15 distribution channels from one core: a solo developer's distribution playbook" with 6 numbered sections, short pitch for CFP system summaries, target conferences list (NDC / JSConf regionals / PyCon / DevOps Days / OSCON / All Things Open), submission notes, status table. 10 metadatafinder.com mentions. 1 `[verify: ...]` flag asking Anton to confirm preferred talk length + in-person vs remote.

**Quality gate**

- [x] `pnpm lint` exits 0 across all 11 lint-capable workspaces.
- [x] `pnpm test` exits 0 across all 12 test workspaces.
- [x] `pnpm typecheck` clean across all 11 TS configs.
- [x] No new warnings introduced.
- [x] Prettier-clean throughout.

**Project-wide test total**: still **531 tests passing** (eslint didn't change behaviour, just added a quality gate).

**Decisions worth remembering**

- Two packages had to be renamed to satisfy turbo's workspace-name-uniqueness rule (`packages/vscode/`, `packages/raycast/`). The renames are workspace-internal but they do change the public marketplace URLs: VS Code Marketplace ID is now `metadatafinder.metascrub-vscode`, Raycast Store ID is now `metadatafinder/metascrub-raycast`. Slightly uglier URLs but everything else is preserved (displayName, store description, command IDs, etc.). Worth it for the cross-cutting quality gate.
- Raycast's `ray lint` runs its own bundled Prettier 3.8.3 which has different rules from our repo's 3.4.x. Forcing alignment is fighting the tool — Raycast's lint runs at `ray build` and `ray publish` anyway, which Anton runs at submission time. The monorepo `pnpm lint` skips Raycast with an echo and a hint.
- The "Beyond Phase 8" list in ROADMAP.md is mostly gated on Anton's account/submission work (Apple Developer Program, Shopify approval, Zapier review, Homebrew ~500 stars). Sessionize is the only one I could ship without his gate that has real backlink + outreach value.

**Status**: Roadmap fully done. Beyond-Phase-8 candidates still open that I can take on autonomously (in priority order): more SEO posts (target was "1-2 per month indefinitely"), Ukrainian + Portuguese translations of the major store listings, additional awesome-list submission texts not in the original 12. Everything else needs Anton's gate.

**Next session entry point**: optional — either more SEO content (post 09 / 10 ideas in `content/blog/`), or the UA + PT translation pass for store listings, or wait for Anton to start submitting to stores before doing the post-submission content (e.g. "MetaScrub is now on Chrome Web Store" launch posts that need real listing URLs).

---

## 2026-05-30 — Session 8: Phase 8 (Mobile — Capacitor iOS + Android)

**Goal**: Build `packages/mobile/` — Capacitor 6 React app, iOS Share Extension, Android Share Intent, tests, store listings, privacy labels, signing guide.

**Work done**

- Scaffolded `packages/mobile/` with full Capacitor 6 + React + Vite + TypeScript setup.
- `capacitor.config.ts`: appId `com.metadatafinder.metascrub`, appName `MetaScrub`, webDir `dist`.
- Four screens: HomeScreen (recent files + pick file), FileScreen (metadata viewer with groups + warnings), ScrubScreen (preset picker + scrub action + save/share result), SettingsScreen (default preset + privacy links + about).
- Five components: MetadataGroup (collapsible, sensitive field highlighting), Warning (red alert banner), PresetPicker (4 radio options with removes preview), TabBar (3-tab bottom nav), RecentFilesList (empty state + populated).
- Six lib modules: route.ts (hash router + deep-link parser), pick-file.ts (Capacitor native + web fallback), save-file.ts (Documents directory write + share sheet), share-extension.ts (App.addListener appUrlOpen handler), recent-files.ts (@capacitor/preferences storage), settings.ts (user preferences).
- iOS Share Extension Swift sources: `ios/MetaScrubShare/ShareViewController.swift` (copies shared file to App Group container, opens via metascrub:// URL scheme), `Info.plist`, `MetaScrubShare.entitlements`, main `MetaScrub.entitlements`. Setup guide in `ios/SETUP.md`.
- Android Share Intent fragments in `android/MANIFEST_OVERRIDE.md`. Setup guide in `android/SETUP.md`.
- App icon placeholder PNGs: public/icons (16/32/48/128), ios/icons (13 sizes including 1024 marketing), android/icons (5 mipmap densities × launcher + foreground + background).
- Assets: SCREENSHOTS-TODO.md, privacy-nutrition-label-ios.md (Data Not Collected), data-safety-android.md (No data collected), app-store-listing.md, play-store-listing.md.
- SIGNING.md: complete iOS Xcode archive → Transporter workflow, Android keytool keystore generation + gradle signing config + bundleRelease + Play Console upload.
- README.md + LICENSE (MIT).
- 44 tests passing across route.test.ts (18 tests) and components.test.tsx (26 tests).
- Vite build succeeds producing dist/ (~438 KB main chunk, ~1.1s build).
- TypeScript strict mode: `tsc --noEmit` clean.
- Zero analytics, zero telemetry, zero network calls.

**Quality gate**

- [x] `tsc --noEmit` passes.
- [x] 44 tests pass (vitest run).
- [x] `pnpm build` produces dist/ successfully.
- [x] `capacitor.config.ts` valid TypeScript with correct appId.
- [x] SIGNING.md covers iOS archive, Android keystore generation + AAB upload.
- [x] Privacy nutrition label + Data Safety say "No data collected".
- [x] README + LICENSE present, metadatafinder.com linked.
- [x] No analytics or telemetry deps in package.json.

**Project-wide test total after Phase 8**: 80 core + 7 cli + 24 extension + 15 vscode + 15 obsidian + 31 raycast + 9 n8n + 12 figma + 41 desktop + 44 mobile + 16 docker-api + 13 huggingface + 142 python + 82 wordpress = **531 tests passing**.

**Status**: Phase 8 code-complete. All 8 roadmap phases done. The MetaScrub suite ships across **15+ distribution channels** all building on the same `@metascrub/core` (25 formats, MIT, frozen public API):

| Channel               | Status               | Anton's submit gate                                      |
| --------------------- | -------------------- | -------------------------------------------------------- |
| @metascrub/core (NPM) | ready                | `npm publish`                                            |
| metascrub CLI (NPM)   | ready                | `npm publish`                                            |
| metascrub (PyPI)      | ready                | `twine upload`                                           |
| Browser extension     | dist.zip + Firefox   | Chrome/Edge/Opera/Firefox AMO submissions                |
| VS Code               | esbuild bundle       | `vsce publish`                                           |
| Obsidian              | main.js              | PR to obsidianmd/obsidian-releases                       |
| Raycast               | `ray build` clean    | `ray publish`                                            |
| n8n community node    | TS source            | `npm publish n8n-nodes-metascrub`                        |
| Figma                 | dist/code.js + ui    | Figma Community submission                               |
| Docker CLI image      | Dockerfile           | `docker build` + `docker push` on Anton's machine        |
| Docker API image      | Dockerfile + tests   | Same                                                     |
| HuggingFace Space     | app.py + tests       | push to Hub                                              |
| WordPress             | PHP plugin + tests   | wordpress.org/plugins submission (1-4 wk review)         |
| Tauri desktop         | scaffold + UI        | `tauri build` on each OS to produce dmg/msi/deb/AppImage |
| Mobile (iOS+Android)  | scaffold + Share Ext | Anton runs `cap add ios/android`, follows SIGNING.md     |

**Next**: Anton runs `npx cap add ios`, follows `ios/SETUP.md` to add the Share Extension target, then archives + uploads to App Store. Android: `npx cap add android`, applies MANIFEST_OVERRIDE.md, runs `./gradlew bundleRelease`, uploads to Play Console. Then the cross-cutting work — Anton's fact-check pass on the 16 content `[verify: ...]` placeholders, then publish/submit through each store's web form in the order documented in `content/distribution/README.md`.

---

## 2026-05-30 — Session 7: Phase 7 (Content batch 2 + Distribution prep)

**Goal**: 4 more SEO posts + cross-posts + launch copy + every distribution-listing draft ready for Anton to submit through each platform's web form.

**Work done**

- Parallel `docs-writer` agents: Stream A (content batch 2 + launch) and Stream B (distribution listings + awesome-lists). Both touched `content/README.md` — merged the two indexes by taking Stream A's blog/cross-post/launch sections and appending Stream B's distribution section.
- Stream A: 4 long-form posts (~6,900 words), 12 cross-post variants (Dev.to/Hashnode/Medium per post), `content/launch/` with Product Hunt + Show HN copy.
  - 05 forensics-leaked-documents — Iraq dossier + Sony hack + legal discovery use cases.
  - 06 oss-metadata-tools-compared — honest ExifTool / MAT2 / MetaScrub comparison.
  - 07 photographer-bulk-cleaning-workflow — pre-delivery batch flow with CSV report column names.
  - 08 journalist-protect-sources — newsroom OPSEC, SecureDrop reference, DOJ redaction failure.
- Stream B: `content/distribution/` with 18 files — 5 founder/company profiles (Indie Hackers, Crunchbase, SaaSHub, F6S, AlternativeTo) + 12 awesome-list submission texts + `distribution/README.md` as the submission queue.
- Each awesome-list submission file ships with three sections: target list URL, the literal markdown line to add (matching that list's existing format), and a PR title + body for Anton's pull request.

**Phase 7 quality gate**

- [x] 4 new long-form posts (1,400-2,400 words each).
- [x] 12 new cross-posts with `canonical: https://metadatafinder.com/blog/<slug>` frontmatter.
- [x] Launch folder has 4 files (PH launch, PH screenshots plan, Show HN post, Show HN comments).
- [x] 5 founder/company profile drafts.
- [x] 12 awesome-list submission drafts with explicit submission timing (`ready to submit` vs `submit after Chrome Store approval` etc.).
- [x] Every long-form file has ≥ 3 metadatafinder.com links.
- [x] `content/README.md` consolidated index reflects all 8 posts + 24 cross-posts + 4 launch files + 18 distribution files + Phase 5 entries (press kit, legal, substack) — no Phase 5 entries dropped.
- [x] Prettier-clean.
- [ ] 16 new `[verify: ...]` placeholders need Anton's fact-check pass before publishing.

**Project-wide test count after Phase 7**: unchanged at **487 tests** (Phase 7 was content-only, no code).

**Decisions worth remembering**

- Honest competitive positioning in 06-oss-metadata-tools-compared: ExifTool is the gold standard for parse depth (CLI-only Perl), MAT2 is best for batch stripping in Linux pipelines, MetaScrub's edge is multi-platform distribution + integrated view+scrub UX. No competitor-bashing — comparison reads like a real "help me choose" guide.
- Awesome-list submissions have an explicit timing column. `awesome-cli-apps` / `awesome-privacy` / `awesome-osint` can ship the day NPM is published; the rest are gated on store approvals (Chrome / VS Code Marketplace / Raycast Store / Figma Community / Obsidian plugin review / Docker Hub publish). This sequencing matters because submitting to `awesome-vscode` before the Marketplace listing exists looks spammy.
- The Show HN copy explicitly tells Anton "adapt; do not copy-paste verbatim" — Show HN comment threads detect templated answers and downvote them.
- 16 verify placeholders is fine — they're honest hedges on specific historical details (Iraq dossier al-Marashi attribution, Sony hack metadata reports, DOJ Roger Clemens redaction failure, FPF/SecureDrop URL, Anton's GitHub handle, Chrome Web Store extension ID — etc.). Anton resolves them with a focused 30-min pass.

**Status**: Phase 7 code/copy-complete. Anton approval required before: publishing blog posts to metadatafinder.com, posting cross-posts, posting on Product Hunt / Show HN, opening awesome-list PRs, submitting founder profiles.

**Next session entry point**: Phase 8 — Mobile apps (iOS + Android via Capacitor). LAST phase per roadmap. Sequential: `mobile-developer` scaffolds Capacitor 6 project, reuses extension popup UI, builds bottom tab nav + file picker + share extension (iOS Swift target) + Android Share Intent. Privacy nutrition label + Data Safety form drafts. Local builds + signing instructions for Anton.

---

## 2026-05-30 — Session 6: Phase 6 (WordPress + HF Space polish)

**Goal**: WordPress plugin submission-ready + Hugging Face Space polished.

**Work done**

- Sequential: WordPress plugin first, then HF Space polish.
- WordPress (`wordpress/`): native PHP 8.0+ plugin, GPL-2.0+ license (required by wordpress.org/plugins, differs from the rest of the monorepo's MIT). Plugin structure: main file with WP plugin header → `MetaScrub` bootstrap class; `includes/` houses the main class + uploader hook + bulk cleaner + settings page + three native scrubbers (jpeg/png/pdf). The scrubbers are PHP-native — no Composer deps, no calls to the JS core, no calls home.
  - JPEG: walks segments, drops APP1/APP2-IPTC/APP13/COM per preset, preserves SOI/JFIF/ICC/DQT/DHT/SOF/SOS/EOI.
  - PNG: walks chunks, drops tEXt/zTXt/iTXt/eXIf/tIME, recomputes CRC32 on preserved chunks.
  - PDF: byte-surgeries the Info dict and removes the XMP stream object; preserves dates for `keep-technical`.
  - Hooks: `wp_handle_upload` (toggleable, never blocks uploads), Tools → MetaScrub Bulk Cleaner admin page (paginated attachment list + bulk action), Settings → MetaScrub (preset picker + toggles via WP Settings API).
  - 82 PHP tests passing via a plain `php tests/test-*.php` runner (26 JPEG + 24 PDF + 32 PNG). Synthetic fixtures in PHP — no binary artifacts committed.
  - readme.txt is in wordpress.org's strict format (=== / == headers; not markdown). Separate GitHub-facing README.md.
  - Plugin-check compatibility: every output escaped, every form nonce'd + capability-checked, every input sanitized; no eval/extract/base64_decode; no external HTTP calls.
  - The wordpress-developer agent's final response was filtered, but it had already written all 14 source files. Verified by direct `php -l` + test runs. I added the missing LICENSE (GPL-2.0+), placeholder icons/banners in `assets/` (128/256 icons + 772x250 / 1544x500 banners), and a minimal `languages/metascrub.pot` translation skeleton, then de-nested an accidental `wordpress/wordpress/` from the worktree.
- HF Space polish (`huggingface/README.md`): added 5 status badges (Web app / PyPI / NPM / GitHub / License), distribution grid linking every install channel back to metadatafinder.com, format-coverage breakdown distinguishing the Space's 5 formats from the TS core's 25. README now has 12 metadatafinder.com mentions + 3 github.com/metascrub links. No app.py changes needed — the Gradio UI shipped with the AI-detection bonus and a clean 3-tab layout in Phase 4.

**Phase 6 quality gate**

- [x] WP plugin: 82 PHP tests pass.
- [x] `php -l` clean on every PHP file.
- [x] readme.txt parses as valid WP format.
- [x] LICENSE present (GPL-2.0+).
- [x] languages/metascrub.pot present.
- [x] assets/ has the four required PNGs (placeholders — Anton swaps before submit).
- [x] No external HTTP calls; no `eval`, no `extract`, no `base64_decode` on user input.
- [x] HF README has badges, distribution grid, and prominent metadatafinder.com + github.com/metascrub links.
- [ ] Anton's plugin-check WP-CLI run still pending (requires a local WP install).
- [ ] eslint still not wired (carried forward).

**Project-wide test count after Phase 6**: 80 core + 7 cli + 24 extension + 15 vscode + 15 obsidian + 31 raycast + 9 n8n + 12 figma + 16 docker-api + 13 huggingface + 41 desktop + 142 python + 82 wordpress = **487 tests passing**.

**Decisions worth remembering**

- WP plugin is intentionally **Composer-free**. Adding a dep makes WP.org reviewers nervous and inflates the install footprint. Native PHP byte surgery + PHP's built-in CRC32 cover everything we need.
- The `wp_handle_upload` hook never blocks an upload — if scrubbing fails, the original file passes through and we `error_log` the failure. Privacy is opt-in, not at the expense of breaking uploads.
- WP plugin uses GPL-2.0+ (not MIT) because wordpress.org/plugins requires it. The LICENSE file documents this divergence.
- HF Space polish was scoped to README only — the agent's existing Gradio 3-tab UI is already on-brand and the AI-detection bonus is the real differentiator. Throwing more Gradio CSS at it would be cosmetic.

**Status**: Phase 6 code-complete. Anton approval required before: wordpress.org/plugins submission (1-4 week review), Hugging Face Space push to the Hub.

**Next session entry point**: Phase 7 — Content batch 2 + Distribution prep (parallel streams). Stream A (`docs-writer`): 4 more posts (Forensics use cases / OSS metadata tools comparison / Photographer's batch workflow / Journalist source protection) + cross-post variants + Product Hunt launch copy + Show HN draft. Stream B (general): Indie Hackers / Crunchbase / SaaSHub / F6S / AlternativeTo entries + Awesome-list submission texts. See ROADMAP Phase 7.

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
