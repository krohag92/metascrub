# Roadmap — Phase-based, Non-stop Execution

> No weeks, no calendar. Claude Code works through phases continuously until it hits context/usage limits, then resumes from `WORKLOG.md` in the next session.

## Execution principle

**Always be working on the next unstarted task.** When a phase completes, immediately start the next phase. Do not stop to ask "what's next" — read this file, pick the next unstarted item, execute. Only stop for:

- Explicit user approval gates (publishing, pushing, store submission)
- Genuine architectural ambiguity not covered in spec files
- Context window exhaustion (write WORKLOG.md entry and stop cleanly)
- Test failures that need user decision to resolve

When resuming a session: read `WORKLOG.md` → find last completed task → continue from the next one in this file.

## Phases (strict order — do not skip)

### Phase 1 — Foundation
**Goal**: Working TypeScript core + CLI on NPM, top 4 formats supported.

Sequential (each depends on previous):
1. Set up monorepo (pnpm workspaces + Turborepo + tsup + vitest)
2. Implement `@metascrub/core` skeleton: types, registry, dispatcher, public API
3. Implement JPEG parser + scrubber + tests
4. Implement PNG parser + scrubber + tests
5. Implement PDF parser + scrubber + tests
6. Implement DOCX parser + scrubber + tests
7. Build `metascrub` CLI with `view`, `scrub`, `compare`, `batch`, `formats` commands
8. Write README for core and CLI (link to metadatafinder.com)
9. GitHub repo public, GitHub Topics added
10. Local commits ready for push (Anton approves push and `npm publish`)

**Quality gate before Phase 2**: All tests pass. Core API frozen. README links checked.

### Phase 2 — Format coverage expansion
**Goal**: All formats from spec supported in TS core.

Can be parallelized within the phase (multiple `core-developer` invocations on different formats — each modifies a separate file in `packages/core/src/formats/`):
1. HEIC parser + scrubber + tests
2. WebP parser + scrubber + tests
3. AVIF parser + scrubber + tests
4. TIFF parser + scrubber + tests
5. RAW (CR2, NEF, ARW, DNG) parser + scrubber + tests
6. MP3 parser + scrubber + tests
7. FLAC parser + scrubber + tests
8. M4A, OGG, WAV parsers + tests
9. MP4 parser + scrubber + tests
10. MOV parser + scrubber + tests
11. MKV, WebM parsers + tests
12. XLSX parser + scrubber + tests
13. PPTX parser + scrubber + tests
14. EPUB parser + scrubber + tests
15. SVG parser + scrubber + tests
16. Update `supportedFormats()` and CLI `formats` command
17. Bump version, regenerate README example tables

**Quality gate**: every format has round-trip test passing. Bundle size still under budget.

### Phase 3 — Browser extension + Python port (parallel)
**Goal**: Extension submission-ready for 4 stores + PyPI package published-ready.

Two parallel workstreams (use `orchestrator` to spawn):

**Stream A — Browser extension** (`extension-developer`):
1. Scaffold Vite + crxjs project
2. Background service worker with context menus
3. Popup UI (React + Tailwind utilities)
4. Options page
5. Privacy policy page hosted on metadatafinder.com
6. Icons (16/32/48/128)
7. Screenshots for store listings (4-5)
8. Build production ZIPs for Chrome-family and Firefox
9. Draft store listings (Chrome, Edge, Opera, Firefox AMO)
10. Smoke test in Chrome and Firefox

**Stream B — Python package** (`python-developer`):
1. Set up `python/` folder with pyproject.toml
2. Port JPEG, PNG, PDF, DOCX, MP3 parsers
3. CLI mirroring TS CLI
4. Parity tests against TS core fixtures
5. Pandas integration
6. README with badges
7. Build wheel + sdist locally

**Reconciliation by `qa-engineer`**: bundle audit, parity test results, license audit.

**Quality gate**: extension ZIPs validate; Python parity tests within tolerance; ready for submission/publish on Anton's approval.

### Phase 4 — Developer integrations (parallel batch)
**Goal**: Six small wrappers ready for submission.

Use `orchestrator` to spawn multiple `integrations-developer` invocations (separate context per integration — they touch different folders):

1. **VS Code extension** (`packages/vscode/`)
2. **Obsidian plugin** (`packages/obsidian/`)
3. **Raycast extension** (`packages/raycast/`)
4. **n8n community node** (`packages/n8n-node/`)
5. **Figma plugin** (`packages/figma/`)

