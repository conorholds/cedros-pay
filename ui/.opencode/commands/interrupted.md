---
description: Reconstruct context and continue after interruption
---
You were interrupted. Reconstruct and continue safely.

1. Rebuild context from history: task slug, branch, last successful step, next planned step.
2. Workspace check: `git status --porcelain`; stash/restore if needed; ensure clean runnable state.
3. Re-run the last verification step (build/lint/type/tests relevant to the change) to confirm state.
4. Continue with the next planned step and report progress.

OUTPUT
- Last known good state
- Actions taken to restore state
- Next step (exact command)
- Any risks/uncertainties (1–2 bullets max)
