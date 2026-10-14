# Financial state invariants

Cedros Pay is the canonical owner of commerce balances, credit movements,
payments, subscription projections, invoices, refunds, and their entitlement
effects. Cedros Balance independently owns its credit ledger, reservations, and
transfers; its published rail is not a projection or fallback for Pay commerce credits.
Pay currently declares optional Balance read discovery only and does not invoke
Balance ledger operations. Cedros Wallet/Core owns wallet custody and
policy-bound signing; a signature is evidence of authorization, not a second ledger.

## Authoritative records

| State | Pay record | Authority and identity |
| --- | --- | --- |
| Credit balance and holds | `cedros-pay:credits` | `acct:{subject}`, immutable `txn:{sourceRef}`, and `hold:{holdId}` |
| Payments, invoices, refunds | `cedros-pay:commerce-ledger` | Pay reference plus immutable provider identity or on-chain signature |
| Subscription and entitlement source | `cedros-pay:subscriptions` | Pay subscription id with provider id, current provider Price, status, and period end |
| Stripe event receipts and economic identity fences | `cedros-pay:webhook-outbox` | Exact event fingerprint, PaymentIntent, and invoice identity |
| Usage/capacity purchases and grants | Pay capacity records in `cedros-pay:subscriptions` | Signed contract request key, immutable offer snapshot, purchase/revision identity |

All authoritative mutations use the guarded compare-and-set boundary. A balance,
ledger, subscription, inventory, or event receipt must never be updated as a
separate best-effort write from the economic operation it represents.

## Invariants

- Money is an integer count of minor or token atomic units. Currencies are exact
  uppercase three-letter codes. Financial paths reject overflow, underflow,
  negative amounts, and malformed provider amounts instead of rounding or
  saturating them.
- A credit account has `0 <= heldCents <= balanceCents`. Every debit/grant has one
  immutable transaction fingerprint, and account plus transaction commit
  atomically. Available balance is `balanceCents - heldCents`.
- A succeeded payment has a positive gross amount and one provider settlement
  identity. One Stripe PaymentIntent, invoice, x402 signature, native-store
  transaction, or credit source reference cannot create two economic payments.
- For a payment, `0 <= refundCents <= grossCents`. A discrete refund has its own
  immutable provider/refund identity. Refund/reversal state and the parent
  payment total commit atomically; the ledger net is `grossCents - refundCents`.
- Stripe provider idempotency keys bind the host site and operation. Existing
  in-flight claims without that binding fail closed and require reconciliation
  before another attempt; changing the provider key must never silently repay.
- Admin refunds and Stripe refund events share the `re_...` ledger identity.
  Charge refund snapshots apply identified refund deltas in one guarded batch,
  never the cumulative charge total as another refund. Missing/paginated or
  oversized snapshots require individual `refund.*` deliveries. Legacy synthetic
  refunds without a provider identity require reconciliation; amount equality
  alone cannot identify a refund.
- A Stripe invoice payment is a normal Pay ledger payment keyed by invoice id and
  bound to its PaymentIntent. Replayed events with new event ids do not create a
  second ledger row or payment/renewal effect. Positive invoice settlement requires
  a retrieved, succeeded PaymentIntent with matching customer, currency, amount,
  and amount received. Out-of-band and ambiguous multi-payment allocations fail
  closed. An invoice never changes subscription access or its period. Recurring
  Stripe, Solana, and native-store ledger payments never grant permanent access;
  their subscription projection remains the entitlement authority.
- Subscription access is granted only for `active` or `trialing` records with a
  parseable future period end. Provider lifecycle events are ordered
  monotonically; terminal records cannot be reactivated by late events. Current
  provider Price and period changes (including shorter periods) update the Pay
  projection and trigger entitlement reconciliation. Equal-time conflicting
  access terms wait for provider reconciliation. A stale reconciliation loses
  its entire guarded update instead of merging over a newer webhook.
- Stripe Customer ids are stored separately from Cedros entitlement subjects.
  Legacy subject-based records acquire that binding only from matching trusted
  provider metadata. Ownership and operation claims survive lifecycle updates.
