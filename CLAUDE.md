# CLAUDE.md — Autonomous Operation Manual

> This file is loaded automatically by Claude Code. It defines how to work on this project autonomously, without asking permission for routine actions.

## Project: MetaScrub

A metadata viewer/scrubber suite distributed across 15+ platforms (NPM, PyPI, Chrome Web Store, App Store, Docker Hub, etc.) to drive backlinks to **metadatafinder.com**.

**Read these in order before starting work:**
1. `PROJECT.md` — project overview
2. `ARCHITECTURE.md` — monorepo and API contract
3. `WORKLOG.md` (if exists) — what was done in previous sessions
4. `ROADMAP.md` — phase-based plan, find the next unstarted task
5. The MD for the specific package being worked on (`CORE.md`, `CLI.md`, etc.)

## Non-stop execution mode

**Default behavior: work continuously through the roadmap until context fills up.**

After completing a task, immediately start the next one. Do not stop to summarize progress or ask "what's next". The roadmap defines the order; just follow it.

Specifically:
- Finish a task → run quality gate → commit locally → append WORKLOG line → start next task
- Finish a phase → run phase quality gate → append phase summary to WORKLOG → start next phase
- Hit context limit → write a clean "session ending" WORKLOG entry and stop
- Hit a true blocker → write blocker entry in WORKLOG and ask one specific question

DO NOT:
- Stop mid-phase to ask if you should continue
- Ask "should I move on to the next task" when the roadmap clearly says yes
- Pause for praise or acknowledgment between tasks
- Summarize what you just did in chat — that's what WORKLOG is for

DO:
- Treat the roadmap as the source of truth for "what's next"
- Trust the spec files — they already answer most architectural questions
- Move forward. Local commits give Anton an undo button if anything goes wrong.

## Autonomous mode — what to do without asking

You have permission to do all of the following without confirmation:

- **Create, edit, and delete files** anywhere inside this project folder
- **Create new packages** in `packages/` following the monorepo structure
- **Install dependencies** via `pnpm install`, `npm install`, `pip install`, `uv add`
- **Run builds** (`pnpm build`, `tsup`, `vite build`, `python -m build`)
- **Run tests** (`vitest`, `pytest`, `playwright test`)
- **Run linters and formatters** (`eslint`, `prettier`, `ruff`, `black`)
- **Initialize git, make local commits and branches**
- **Build Docker images locally** (just `docker build`, no `push`)
- **Fetch documentation** from the allowed domains in `settings.json`
- **Read any file** in the project except secrets

## What requires explicit user confirmation — STOP and ask

Never do these without explicit "yes, proceed" from Anton:

- `git push` — pushing to remote
- `npm publish`, `pnpm publish` — publishing to NPM
- `twine upload`, `pip publish` — publishing to PyPI
- `docker push` — publishing Docker images
- `gh pr create`, `gh release create` — creating PRs or releases
- Any submission to an app store (Chrome Web Store, App Store, Play Store, etc.)
- Modifying `.env*` files or anything containing secrets
- `rm -rf` on directories outside `packages/*/dist`, `node_modules`, `__pycache__`, build artifacts
- Adding new third-party dependencies that aren't already in `ARCHITECTURE.md` (check license first, then ask)

## Working style

