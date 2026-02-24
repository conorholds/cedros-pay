# Shared Module Migration Rules

This repo currently has mirrored code under:

- `src/**` (web package)
- `react-native/src/**` (React Native package)

To prevent drift from getting worse while we migrate to shared modules, follow these rules.

## Rules

1. Prefer shared modules first.
   - If logic is platform-agnostic, place it in one shared implementation and import it from both targets.
2. Avoid introducing new mirrored file paths.
   - Adding the same relative file path under both trees should be treated as a temporary exception.
3. Keep platform-only behavior at boundaries.
   - Isolate platform differences in thin wrappers (providers, runtime adapters, platform-specific UI shells).
4. If you must add a mirrored file pair:
   - Add the minimal pair required.
   - Open a follow-up task to consolidate.
   - Update duplication baseline intentionally.

## Duplication Guard

Use:

```bash
npm run check:duplication:report
```

CI enforcement uses:

```bash
npm run check:duplication
```

The guard compares current mirrored file paths against `scripts/duplication-baseline.json` and fails CI when new mirrored paths are introduced.

## Updating Baseline

Only update `scripts/duplication-baseline.json` when a mirrored path is intentionally accepted. Include rationale in the PR description.
