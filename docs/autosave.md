# Admin autosave

Cedros Pay's admin UI uses one internal autosave engine under
[`ui/src/autosave`](../ui/src/autosave). It is bundled into the private admin
runtime and is not a public `@cedros/pay-react/autosave` package export.

## Product rules

Autosave is appropriate for reversible, low-risk edits such as descriptions,
display labels, page copy, presentation defaults, and existing product or plan
drafts. Explicit confirmation remains required for creation, deletion,
credentials, permissions, publication, payments, refunds, returns, compliance,
tax, provider calls, and on-chain actions.

Current autosaved surfaces include:

- subscription page copy;
- commerce feature visibility;
- content monetization and tipping defaults;
- existing product and variation edits;
- existing subscription plan edits; and
- provider/category configuration fields and enablement toggles.

## Implementation contract

New autosave behavior must use `useCedrosAutosave` or the existing admin wrapper
instead of adding its own timer, retry loop, status labels, or network loop. A
resource definition supplies validation, persistence, identity, debounce class,
and safe telemetry metadata.

The shared engine provides:

- debounced latest-draft persistence;
- one active request per resource with queued follow-up work;
- offline queue persistence and replay;
- stable idempotency, editing-session, and client-sequence metadata;
- stale-response fencing and explicit conflict/error states;
- reduced-motion-aware shared status and conflict UI; and
- redacted telemetry that never contains draft values.

Where a route implements the field-masked protocol, writes use `If-Match` and
`Idempotency-Key`, reject unsupported fields, and return a new ETag on success.
Whole-resource compatibility wrappers remain internal migration seams; do not
present them as protocol-complete endpoints.

## Review checklist

- The resource is safe to save without explicit confirmation.
- Initial load and refresh do not trigger a write.
- A pending local edit cannot be overwritten by polling or stale responses.
- Repeated or reordered responses cannot report the wrong draft as saved.
- Errors and conflicts remain visible and retryable without discarding the draft.
- Secrets and personal data do not enter queue keys, telemetry, or logs.
- Tests cover a successful edit and a meaningful failure/conflict path.

Run the guardrail and focused UI tests from the repository root:

```sh
make check-autosave
npm --prefix ui test -- src/__tests__/autosave/useCedrosAutosave.test.tsx
npm --prefix ui test -- src/__tests__/admin/subscriptionPageCopy.test.tsx
```

The audit rejects ad hoc autosave loops outside the shared module and the
approved admin compatibility wrapper.
