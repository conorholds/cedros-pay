# Cedros Data compare-and-set contract

Cedros Pay uses Cedros Data's schema-v1
`database.compare-and-set` import for concurrency-sensitive extension writes.
It requires `cedros-data:extension-storage-cas-v1`; the older
`database-concurrency-v1` name was a historical implementation label, not a
public capability. This extension requires Cedros Data 0.1.81 or later.

The semantic source pin is Cedros Data commit
`6a1ddc9beb31b6ab1765777365afeb576886c758`. Machine-readable provenance is in
[`cedros-data-guarded-batch-provenance.json`](cedros-data-guarded-batch-provenance.json).
The WIT world remains `cedros:extension@0.1.0`; compare-and-set is a named WIT
function whose typed result distinguishes applied mutations from conflicts.

## Request and response

The extension sends `database.compare-and-set` requests shaped as follows:

```json
{
  "schemaVersion": 1,
  "conditions": [
    {
      "contentModelId": "extension-owned:model",
      "entryKey": "stable-key",
      "predicate": "version",
      "expectedVersion": "opaque-host-version"
    }
  ],
  "ops": [
    {
      "op": "write",
      "contentModelId": "extension-owned:model",
      "entryKey": "stable-key",
      "data": {}
    }
  ]
}
```

Supported predicates are `absent` and `version`.
The host applies every operation atomically only when every condition matches.
The result is `applied` or `conflict`; storage, authorization, validation, and
capability errors remain distinct failures. Versions are opaque equality tokens
that rotate on every committed write and are never counters.

Older hosts cannot link the named import and do not satisfy the required CAS
capability. Pay also pins the current minimum host version and WIT checksum and
requires an exact durable policy marker before guarded routes or jobs perform
any other host interaction. It does not probe response shapes or fall back to
an unguarded write.

## Guarded-only enrollment

An authorized administrator or exact route capability calls
`POST /extensions/cedros-pay/admin/guarded-policy/enroll` with an empty JSON
object. Enrollment atomically applies `setWritePolicy` with
`policy: guarded-only` to the exact compiled model set and writes the marker at
`cedros-pay:guarded-write-policy-state/active`.

This one already-published enrollment operation remains isolated on the legacy
schema-v1 `database.batch` compatibility parser because the public CAS contract
accepts only record writes and deletes. No commerce mutation uses that parser.

The current set contains 18 models:

- `cedros-pay:access-passes`
- `cedros-pay:cart`
- `cedros-pay:catalog-fence`
- `cedros-pay:checkout-inventory-holds`
- `cedros-pay:checkout-operations`
- `cedros-pay:checkout-return-index`
- `cedros-pay:checkout-stock`
- `cedros-pay:commerce-ledger`
- `cedros-pay:credits`
- `cedros-pay:customer-cart-generations`
- `cedros-pay:customer-cart-lanes`
- `cedros-pay:customer-cart-operations`
- `cedros-pay:customer-cart-tombstones`
- `cedros-pay:customer-carts`
- `cedros-pay:program-access`
- `cedros-pay:subscriptions`
- `cedros-pay:ucp-sessions`
- `cedros-pay:webhook-outbox`

Their canonical digest is
`eb25861790db9cb6da3145426b0afb4dce17b29a39b70651c523f1ed720972b2`.
No request can supply or alter the model set, policy, marker key, minimum
semantic version, or host pin. Repeating an exact enrollment is an
idempotent success. A missing, reordered, extended, malformed, or stale marker
fails with `503 guarded_write_policy_unavailable`.

The source of truth for these constants is
[`server-wasm/domain/src/guarded_policy/contract.rs`](../server-wasm/domain/src/guarded_policy/contract.rs).
The classified writer inventory is
[`guarded-only-writer-inventory.json`](guarded-only-writer-inventory.json).

## Runtime rules

- Create-once records guard absence and treat a matching stored record as an
  idempotent replay only after comparing all identity-defining fields.
- Updates and deletes guard the last observed opaque version; a conflict must be
  reread and classified rather than overwritten.
- Multi-record money, inventory, cart, subscription, refund, return, dispute,
  program-access, and outbox transitions commit in one compare-and-set call.
- Provider calls are claimed durably before egress. Response loss reuses the
  original operation identity and never creates a fresh payment attempt merely
  to escape uncertainty.
- The control model remains writable for enrollment, but callers cannot use it
  to fabricate an active marker.
- Plain writes and deletes to enrolled models are rejected by the host.

All currently registered guarded routes and jobs enforce the exact marker. The
legacy one-time checkout and direct credits mutation aliases remain retired and
are not restored by enrollment. Returns and disputes are persisted guarded
commerce workflows; their local status transitions do not imply an external
provider action.

## Verification and release gate

Run from the repository root:

```sh
node scripts/validate-conditional-mutations.mjs
node scripts/check-guarded-writer-inventory.mjs
cargo test --manifest-path server-wasm/Cargo.toml -p cedros-pay-extension-domain guarded_policy
make cedros-verify
```

Repository tests prove the domain and host-simulation contract. Production launch
still requires the live exact 18-model policy matrix on Cedros Data 0.1.81 or
later and the joint Pay/Shop staging evidence recorded as missing in
[`cedros-extension.release-readiness.json`](../cedros-extension.release-readiness.json).
