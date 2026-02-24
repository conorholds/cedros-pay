---
description: Double-check your work end-to-end
---
Double-check your work end-to-end. Do not block on interactive prompts.

SNAPSHOT
- Task slug + branch
- Last 1–2 commits (subjects)
- `git status --porcelain` summary

VERIFICATION
1) Acceptance: build/lint/typecheck; run ONLY relevant tests if functional changes.
2) UX/CLI sanity: run non-interactive commands and capture 3–5 key lines of output.
3) Data validation: verify counts/timestamps/etc. against the stated source of truth.
4) Hygiene scan: no secrets/large blobs/debug logs/TODOs/dead code/inconsistent copy.
5) Git/PR: on correct branch; all intended changes committed; PR exists and is ready.

OUTPUT (concise)
- A PASS/FAIL line per check with a short evidence snippet.
- If any FAIL: list the smallest set of fixes, then either apply them or ask ONE grouped clarification if blocked.
