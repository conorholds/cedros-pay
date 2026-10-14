# Cedros Pay canonical checkout contract

Status: registered as the canonical Cedros Pay 4 server-Wasm checkout contract. Every
route fails closed until the exact eighteen-model guarded-policy marker is
present. Production launch evidence remains pending the Cedros Data 0.1.81
staging deployment and joint Shop conformance run.

The canonical payload version is `schemaVersion: 1`. There are no versioned
module names, `v2` aliases, compatibility request shapes, or legacy one-time
checkout routes. Cedros Pay 4 is the coordinated hard cutover.

Machine-readable artifacts:

- [Exact JSON schemas](fixtures/cedros-pay-checkout-schemas.json)
- [Request and quote fixtures](fixtures/cedros-pay-checkout-contract.json)
- [Canonical outcome fixtures](fixtures/cedros-pay-checkout-outcomes.json)
- [Error and no-effect matrix](fixtures/cedros-pay-checkout-errors.json)

## HTTP mapping

These are the only registered canonical checkout paths:

| Method and path | Domain operation |
| --- | --- |
| `GET /checkout/descriptor` | Return the authenticated host-derived checkout contract and provider namespace |
| `POST /checkout/quote` | Resolve and persist an authoritative quote snapshot |
| `POST /checkout` | Bind one payment method to one exact quote and attempt |
| `GET /checkout/{operationId}` | Read durable status without provider egress |
| `POST /checkout/resolve` | Resolve an ephemeral provider URL after exact correlation |
| `POST /checkout/return/verify` | Verify an exact provider return artifact against its original attempt |

The descriptor and all checkout operations require a Cedros Login-verified
buyer. There is no production guest-session seam. The descriptor accepts no
body, query, tenant, provider, account, or buyer input; it fails closed unless
the exact guarded marker, trusted site/environment, and configured Stripe
account are available. Its opaque `providerScope` is derived only from the
merchant/environment namespace and Stripe account, so it is identical across
buyers and is the exact namespace used to derive Stripe provider keys.

## Trust and request boundary

Every request is strict recursively: unknown fields fail, and request bodies
over 16 KiB fail before domain work. `schemaVersion` must equal `1`.

Quote and checkout POSTs carry the caller's idempotency key in both the
`Idempotency-Key` header and JSON `idempotencyKey`. Both values must be 1–67
visible ASCII bytes and exactly byte-equal. Keys are never trimmed, case-folded,
normalized, truncated, or derived from mutable client fields. `attemptId` is an
opaque, nonblank value of at most 256 bytes.

Both strict POST DTOs also require `clientMaterialSha256`, exactly 64 lowercase
hex characters. Callers must compute it over the complete,
exact public request with the fixed quote or checkout operation scope. Pay binds
that value into the durable quote identity or checkout material fingerprint, so
same-key retries with changed display fields, metadata, cart generation,
informational amount, or currency conflict across processes. It is correlation
material only: Pay never treats caller prices, totals, currency, product names,
metadata, or cart facts as authority.

The host separately derives a rail-neutral operation scope from authenticated
site, environment, and verified buyer. Request JSON cannot select or override
any scope segment. Only scope digests are persisted. The public descriptor's
provider namespace deliberately omits the buyer while operation ownership
remains buyer-scoped.

Clients express purchasing intent, never authoritative financial facts. Quote
input accepts exactly one source:

- explicit product/variant/quantity intents; or
- an exact versioned-cart lane, generation, and version.

Client prices, totals, currency, discounts, tax, shipping price, product names,
inventory, holds, ledger state, and provider correlation are not request fields.
At most one promotion code is accepted. Requested payment methods are a unique,
nonempty subset of `stripe`, `x402`, and `credits`.

Customer context contains fulfillment intent, optional contact, and return URLs.
It is required on quote and checkout. Checkout must reproduce the exact
tenant-scoped HMACs committed by the quote. The HMAC key is an explicit host
secret and must contain at least 32 bytes; rotation deliberately invalidates
old context correlation. Raw contact, address, and return URLs are used
ephemerally and are never stored in the checkout operation.

