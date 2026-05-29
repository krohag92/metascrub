---
description: Explicitly start a specific phase of the roadmap
argument-hint: <phase-number>
---

Start Phase $ARGUMENTS of `ROADMAP.md`.

Steps:

1. Read `ROADMAP.md`, jump to the "Phase $ARGUMENTS" section.
2. Read `WORKLOG.md` to see if any tasks from this phase are already done.
3. Verify the previous phase's quality gate passed (check WORKLOG for the previous phase summary).
4. If the previous phase isn't done, stop and ask Anton to confirm jumping ahead is intentional.
5. Otherwise, identify the next unstarted task in Phase $ARGUMENTS and start executing.

After starting, follow non-stop execution rules from `/go`:
- Complete task → quality gate → commit → WORKLOG entry → next task
- Don't ask "should I continue" — yes, always
- Stop only on real blockers or context exhaustion

If Phase $ARGUMENTS allows parallel execution (check the table in `ROADMAP.md`), invoke the `orchestrator` agent to coordinate.
