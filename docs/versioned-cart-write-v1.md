# Pay versioned customer-cart storage contract

`cedros-pay:versioned-cart-write-v1` is the registered Cedros Pay 4 service for the
canonical Cedros Shop 3 customer-cart integration. It remains separate from
`cedros-pay:cart`, the priced checkout and payment-settlement snapshot. Its
four authenticated routes and five storage models fail closed until the exact
eighteen-model guarded-policy marker is present.

## Trust and authority boundaries

Every transport operation verifies a Cedros Login bearer. The authenticated
subject, host-authenticated site and environment, and fixed Cedros Shop family
form the provider scope. The request cannot select a customer or provider.
Domain-separated SHA-256 keys keep raw subjects and operation IDs out of
persistence while isolating subjects, providers, lanes, and operations.

The public mutation DTO is intent only. An item accepts `resource`, optional
`variantId`, positive `qty`, and bounded string `displayMetadata`. It does not
accept price, currency, title, image, payment resource, discount amount,
inventory quantity, hold ID, or hold expiry. Unknown fields fail closed.

The adapter fingerprints canonical client intent and checks its durable
operation record before re-resolving the catalog, so an exact retry returns the
original result even if catalog facts changed. Before a new operation commits,
the production authority reads Pay's catalog and resolves the exact public
product and variant, integer price, normalized currency, title, image, payment
resource, and available inventory. Promotion input is a normalized code only;
replacement eligibility is checked through Pay's existing cart-quote coupon
rules. A new operation always uses the current authoritative facts.

Display metadata is retained only as customer presentation data. It does not
affect price, inventory, promotion, authorization, or settlement. Checkout must
always re-read current catalog, coupon, inventory, and settlement rules rather
than treating the synchronized subtotal or promotion mirror as authority.

## Generation, lane, and apply state machines

Generation is host-owned. `open_generation` atomically creates epoch one or
returns the current opaque entry revision; a fresh service recovers it.
`rotate_generation` version-guards the record, increments its checked audit
epoch, and rotates the opaque revision. A delayed write carrying an old
revision returns `stale_generation` and cannot mutate the cart.

Lane admission is durable per authenticated subject/provider scope. A guarded
registry admits at most eight unique lane hashes. Competing last-slot requests
serialize through compare-and-write, so the quota cannot be exceeded across
service instances. Read and rotation require an already admitted lane.

Each apply carries lane, opaque generation revision, public expected cart
version, durable operation ID, and a typed mutation. A new apply atomically
guards the generation revision, cart revision or absence, operation absence,
and tombstone absence. The same compare-and-set transaction writes the cart, operation result,
and permanent tombstone. Conflict writes none of them. Durable outcomes are
`applied`, `replayed`, `idempotency_conflict`, `stale_generation`, and `conflict`,
with authoritative state where recovery requires it.

Public cart version and generation epoch are checked monotonic `u64` values;
host revisions are opaque equality tokens. Line and aggregate arithmetic is
checked, mixed currencies fail, and display order is explicit. Per-lane
operation retention is bounded by the 100,000-version terminal ceiling.

## Persistence contract

Activation must declare five extension-owned JSONB models:

- `cedros-pay:customer-carts`
- `cedros-pay:customer-cart-generations`
- `cedros-pay:customer-cart-operations`
- `cedros-pay:customer-cart-tombstones`
- `cedros-pay:customer-cart-lanes`

All multi-record transitions use the host's named `database.compare-and-set`
contract with `schemaVersion: 1`, `conditions[]`, and `ops[]`, guarded by the
required `cedros-data:extension-storage-cas-v1` capability. Operation records and tombstones deliberately live in
separate models and are written atomically; either missing half is treated as
storage corruption rather than weakening idempotency.

## Deliberate hold boundary

The public cart DTO exposes no hold fields because cart synchronization does not
reserve inventory. Canonical checkout owns the authoritative inventory-hold
lifecycle after it revalidates current catalog and cart facts. A client must not
copy checkout hold identity or expiry into a cart mutation.

The adapter uses a durable `CartRatePolicy`, keyed by a redacted
subject/provider digest and operation class. Rate state is guarded and survives
process and host restarts.

The capability, five models, scopes, and authenticated routes are registered.
Production launch still requires the live exact 18-model policy matrix on Cedros
The Cedros platform 0.1.81 or later, the named storage-CAS capability, and joint Pay/Shop
distributed-process staging evidence. No
integrated staging result is claimed here. The machine-readable fixture is
`docs/versioned-cart-write-v1-contract.json`.