## Authoritative quote

Pay reloads public catalog facts for every item and computes unit prices, line
totals, normalized currency, subtotal, promotion discount, tip, and total with
checked integer arithmetic. Mixed currencies, missing products, malformed
catalog data, zero totals, overflow, and unsupported totals fail closed.

The safe durable quote contains resource and variant identifiers, quantity,
authoritative price facts, public display snapshots, payment resource, totals,
requested methods, expiry, and either the versioned-cart binding or an intent
digest. It contains no raw PII, return URL, secret, token, or provider URL.

An exact idempotent replay returns the original persisted snapshot even if the
catalog changes afterward. A new checkout revalidates expiry, cart generation
and version, catalog facts, inventory state, promotion, total, customer-context
hashes, attempt, and selected method before claiming a checkout operation.

Physical shipping resolves an active destination-matching profile and the exact
requested active flat minor-unit rate. Currency, subtotal bounds, and profile
identity are checked; price- or weight-based rates fail closed until their
authoritative bases are modeled. Tax uses the exact active country/region rate
when present, otherwise the country rate, rejects ambiguity, and applies checked
half-up basis-point arithmetic to discounted subtotal plus shipping. Tips require
an explicit host tipping policy and support policy-bounded fixed or percentage
amounts.

Tracked finite inventory is reserved in the same guarded transaction that
persists the quote. The authoritative stock aggregate becomes the sole mutation
authority after its initial catalog seed. Exact quote replay cannot reserve
twice, competing quotes cannot oversell, and multi-line failure writes nothing.
Checkout atomically binds and extends the quote hold before provider egress;
terminal settlement releases it, paid verification commits it to sold stock,
and expired unbound quotes can be reclaimed through the scoped cleanup facade.
Catalog inventory remains a seed/display projection and is never mutated during
settlement.

Checkout authority configuration is explicit:

- Products or variants that require shipping declare `shippingProfileId`.
- Catalog keys `shipping_profile:{id}` and `shipping_rate:{id}` carry active
  profile/destination and flat `amountCents`/currency/subtotal-bound records.
- Active catalog `taxRate` records carry normalized country, optional region,
  and `rateBps`; duplicate matches at the selected specificity fail closed.
- Host setting `checkout.tipping_policy` contains the strict camel-case policy
  fields `schemaVersion`, `enabled`, `allowFixed`, `allowPercentage`,
  `maxAmountCents`, and `maxPercentageBps`. A requested tip fails closed when
  this setting is absent, malformed, disabled, or exceeded.

The guarded stock and hold records are internal authority, not client input.
The quote response exposes only a non-sensitive hold identifier and expiry.

## Checkout and payment rails

Checkout binds exactly one resolved quote operation, the quote's attempt ID,
the exact customer-context hashes, and one method requested by that quote.
Changing any bound input fails before provider egress.

The quote also binds the host-derived `marketCountry`, a canonical regional
payment-policy fingerprint, and the allowed methods. Missing or disabled policy
preserves all globally configured rails; unmatched/unknown country uses the
configured fallback. Checkout reloads the policy and fails before provider
egress with `regional_payment_policy_changed` if the binding changed, or
`payment_method_unavailable_in_region` when the selected method is denied.

Stripe uses the existing fenced provider flow. Provider correlation includes
the operation entry key, operation ID, attempt ID, scope hash, and material
fingerprint. Provider URLs are not accepted from durable state and are never
persisted.

Credits checkout validates authenticated credit authority, then atomically
settles the balance, commerce ledger, inventory, and durable effects. Exact
replay cannot debit twice; insufficient funds are recorded as the durable
terminal code `insufficient-funds`.