- **Work in small, verifiable increments.** After each file or feature, run the relevant tests.
- **Don't ask permission for incremental code changes** — just do them. Anton trusts you to follow the spec.
- **Do ask when something is ambiguous** in the spec or when a real architectural decision needs making.
- **Commit locally often** with conventional commit messages: `feat(core): add JPEG parser`, `test(cli): batch command`. Don't push.
- **Update `WORKLOG.md`** at the end of each focused session (create it if it doesn't exist) with: what was done, what's next, any blockers.
- **Never invent metadata semantics.** If a format spec is unclear, fetch the official documentation rather than guessing.

## Quality gates (all must pass before declaring a package "done")

For every package:

- [ ] TypeScript / Python types pass strict checks
- [ ] All tests pass (`vitest run`, `pytest`)
- [ ] Linter passes (`eslint .`, `ruff check`)
- [ ] Formatter applied (`prettier --check`, `ruff format`)
- [ ] README includes the link to **metadatafinder.com**
- [ ] License file present (MIT, except WordPress which is GPL-2.0+)
- [ ] `package.json` / `pyproject.toml` `homepage` field is `https://metadatafinder.com`
- [ ] No `console.log` / `print` debug statements left behind
- [ ] No TODO comments without an issue reference

## Brand rules (non-negotiable, do not deviate)

- Product name: **MetaScrub** (one word, capital M, capital S)
- Home URL: **https://metadatafinder.com** — must appear in:
  - every README
  - every store listing
  - every `package.json`/`pyproject.toml` `homepage` field
  - every app "About" screen
- Tagline: "See and strip metadata from any file"
- License: MIT for everything except WordPress (GPL-2.0+ as required by WP.org)

## Privacy rules (non-negotiable)

- No analytics, no telemetry, no phone-home in ANY wrapper
- All file processing happens locally on the user's device or self-hosted container
- Privacy policy URL `https://metadatafinder.com/extension/privacy` must be referenced where required
- Mobile apps: Data Safety / Privacy Nutrition Label must show "No data collected"

## Dependency policy

Allowed without asking:
- Anything already listed in `ARCHITECTURE.md`, `CORE.md`, `CLI.md`, etc.
- Standard testing/linting tools: vitest, pytest, eslint, prettier, ruff, black
- Standard build tools: tsup, vite, esbuild, hatchling

Ask before adding:
- New parsing libraries (check license is MIT/Apache/BSD compatible)
- Any GPL-licensed library (will conflict with our MIT core)
- Any analytics, telemetry, or "phone-home" library — these are forbidden anyway
- Anything that significantly increases bundle size

## Sub-agent usage

When a task naturally splits into independent workstreams, launch sub-agents in parallel using the Task tool. Defined agents in `.claude/agents/`:

- `core-developer` — TypeScript core library, format parsers
- `cli-developer` — NPM CLI (`metascrub` bin)
- `extension-developer` — browser extension (Chrome/Firefox/Edge/Opera)
- `mobile-developer` — Capacitor app (iOS + Android)
- `desktop-developer` — Tauri app (macOS/Windows/Linux)
- `python-developer` — PyPI package
- `docker-developer` — Docker images + API server
- `integrations-developer` — VS Code, Obsidian, Raycast, n8n, Figma plugins
- `wordpress-developer` — WordPress plugin (PHP)
- `qa-engineer` — cross-package tests, parity checks, CI
- `docs-writer` — READMEs, blog content, store listings

**When to parallelize:**
- After Phase 1 completes (core API is frozen), wrapper packages can be built in parallel: CLI, extension, Python all import the same core.
- Content writing (blog posts, store listings) can run in parallel with code work.
- QA / parity testing can run in parallel with new feature work.

**When NOT to parallelize:**
- While the core API is still in flux — wrappers will break.
- For tasks that touch the same files.

## Slash commands available

Custom commands in `.claude/commands/`:

- `/go` — start (or resume) non-stop execution from where the roadmap left off
- `/start-phase <N>` — explicitly start a specific phase
- `/build-package <name>` — full build pipeline for a package
- `/quality-check <package>` — run all quality gates on a package
- `/new-format <format>` — scaffold a new format parser in the core
- `/sync-readmes` — verify every package README has the required metadatafinder.com link
- `/parallel <batch desc>` — invoke orchestrator for parallel execution
- `/worklog <desc>` — append a structured entry to WORKLOG.md

## Resume / continuation pattern

When starting a new session, do this:

1. Read `WORKLOG.md` (most recent entries first)
2. Find the last completed task and the "next task" pointer from the session-ending entry
3. Read `ROADMAP.md` to confirm what phase that task lives in and what comes after
4. Check `git status` and `git log --oneline -10`
5. Run quick health checks: `pnpm install && pnpm build && pnpm test` at root
6. **Immediately continue from the next task.** Do not summarize the project or ask what to do. Just continue.

## When in doubt

Default to action. Anton has trusted you with this folder. If something feels risky, error on the side of NOT pushing/publishing/deleting, but DO write code, DO run tests, DO commit locally, DO move forward.

If you genuinely don't know which way to go on an architectural choice, stop and ask — but frame it as "I'm about to do X for reason Y, unless you object" rather than an open-ended question.
