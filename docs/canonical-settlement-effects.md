# Canonical Settlement Effects

Canonical checkout settlement persists downstream work before returning a paid outcome. Stripe,
credits, and x402 all use the same durable effect contract.

## Atomic persistence

A paid settlement writes one `canonicalSettlementEffect` record to
`cedros-pay:webhook-outbox` in the same compare-and-set transaction as its checkout, quote claim, ledger,
inventory, and rail-specific state. The write is guarded by an `absent` condition on the effect
key. A conflict or storage failure therefore commits none of those mutations.

The commerce-ledger row receives the same trusted buyer subject and complete,
deduplicated purchased-product set used by the entitlement targets. This makes
the normal Pay entitlement read authoritative immediately after settlement,
without waiting for asynchronous event delivery or requiring a separate
Presale/launch-reservation record. `productId` remains the primary compatibility
projection and `productIds` carries every product in a multi-line checkout.

Terminal settlements do not create an effect record. Their checkout intent is marked dispatched
because there is no paid-settlement work to deliver.

The effect key is a SHA-256-derived identifier over the canonical checkout operation, quote,
material fingerprint, payment rail, and a hash of the provider reference. Raw provider references
are not stored in the outbox record. Every target also has a deterministic
`effect-target:<sha256>` identifier.

## Delivery lifecycle

Effect records move through these states:

- `effect_pending`: eligible at `nextAttemptAt`.
- `effect_leased`: owned by one worker until `leaseExpiresAt`.
- `effect_delivered`: every target is durably checkpointed as delivered.

The existing `cedros-pay:webhook-delivery` job processes both HTTP webhook items and canonical
settlement effects. Claims and target checkpoints are host-version-fenced guarded writes. Expired
leases are recoverable after restart, and pending work is merged with expired work by due time so
neither queue can starve the other. Each invocation handles at most 100 effect records and at most
eight targets per claim.

Failures store only a stable error code and schedule capped exponential backoff. Pending and leased
effect rows are never removed by cleanup. Delivered rows follow the existing outbox retention
policy.

## Delivery semantics

Delivery is at least once across a process crash between downstream acceptance and the guarded
checkpoint. Consumers must deduplicate by the supplied deterministic target identifier:

- `payment-succeeded`: `idempotency_key`.
- `checkout-settled`: `idempotencyKey`.
- `entitlement-changed`: `sourceRef`.
- CRM `purchase.completed`: `eventId`.

After every target is checkpointed, the worker atomically marks the effect delivered and sets the
checkout's `settlementEffect.dispatched` flag. A partially delivered effect resumes only its
remaining targets.

## Data handling

Outbox keys, target identifiers, retry errors, and provider-reference material are PII-free. The
CRM and entitlement payloads use only the trusted authenticated subject stored with the canonical
checkout; caller-supplied contact data is neither persisted in the effect nor emitted by the
worker. Logs and retry state never include downstream error messages or provider responses.