In parallel, `docs-writer` drafts store listings for each.

Then sequentially:
6. **Docker images** (`docker-developer`): CLI image + API server image, multi-arch builds locally
7. **Hugging Face Space**: Gradio demo using Python package, AI-detection bonus angle

**Quality gate**: each integration builds clean; manifest validates; README links present.

### Phase 5 — Desktop app + Content batch
**Goal**: Tauri desktop ready + first SEO content published.

Two parallel workstreams:

**Stream A — Desktop** (`desktop-developer`):
1. Scaffold Tauri 2 project
2. React UI (reuse extension popup components)
3. Three-pane layout: file list / detail / scrub options
4. Drag-and-drop folders
5. Batch progress
6. macOS Services menu entry
7. Windows Explorer right-click via Registry-on-install
8. Linux `.desktop` file + MIME associations
9. Build `.dmg`, `.msi`, `.deb`, `.AppImage` locally
10. Draft Flathub manifest

**Stream B — Content** (`docs-writer`):
1. "What is EXIF data and why should you care" (target: broad keyword)
2. "How to remove GPS from photos before posting online" (high-intent)
3. "How to strip metadata from a PDF" (high-intent)
4. "Word document metadata leaks — what's stored and how to clean it"
5. Draft cross-post versions for Dev.to / Hashnode / Medium with canonical URLs
6. Draft Substack post
7. Press kit at metadatafinder.com/press (boilerplate, logos, screenshots)
8. Privacy policy page at metadatafinder.com/extension/privacy

**Quality gate**: desktop installers build clean on each platform; 4 blog posts ready for Anton's review.

### Phase 6 — WordPress + Hugging Face polish
**Goal**: WordPress plugin submission-ready + HF Space polished.

Sequential:
1. WordPress plugin (`wordpress-developer`):
   - Main plugin file with proper WP header
   - readme.txt in WP format (NOT markdown — strict format requirements)
   - Settings page with preset picker
   - Upload hook (`wp_handle_upload`)
   - Bulk-cleaner admin page
   - PHP-native scrubber for JPEG/PNG/PDF
   - LICENSE (GPL-2.0+)
   - Smoke test in local WP install
   - All references to metadatafinder.com in place
2. Polish Hugging Face Space:
   - Better demo UI (Gradio)
   - AI-generated image detection bonus feature
   - README with backlinks to metadatafinder.com and GitHub

**Quality gate**: WP plugin passes plugin-check WP-CLI command; HF Space deployable.

### Phase 7 — Content batch 2 + Distribution prep
**Goal**: More content published + everything ready for the launch wave.

Parallel:

**Stream A — More content** (`docs-writer`):
1. "Forensics use cases: catching metadata in leaked documents"
2. "Open source metadata tools compared: ExifTool, MAT2, MetaScrub"
3. "Bulk-cleaning client photos: a photographer's workflow"
4. "How journalists protect sources by checking metadata"
5. Cross-post versions for each
6. Product Hunt launch copy + maker comment thread plan
7. Show HN post draft + best-time suggestion

**Stream B — Distribution prep** (`docs-writer` + general):
1. Indie Hackers profile draft for Anton (founder profile + product page)
2. Crunchbase entry draft for metadatafinder.com
3. SaaSHub listing draft
4. F6S profile draft
5. AlternativeTo entry draft (compare to ExifTool, Adobe Bridge, ImageOptim, PDFsam)
6. Awesome-list submission texts (PRs to: awesome-cli-apps, awesome-nodejs, awesome-python, awesome-privacy, awesome-osint, awesome-selfhosted, awesome-chrome-extensions, awesome-vscode, awesome-obsidian, awesome-raycast, awesome-figma, awesome-n8n)

**Quality gate**: all listings drafted, ready for Anton to submit through the actual web forms (most require manual submission).

### Phase 8 — Mobile apps (LAST, due to verification complexity)
**Goal**: iOS and Android apps ready for store submission.

Mobile is last because:
- App Store review is the slowest (1-7 days per submission, frequent rejections)
- Verification requires Apple Developer Program ($99/year), provisioning profiles, signing certs
- iOS Share Extension needs native Swift work
- Both stores require manual screenshot prep at multiple device sizes
- Each rejection cycle delays everything else if we depend on it
- All other channels can launch independently and start driving links while mobile is still in review

