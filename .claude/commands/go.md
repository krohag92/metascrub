---
description: Start or resume non-stop execution from where the roadmap left off
---

You are now in **non-stop execution mode**. Work continuously through the roadmap until you hit a hard limit (context window, usage cap, or a true blocker requiring user input).

Bootstrap sequence:

1. Read `WORKLOG.md` if it exists. Find the most recent session-ending entry. It will name the last completed task and the next task to start.
2. If no WORKLOG yet, this is the first session. Start with Phase 1, task 1 of `ROADMAP.md`.
3. Read `CLAUDE.md` for autonomy rules (you have broad permissions; refer to it for what's allowed without asking).
4. Read `ROADMAP.md` to locate the next task and understand the surrounding phase.
5. Read the relevant package spec MD (`CORE.md`, `CLI.md`, etc.) for the task at hand.
6. Check `git status` and `git log --oneline -5` to confirm code state.
7. Run a quick health check if a build exists: `pnpm install && pnpm build && pnpm test` (skip if no `package.json` yet).

Then execute non-stop:

- Pick the next unstarted task from `ROADMAP.md`
- Do the work
- Run the task's quality gate (tests, lint, format)
- Commit locally with a conventional commit message
- Append a one-line WORKLOG entry
- Pick the next task and continue without asking

When you naturally fit a parallel batch (Phase 2 onward where the roadmap explicitly says parallel is OK), invoke the `orchestrator` agent instead of doing it serially.

Stopping conditions (the ONLY reasons to halt and report):

- A `deny`-listed action is required (push, publish, store submission) — ask Anton explicitly
- A genuine architectural decision not covered by spec files — frame as a yes/no question
- Tests fail in a way that suggests a spec ambiguity, not a bug you can fix — describe and ask
- You're approaching context limit — write a clean session-ending WORKLOG entry, then stop

Do NOT stop to:
- Summarize what you just did (that's WORKLOG's job)
- Ask "should I continue" (yes, always, that's why this command exists)
- Wait for praise (Anton is not at the keyboard, he's running this overnight)
- Recap the project (Anton wrote the specs, he knows them)

Now begin.
