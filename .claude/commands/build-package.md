---
description: Run the full build pipeline for a single package
argument-hint: <package-name>
---

Run the complete build pipeline for package `$ARGUMENTS`.

Steps:

1. Locate the package — check `packages/$ARGUMENTS/`, then `python/` if `$ARGUMENTS` is "python", then `wordpress/` if "wordpress".
2. Read the corresponding spec MD (`CORE.md`, `CLI.md`, etc.) for that package.
3. Install dependencies if needed.
4. Run typecheck.
5. Run tests.
6. Run linter and formatter.
7. Run production build.
8. Report:
   - Build artifact path and size
   - Test count (pass/fail)
   - Linter findings
   - Anything that needs Anton's attention before publish/submit

Stop on first failure and report the failure clearly. Don't try to fix issues outside the package without asking.
