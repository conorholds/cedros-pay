# AGENTS.md

## Priorities

Correctness > safety > repo consistency > simplicity > performance > elegance. Earlier rule wins conflicts.

## Scope

* Do only the requested work, fully, then stop. Prefer the smallest complete, correct diff.
* No drive-by refactors, cleanup, mass renames, dependency upgrades, repo-wide formatting, docs, reports, CI, or tooling unless asked.
* If scope expands materially, state why. Do not leave partial migrations or duplicate paths.

## Repo-first

* Read every applicable `AGENTS.md`; the nearest file wins.
* Never invent APIs, types, env vars, paths, commands, schemas, flags, or dependencies. Search first.
* Inspect relevant definitions, call sites, tests, config, and entry points.
* Reuse existing patterns and utilities; never create a parallel abstraction for an existing concern.
* Repo conventions override generic best practices.

## Design

* Follow existing architecture and dependency direction; avoid cycles.
* Prefer composition. Use interfaces only at real boundaries.
* UI must not bypass established services to perform IO; infrastructure must not depend on UI.
* Keep business rules out of views, handlers, and persistence when a domain layer exists.
* Split by responsibility, not line count. One clear job per unit.

## Execution

* For nontrivial work: inspect, plan in ≤3 bullets (`what / where / why`), implement, verify, and review the diff.
* When implementation is requested, do not stop at the plan.
* Implement real production behavior. No placeholders, fake success paths, speculative abstractions, or required-work TODOs.
* Update all affected call sites and remove replaced code.
* Preserve behavior, auth, tenancy, compatibility, and data integrity unless explicitly changed.
* Handle errors explicitly; validate trust boundaries; fail closed for auth and permissions.
* Never log or commit secrets, tokens, credentials, or unnecessary PII.
* Never hide root problems with ignored errors, unsafe casts, disabled checks, or lint/type suppressions.

## Verification

Use the strongest practical affected-scope checks:

1. Build/typecheck
2. Lint/format
3. Targeted unit tests
4. Relevant integration/e2e
5. Smoke test

* Logic changes need a happy-path and meaningful edge/failure-path test, or existing equivalent coverage.
* Add regression tests for bug fixes when practical.
* Never weaken tests or claim an unrun check passed.
* Avoid disproportionately expensive whole-repo builds; use targeted/static checks and report full verification as outstanding.
* Run `git diff --check` and inspect the final diff.

## Git and process safety

* Check `git status --short --branch` before editing.
* Treat pre-existing changes as user-owned. Do not overwrite, revert, stage, or commit unrelated work.
* Commit coherent, verified changes. When this repository is changed as a companion to another active workspace, push the task branch, open a PR, and merge it into main so the work is preserved remotely.
* For requested extension releases, build a versioned ZIP, copy it to the operator's designated extension archive directory, then use each site’s configured Cedros MCP connection to intake, verify, review, publish, upload, and confirm the active version on staging before production. A local ZIP or merged PR does not update installed extensions.
* Never force-push, hard-reset, rewrite history, delete branches, stash user work, or run destructive cleanup without approval.
* Never use `pkill -f`, `killall`, broad process names, or unverified PIDs. Resolve the exact PID, try normal `kill`, then use `kill -9` only if necessary.
* Do not modify global configuration, production systems, external services, or remote data unless asked.

## Reporting

End tersely with:

* Changes made
* Files touched + why
* Checks run + results
* Risks, assumptions, or verification gaps
* Genuine TODOs, maximum 3

Do not create a separate report unless requested. If nothing changed, say so.