Sequential:
1. Scaffold Capacitor 6 project (`packages/mobile/`)
2. Reuse extension popup UI as the mobile UI
3. Bottom tab nav: Home / Scrub / Settings
4. File picker integration (@capacitor/filesystem)
5. Share functionality (@capacitor/share)
6. iOS Share Extension (Xcode native target — Swift)
7. Android Share Intent (AndroidManifest.xml)
8. App icons at all required sizes (iOS + Android matrices)
9. Screenshots at required device sizes (iPhone 6.7", iPhone 6.1", iPad 12.9", Android phone, Android tablet)
10. Privacy nutrition label (iOS) — fill out the form draft
11. Data Safety form (Google Play) — fill out draft
12. App Store Connect listing copy (EN, optionally UA + PT later)
13. Play Store listing copy (EN, optionally UA + PT later)
14. Local builds for both platforms
15. Test on real devices if Anton has access

**Quality gate**: builds complete, signing instructions documented in `packages/mobile/SIGNING.md` for Anton to follow manually (signing happens on his machine with his keys).

## Beyond Phase 8

Lower-priority items that can be picked up between phases or after everything else:

- Safari extension (Xcode wrapping, App Store Connect submission)
- Mac App Store submission of the Tauri desktop
- Microsoft Store submission of the Tauri desktop
- Shopify App Store (significant work — has own auth, billing API)
- Zapier integration (their Platform CLI)
- Make.com integration
- Conda-forge recipe
- Homebrew formula (wait until ~500 GitHub stars)
- Translation of listings to Ukrainian and Portuguese
- More content (target: 1-2 SEO posts per month indefinitely)
- Sessionize speaker profile + talk pitch: "Building 15 distribution channels from one core"

## Parallelism guidance

| Phase | Parallel possible? | How to spawn |
|---|---|---|
| 1 | No | Sequential, one agent at a time |
| 2 | Yes (format parsers are isolated files) | `orchestrator` with 3-4 `core-developer` invocations |
| 3 | Yes (2 streams) | `orchestrator` spawning `extension-developer` + `python-developer` |
| 4 | Yes (5+ integrations + docs in parallel) | `orchestrator` spawning multiple `integrations-developer` + `docs-writer` |
| 5 | Yes (desktop + content) | `orchestrator` spawning `desktop-developer` + `docs-writer` |
| 6 | No (WP then HF) | Sequential |
| 7 | Yes (2 streams of writing) | `orchestrator` with 2 `docs-writer` invocations |
| 8 | No (native bits are interdependent) | Sequential, one `mobile-developer` |

Max parallel agents at any moment: **5**. More than that and coordination overhead exceeds gain.

## Non-stop execution protocol

Each completed task:
1. Run quality gate for that task (tests, lint, format).
2. Commit locally with conventional message.
3. Append one-line WORKLOG entry.
4. Move to next unstarted task without asking.

End of phase:
1. Run full quality gate for the phase.
2. Append a phase-summary section to WORKLOG.
3. Move to next phase without asking.

When context fills up:
1. Write a "session ending" WORKLOG entry: last task completed, next task, any state Claude needs to know on resume.
2. Stop cleanly. Don't start a new task in the dying breaths of context.

When hitting a true blocker:
1. Append a `**Blockers**:` section to the current WORKLOG entry describing the decision needed.
2. Stop and ask Anton with a specific yes/no or A/B question. Not "what should we do" — "I'm about to do X for reason Y, unless you object".

## What success looks like

Order of milestones (rough):

1. **Foundation done**: `@metascrub/core` + `metascrub` CLI ready for NPM publish.
2. **Format coverage**: all spec formats supported.
3. **Extension + Python**: 4 extension stores + PyPI ready.
4. **Dev integrations**: VS Code + Obsidian + Raycast + n8n + Figma + Docker + HF Space ready.
5. **Desktop + content**: Tauri builds + 4 blog posts ready.
6. **WordPress**: WP plugin submission-ready.
7. **Content batch 2 + distribution prep**: 4 more posts, all listings drafted.
8. **Mobile**: iOS + Android apps ready for submission.

**Total**: ~15+ distribution channels prepared. Mobile is the slowest path; everything else can be live before mobile clears review.
