# .claude/ — Claude Code configuration

This folder configures how Claude Code works on the MetaScrub project. It enables autonomous operation and parallel sub-agents.

## Files

### `settings.json`
Project-level settings that Claude Code loads automatically:

- **`defaultMode: "acceptEdits"`** — Claude doesn't ask for confirmation on edits or routine bash commands.
- **`permissions.allow`** — pre-approved actions: file edits, builds, tests, lint, format, local git, local docker builds, package manager commands.
- **`permissions.deny`** — explicitly forbidden actions:
  - Pushing to git remotes
  - Publishing to NPM / PyPI / Docker Hub
  - Creating GitHub PRs or releases
  - Reading or editing `.env*` files
  - Anything with `sudo` or destructive `rm -rf`
- **`env`** — project-wide env vars (brand URL, repo, license).

### `agents/`
Sub-agent definitions. Each is a specialist with its own system prompt, allowed tools, and model choice. Available agents:

| Agent | Model | Domain |
|---|---|---|
| `core-developer` | opus | `packages/core/` — TS core library |
| `cli-developer` | sonnet | `packages/cli/` — NPM CLI |
| `extension-developer` | sonnet | `packages/extension/` — browser ext |
| `python-developer` | sonnet | `python/` — PyPI package |
| `mobile-developer` | sonnet | `packages/mobile/` — Capacitor app |
| `desktop-developer` | sonnet | `packages/desktop/` — Tauri app |
| `docker-developer` | sonnet | `docker/` — images + API |
| `integrations-developer` | sonnet | VS Code / Obsidian / Raycast / n8n / Figma |
| `wordpress-developer` | sonnet | `wordpress/` — WP plugin |
| `qa-engineer` | sonnet | cross-package tests, CI, parity |
| `docs-writer` | sonnet | READMEs, store listings, blog |
| `orchestrator` | opus | parallel work coordinator |

### `commands/`
Slash commands you can use in any Claude Code session:

- `/go` — **start or resume non-stop execution** from where the roadmap left off
- `/start-phase <N>` — explicitly start a specific phase
- `/build-package <name>` — full build pipeline for a package
- `/quality-check <name>` — run all quality gates
- `/new-format <name>` — scaffold a new format parser in core
- `/sync-readmes` — verify brand consistency across READMEs
- `/worklog <desc>` — append session log entry
- `/parallel <batch desc>` — invoke orchestrator for parallel execution

## How to use

### Non-stop session

```bash
cd metascrub
claude
```

In the session, just type:

```
/go
```

Claude reads `WORKLOG.md` to find where work was last left off (or starts at Phase 1 if it's the first session), checks git state, and starts executing. It writes code, runs tests, commits locally, moves to the next task — all without asking. It only stops to ask if it hits a publish/push action, a true architectural decision, or context limits.

You can leave it running. When you come back, just type `/go` again and it resumes from the WORKLOG.

### Parallel sprint

```
/parallel Build the CLI, browser extension MVP, and Python port simultaneously now that the core API is stable
```

The orchestrator spawns three specialist agents in parallel. Each works in its own context window, then reports back.

### Manual agent invocation

You can also explicitly request an agent in plain language:

```
Use the core-developer agent to add HEIC support
```

### Resuming work

When starting a new session, just say "continue" — Claude will read WORKLOG.md and proceed.

## What still requires your explicit approval

Despite autonomous mode, these always stop and ask:

- `git push`
- `npm publish`, `pnpm publish`
- `twine upload` (PyPI publish)
- `docker push`
- `gh pr create`, `gh release create`
- Any store submission
- Modifying `.env*` or secrets
- Adding dependencies not pre-approved in `ARCHITECTURE.md`

## What if Claude does something I don't like

Three levels of intervention:

1. **In-session**: just tell Claude. "Stop and revert the last change." It will.
2. **Per-session**: launch with `--permission-mode plan` to make Claude propose before acting.
3. **Project-wide**: edit `settings.json` and move actions from `allow` to `deny`.

You can also wipe local commits with `git reset --hard <sha>` since nothing has been pushed.

## Tips

- The `acceptEdits` mode is bold but recoverable. Local commits give you an undo button.
- If you want a stricter session, run `claude --permission-mode plan` once instead of editing settings.
- Sub-agents have independent context — they don't see the main session's history. Give them complete task descriptions.
- The `orchestrator` is best used when you've already verified the core API is stable. Don't parallelize while the foundation is moving.
