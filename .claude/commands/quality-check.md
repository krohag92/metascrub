---
description: Run all quality gates on a package
argument-hint: <package-name>
---

Invoke the `qa-engineer` agent to run all quality gates on package `$ARGUMENTS`.

The gates (from CLAUDE.md):
- TypeScript / Python types pass strict checks
- All tests pass
- Linter passes
- Formatter applied
- README includes link to metadatafinder.com
- License file present and correct
- homepage field is https://metadatafinder.com
- No debug statements
- No untracked TODO comments

Report a checklist with pass/fail for each gate and a recommended fix for any failure.