x402 checkout binds the quote to the configured network, recipient token
account, mint, decimals, exact amount, and operation memo. It verifies the
submitted transaction, preserves ambiguous broadcasts as processing, and uses
the marker-first reconciliation job to converge after response loss or restart.
When x402 is requested, the public authoritative quote includes those exact
wallet instructions plus the configured display symbol when available. The
server-only authority fingerprint is never returned. Clients must present the
network, asset, and exact decimal amount for review and must reuse the same
quote and checkout idempotency keys while an outcome is processing or
indeterminate; they must not create a second payment attempt.
Retired direct credits and x402 mutation aliases remain undiscoverable; Shop
uses these rails only through the canonical checkout facade.

Canonical payment outcomes are finite and always include operation ID, attempt
ID, and payment method:

- `action_required`
- `processing`
- `paid`
- `terminal`
- `indeterminate`

## Presale site-mode lifecycle

Presale is a Cedros Shop presentation and access-gating mode, not a Pay billing
mode or transaction type. Pay does not create a separate Presale purchase row.
Checkout charges and settles under the product's normal payment terms; only an
explicit product or subscription trial can defer a charge.

A `paid` canonical checkout atomically persists its durable operation,
succeeded commerce-ledger proof, inventory commit, complete purchased-product
set, trusted buyer subject, and settlement-effect intent. A current subscription
persists its normal status and period boundary. These Pay records remain
authoritative while Shop is gated and after Shop switches to Live. No migration,
replay, or second checkout is required when the site, environment, buyer, and
product identities remain unchanged.

Shop may show a one-time buyer as fully set for launch when checkout status is
`paid` (or an exact provider return is `verified`) and the entitlement check for
the purchased product returns `granted: true`. For subscriptions, Shop uses the
normal current subscription status/period plus the entitlement result. Refunds,
expiry, immediate cancellation, cancellation at period end, retries, and
duplicate submissions retain their ordinary Pay transitions and idempotency
rules in either site mode.

Provider transport ambiguity is never translated into paid or terminal failure.
Before Stripe egress, Pay durably records `attempted-unknown` using host time.
An exact create may be retried only before the exclusive 23-hour conservative
cutoff beneath Stripe's documented 24-hour idempotency pruning floor. Clock
rollback, the exact cutoff, and later retries—including 72 hours—preserve an
indeterminate result without another provider POST.

## Durable identity, status, and return verification

The operation entry key is a domain-separated SHA-256 digest over trusted scope,
fixed operation kind, and the exact idempotency key. Its public form is
`payop_<64 hex>`. This encoding provides a direct operation-ID-to-entry lookup;
there is no scan or secondary status index. The raw idempotency key is not
persisted. Scope mismatch returns not found.

Stripe receives a separate deterministic `Idempotency-Key`: a domain-separated
digest over the trusted merchant/site, environment, configured Stripe account,
and the full exact public key. Buyer identity is deliberately excluded
from this provider namespace. The public key remains unmodified in Pay's own
operation identity, while identical keys cannot collide across merchant,
environment, or Stripe-account boundaries.

Operation records require a canonical quote or checkout context. Stored records
whose operation kind and context kind disagree fail as internal corruption.
Every mutation uses an absent or opaque-version guarded `database.compare-and-set` call. Completion is
lease-fenced and atomically writes the safe return-artifact index where needed.

Status performs database reads only. It never calls Stripe and never returns a
provider URL. A resolved Stripe session becomes `paid` only when a succeeded
Stripe commerce-ledger entry exists for its exact return artifact; otherwise it
remains `action_required`.

URL resolution and return verification are separate POST operations. URL
resolution requires `schemaVersion`, exact operation ID, expected attempt ID,
and return artifact. Return verification intentionally accepts only
`schemaVersion`, `expectedAttemptId`, and `returnArtifact`; a caller cannot
supply or redirect its durable operation identity. Pay derives the Stripe rail
scope from authenticated site/environment/buyer authority plus the configured
provider account, loads the scoped hashed return index, and uses that durable
record's operation ID for provider metadata correlation and any paid settlement.
It retrieves the Stripe Checkout Session and compares every stored provider
metadata correlation. Production accepts only
`https://checkout.stripe.com/` URLs. Loopback HTTP is possible only through an
explicit test/development policy seam and is disabled by default.