- Capacity grants share the commerce PaymentIntent uniqueness fence. Service
  state uses only each grant's latest revision; a fully refunded or disputed
  grant cannot keep service active through its historical paid revision.
- The subscription sync worker revisits active, trialing, incomplete, paused,
  unpaid, and past-due states. Provider recovery may restore access; local expiry
  only removes access and never invents a provider settlement.
- Consumers read Pay aggregates through Pay capabilities and Balance balances
  through Balance capabilities. Neither ledger substitutes for or mutates the
  other. Cedros Wallet signs only the exact Pay-validated transaction under the bound wallet id/version, cluster, amount,
  mint, destination, and idempotency identity; Pay records settlement only after
  authoritative confirmation.

## Stripe ingress and settlement

Cedros hosts reserialize inbound `body-json` and do not expose original request
bytes, so Stripe's raw-body HMAC signature can never be verified by the
extension; there is no signing-secret setting. Pay instead generates a random
256-bit hexadecimal `stripe.webhook_token` the first time an administrator reads
the Stripe configuration, stores it exclusively in host secrets, and shows the
finished `/extensions/cedros-pay/webhook/stripe?token=TOKEN` endpoint in the
admin UI for the operator to register in Stripe. Treat that endpoint URL as a
credential and redact its query from upstream access logs. A trusted forwarder
can instead send `x-cedros-webhook-token`. Clearing the token through the admin
configuration (`webhook_token: null`) rotates it on the next read; operators can
never author a token by hand. Ingress without a matching token is rejected before
any egress or persistence, and a site without a token fails closed with 503.

