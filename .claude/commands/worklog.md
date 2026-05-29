---
description: Append a structured entry to WORKLOG.md
argument-hint: <short-description>
---

Append a structured entry to `WORKLOG.md` summarizing what was just done.

Format the entry like this:

```markdown
## <YYYY-MM-DD HH:MM> — $ARGUMENTS

**Done**:
- bullet points of what was completed

**Tests**:
- pass/fail counts, key test outcomes

**Next**:
- what should happen next

**Blockers** (if any):
- what's blocking progress
```

If `WORKLOG.md` doesn't exist, create it with a title header first.

Don't invent content — base the entry on what was actually done in this session. Use `git log --oneline` since the last worklog entry to refresh memory if needed.
