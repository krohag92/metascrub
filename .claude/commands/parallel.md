---
description: Invoke the orchestrator to run a batch of parallel work
argument-hint: <batch-description>
---

Invoke the `orchestrator` agent to coordinate parallel work.

Task for the orchestrator: $ARGUMENTS

The orchestrator should:
1. Analyze the task and identify independent workstreams.
2. Pick the right specialist agents.
3. Spawn them in parallel via the Task tool.
4. Reconcile their outputs.
5. Run a final `pnpm build && pnpm test` to verify the whole still works.
6. Update WORKLOG.md.
7. Report back with a structured summary.

Keep the parallel batch size to 4-5 agents max.