The authenticated notification supplies only an `evt_...` lookup hint. Pay obtains
the actual event with its site-scoped Stripe API secret through approved host HTTP
egress. All submitted amounts, metadata, event types, and statuses are ignored.
The retrieved ID, key mode, and direct account scope must match;
Connect/organization events are not supported. Event retrieval is available for
30 days; older missed deliveries require provider reconciliation. Restricted keys
must permit Events reads. Outbound requests remain pinned to `2024-06-20`, but
retrieved Events retain their immutable original API version: Pay records that
provenance and validates each event's required economic fields rather than assuming
retrieval or endpoint version settings rewrite the snapshot. Stripe's changing `pending_webhooks` counter does not
participate in replay fingerprints. See [Stripe Event retrieval](https://docs.stripe.com/api/events/retrieve).

Fulfillment requires a correlated Checkout Session with `status=complete` and
`payment_status=paid`, or a PaymentIntent with `status=succeeded` and the full
expected `amount_received`. Amount, currency, and initiated ledger identity must
match. Redirects, client callbacks, `requires_action`, `requires_capture`, and
unpaid completed sessions do not grant fulfillment. PaymentIntent creation and
retrieval keep the ledger pending until the atomic event/effects projection runs.
Checkout-owned PaymentIntent events do not create a parallel payment; the Session
projection owns settlement. Canonical Checkout also reconciles provider state
server-side. These states confirm provider payment, not a bank payout. See
[Stripe fulfillment guidance](https://docs.stripe.com/checkout/fulfillment).

Hosted creation retries reuse the durable initiation expiry and exact price/name
binding. In-flight legacy claims lacking the new facts or cart initiation time
require reconciliation, not a new provider key. Browser metadata is namespaced
under `custom_` and cannot supply payment, product, or customer authority.
Admin full refunds freeze the remaining refundable amount at initiation; pending
refunds are polled by the same refund ID. Terminal refund outcomes dominate stale
intermediate snapshots. A later failed refund reverses its ledger delta; a completed
admin claim then reports a reconciliation conflict rather than false success.
Disputes only affect this site's correlated payments and customer identities;
they track risk/workflow state, not a second refund or Stripe payout ledger.

## Reconciliation evidence

Webhook lifecycle tests exercise exact event replay, changed-payload conflicts,
PaymentIntent uniqueness, invoice replay under a second event id, and invoice to
refund ledger net. Subscription sync tests exercise failed-renewal recovery and
provider plan convergence. Credit tests reject corrupted negative or over-held
accounts before any mutation. Capacity contract fixtures separately reconcile
purchase, grant, refund revision, and usage settlement identities.

## Revenue projections

- A payment's `processedAt` is its settlement time and stays unchanged when it
  is refunded. Refunded payments remain in gross revenue. Separate successful
  refund rows carry refund cashflow; native-store cumulative refunds atomically
  record only each new delta with the payment and notification marker.
- The current summary contract has one reporting currency. Rollups and stats
  reject incompatible currencies or malformed rows instead of silently mixing
  or dropping them. Previously overwritten payment timestamps and missing
  historical native refund rows require reconciliation against provider evidence;
  this change does not infer or rewrite historical cashflows.

## Durable state machines and recovery

Every row below is site-local. A job cursor or expired lease authorizes another
observation or fenced attempt; it is never proof that money moved.

| Durable machine | Transitions and triggers | Replay / recovery boundary |
| --- | --- | --- |
| Canonical quote and inventory hold | Quote API creates an authoritative snapshot and `active` hold; checkout claims it as `checkout_pending`; paid settlement commits stock; proven terminal settlement releases it. Cleanup releases only expired, unbound `active` holds. | Quote/checkout identity and versions fence stock, settlement claim, payment, order, and effect writes together. A pending provider payment does not expire merely because its hold deadline passed. |
| Canonical provider initiation | Checkout API persists a lease and `not-started → attempted-unknown` before Stripe POST; a response with an ID records `provider-id-known` and a resolved creation, even without a redirect URL. URL resolution retrieves it separately; an unknown creation remains indeterminate or becomes proven terminal. | Exact request material and site-bound provider key survive retries. Unknown creates cannot be retried beyond the bounded provider idempotency window. An unknown create without a provider ID remains indeterminate and requires provider evidence; reconciliation never substitutes a new POST. |
| Canonical settlement | Stripe return verification, authenticated webhook projection, and cleanup reconciliation change `pending → paid/terminal`. Credits settle locally in the checkout CAS. Solana observations settle only verified finalized effects. | Reconciliation scans checkout operations independently of inventory, excluding quotes. Paid provider evidence includes a PaymentIntent; its shared uniqueness fence commits with payment, inventory, order, and effect. Exact checkout retries and status reads report reconciled paid state even if initiation was indeterminate. |
| Legacy Stripe payment and cart claim | API claims an initiating payment/cart and records provider identity. Provider events or read-only cleanup reconciliation move pending/failed attempts to succeeded; expired unpaid sessions or canceled intents can fail. Refunds subsequently change the refund total/status. | Reconciliation retrieves known Sessions/PaymentIntents, validates their identity, amount and currency, and reuses webhook CAS projections. Complete-but-unpaid sessions and authentication-required intents remain unresolved. Success wins over a previous failed confirmation attempt. Cart state and the payment projection commit together. |
| Solana payment and access pass | Verification persists exact signed bytes and a pending payment/pass before broadcast. Request polling or the x402 job observes finalized success/failure and commits the ledger, cart/pass, and effects. | Network, exact transaction, signature, token effects and finality are required. Unknown results retain pending state. Rebroadcast uses identical bytes. Blockhash expiry alone cannot prove absence; canonical terminal expiry requires the stored validity witness and a later finalized absence proof. |
| Pay credit movement | Authorized grant/debit/capture capability or API atomically changes account totals and creates immutable `txn:{sourceRef}` plus companion payment/effect records. | Same source and fingerprint return the existing result; changed intent conflicts. Guarded account versions prevent concurrent overspend. Replay repairs only the original guarded companion mutations and does not apply the credit movement again. |
| Pay credit hold | Hold creation reserves available credits (`held`); capture debits and marks `captured`; release marks `released` and restores availability. | Hold identity binds subject, currency and amount. Account, hold, capture transaction, and companions share the CAS; captured/released holds cannot be consumed again. |
| Subscription operation and projection | API/capability creation, plan selection/change and cancellation have durable operation claims. Stripe lifecycle events and subscription sync update provider status, Price, cancellation and period; Solana/native verified activation updates their own projections. | Same operation reuses provider identity; stale versions cannot overwrite newer observations. Failed renewal removes access; provider recovery can restore it. Expiry removes access without inventing a payment. Invoice settlement is a separate machine. |
| Invoice settlement | Authenticated invoice event plus retrieved successful payment evidence creates a payment keyed by invoice and claims the PaymentIntent. Capacity reconciliation uses its own bound provider invoice evidence. | Invoice and PaymentIntent fences prevent a repeated invoice or a different event ID from producing another payment/renewal effect. Invoice payment does not extend subscription access by itself. |
| Stripe/credit refund | Admin refund claim fixes the requested remaining amount; Stripe responses/events progress the identified refund to success/failure/cancellation. Credit refunds commit the reversal locally. | Stripe retries retrieve an accepted refund ID; ambiguous creation uses the original bounded idempotency identity. Refund row, parent refund total, claim and effects are guarded. Failed refunds reverse their identified delta; a cumulative charge snapshot is not another refund. |
| Solana refund | Admin process persists one signing operation on a pending refund; accepted signing/broadcast moves to submitted; exact finalized effects move to succeeded or failed. Admin denial is allowed only before signing starts. | Restart resumes the same Wallet/Core operation or polls/rebroadcasts the same signed transaction. It never builds another refund with a fresh blockhash. Legacy records without exact evidence remain blocked for investigation. |
| Dispute/reversal | Authenticated correlated provider disputes update the payment's dispute projection and related capacity grant revisions; later closure/won evidence can restore eligible access. | Event/identity fences and guarded projections prevent duplicate economic effects. Disputes are risk/access state, not an independent cash debit or a second refund. |
| Capacity purchase, grant and usage | Published signed requests create immutable offer/purchase identities; provider reconciliation settles purchase and grant revisions; usage settlement, cancellation, refund and reversal update guarded revisions/service state. | Provider PaymentIntent fences are shared with commerce. Latest grant revisions determine service; stale historical paid revisions cannot restore refunded/disputed capacity. Delivery hints are durable and retried. |
| Native-store purchase/notification | Verified Apple/Google evidence creates the purchase/subscription projection. Notification markers track subscription and ledger targets as pending/applied/irrelevant/not-required; they remain pending when the purchase has not arrived yet. | Exact notification fingerprint and provider transaction identity fence the commit. Later delivery/resolution applies only missing targets; cumulative refunds record only the new delta. Native-store verification requires its external provider environment. |
| Commerce order and entitlement | Settlement creates the order projection with the payment; refunds/disputes update the relevant financial source. Entitlement reads/reconciliation use paid one-time purchases or valid subscription periods. | Consumers do not maintain an independent payment ledger. A notification is a prompt to read the canonical state, not authority to credit or extend access again. |
| Financial effects and outbound delivery | Economic commit creates pending targets. Worker claims a lease, emits a target, checkpoints it, then marks delivered; failures back off and expired leases can be reclaimed. Malformed ordinary deliveries are quarantined. | Receipts, target identities and authenticated event markers survive cleanup, including delivered records. A crash after egress but before checkpoint can redeliver the **same identity**. Receivers must deduplicate that identity; the public host event import does not promise an atomic transaction with Pay storage or exactly-once delivery. |

Canonical, legacy Stripe, Solana payment, refund and access-pass sweeps persist
version-fenced rotating progress in the existing outbox model. They advance before
each attempted row and wrap at the end. Thus an unresolved old payment, malformed
record, timeout, or crash cannot permanently starve later rows. Concurrent changes
can cause rows to be revisited or temporarily skipped; repeated wrapped sweeps and
idempotent settlement converge. Cooperative budgets stop new work before job
deadlines; host HTTP calls still need their own timeouts.

Financial event delivery receipts are retained indefinitely because deleting them
would let a later immutable-ledger replay recreate already delivered effects.
Ordinary delivered/failed outbound messages remain subject to retention. Records
already deleted by older cleanup versions cannot retroactively prove delivery;
external receivers still need durable deduplication by the published event/delivery
identity. Ambiguous external operations with insufficient durable evidence remain
unresolved rather than being repeated.