The HTTP return contract represents verified returns as
`{ "status": "verified", "checkoutAttemptId": "<original opaque attempt>" }`;
mismatch and indeterminate outcomes contain only `status`. No operation ID,
payment method, settlement detail, provider payload, or artifact is disclosed.
`/checkout/resolve` remains operation-scoped and retains its distinct response.

Buyer return URLs require an operator-configured origin allowlist. Production
origins are ASCII HTTPS origins using the default port, without userinfo,
paths, fragments, non-default ports, Unicode hosts, or `xn--` labels. Explicit
loopback HTTP remains test/development-only.

Verification succeeds only with durable paid proof. An exact correlated Stripe
session with `payment_status=paid` is atomically settled before the route returns
`verified`; a persisted paid settlement or exact succeeded Stripe commerce-ledger
entry replays `verified` without Stripe egress. Open-unpaid, complete-unpaid,
expired-unpaid, missing, malformed, unknown, and transport-uncertain provider
results all return `indeterminate` and perform no settlement. Correlation failure
returns `mismatch`.

Canonical Stripe creation pins an explicit one-hour provider `expires_at`, safely
inside Stripe's 30-minute to 24-hour bound. The derived provider key and expiry
are persisted in the first guarded checkout claim and reused byte-for-byte after
crash or response loss. A finite-stock hold is extended to that exact expiry in
the same transaction. Canonical Stripe Checkout creation permits only synchronous
card payment methods; asynchronous methods cannot leave a completed-but-unpaid
session waiting on an unimplemented later lifecycle event. The default-enabled,
marker-first cleanup job runs on a single-flight five-minute cadence, so an
expired hold enters provider-proof reconciliation within at most five minutes in
normal operation. Host or provider unavailability intentionally extends that
delay instead of guessing a terminal outcome. The job retrieves expired
candidates and releases stock only for a strictly parsed, fully
correlated Stripe session with `status=expired`, matching `expires_at`, and
`payment_status=unpaid`. Correlated paid proof commits atomically. Local time,
404, transport failure, malformed responses, open sessions, and complete-unpaid
sessions never release stock.

## Privacy and operability invariants

Durable checkout state contains tenant-keyed MACs and safe public/catalog or opaque
provider identifiers only. It rejects URLs, query strings, relative paths,
emails, JWT-like values, bearer material, live-key markers, and client-secret
markers from artifact fields. Logs contain operation class and transition only.
The raw checkout attempt ID is never sent in Stripe metadata; Pay sends a
domain-separated scope-bound digest and validates the same digest on return.

No outcome is inferred from provider absence after an ambiguous request. Durable
indeterminate state is reconciled under a new guarded lease. Resolved and
terminal results replay without duplicate provider creation. Retention begins
only after the inclusive 72-hour replay window.

## Activation gate

Do not register, deploy, advertise, or route this facade until all of the
following are complete:

1. The operation, return-index, stock, and inventory-hold models are declared
   and deployed under the exact guarded-only host policy.
2. The guarded-policy readiness marker and old-host fail-closed behavior are
   validated in the production host build.
3. Shipping, tax, tipping-policy, and inventory configuration are validated in
   the target environment, including the guarded 32-condition quote limit.
4. Enabled Stripe, x402, and credits authority is configured and passes the
   target-environment rail, replay, recovery, and fail-closed matrix.
5. Route adapters preserve the exact body/header and error contracts without
   accepting legacy aliases.
6. Multi-instance and multi-process tests pass against the target Cedros Data
   storage implementation for claim, completion, replay, return correlation,
   and settlement transitions.
7. Cedros Shop adopts these exact schemas and the coordinated hard cutover is
   ready. The legacy and canonical checkout surfaces must not be advertised as
   simultaneous alternatives.
