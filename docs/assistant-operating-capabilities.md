# Scoped assistant catalog and order operations

Pay 5.0.0 provides ten manifest-owned operations for a reviewed assistant broker:

- `shipping-setup-query`: exact profile IDs, revisions, rate pages and missing/inactive/rates-required setup state
- `shipping-profile-save`: approved profile creation/update with explicit create-or-version preconditions
- `shipping-rate-save`: fiat flat-rate configuration with atomic profile/rate version checks
- `storefront-products-query`: bounded safe product projection and catalog versions, including inactive records
- `physical-product-create`: explicit physical standard goods with an existing active shipping profile, bounded public copy/media and fiat prices
- `physical-product-update`: exact-version public-field patches for verified physical goods; private metadata, provider configuration and inventory remain outside the patch
- `physical-product-delete`: confirmed, exact-version deletion with the existing authoritative-stock guard
- `orders-query`: 25-row durable-order keyset pages
- `order-get`: safe order/line detail and the fulfillment version
- `physical-order-fulfillment`: exact-version cumulative delivered quantities or cancellation for physical orders only

These are fixed route capabilities. They cannot select a route, collection, provider or arbitrary request method. Authentication must carry the exact host-attested bearer route claim or normal Pay administrator authority. Model-provided context, generic host settings claims and unrelated route claims grant nothing.

## Catalog workflow

1. Inspect shipping-setup-query first. If needed, save an approved profile and flat rate using returned revisions. Never guess shipping profile IDs
2. Read the current product with `storefront-products-query`
3. For creation, confirm it is a physical good and choose an existing active physical shipping profile; the request must explicitly set `physicalGoods: true`
4. Supply only declared fields. Digital/subscription/capacity product mutations and opaque metadata are rejected. The public capability price schema accepts the supported fiat currency set
5. Product edits validate the complete effective fiat price, including preserved aliases and variants. Ambiguous or linked/recurring pricing and nonzero crypto price state require their dedicated catalog workflow; a fiat patch cannot hide them
6. For edits/deletion, preserve `catalogVersion` as `expectedVersion`
7. Use one stable broker idempotency key for the same exact action and read the resulting product again

Changes to public catalog state require explicit user approval. An edit does not purchase goods, create a checkout session, charge a customer, adjust stock, or disclose stored private metadata. Delivery flags do not purchase shipping or initiate fulfillment with a carrier.

## Order workflow

Read an order first, preserve its returned version and line ordering, and approve exact cumulative delivered quantities or cancellation. Fulfillment uses the existing atomic guarded store and actor/order/payload-bound replay receipt. Quantities cannot decrease or exceed ordered quantities; cancelled orders cannot be revived. This operation does not refund, charge, transfer money, purchase shipping, or fulfill digital orders.

## Durable physical storefront policy

Pay 5.0.0 requires the host-owned `cedros-data:native-storefront-policy-read-v1`
capability. Physical-only installations discover policy through that host-controlled
service boundary, never through request arguments or UI settings. Catalog
classification and canonical shipping/Stripe checkout enforce that current policy.
Existing unrestricted stores retain their behavior; native first-party setup
rejects converting them implicitly. Completed payments, refunds and cancellation
history remain accessible. Installation does not configure a provider or launch a
store, and cannot cancel an externally cached payment URL issued before policy
activation.

## Verification and activation

The pure domain suite includes source-level positive and negative coverage for exact bearer claims, unknown fields, wrong paths, safe projections, private-field preservation, stale versions, physical-product guards and changed-payload replay conflicts. React and native UI manifests are generated from the same TypeScript definitions and retain stable existing IDs.

A source test pass does not prove installation. Build the fresh versioned Wasm/UI/native archive through `make cedros-package`, verify its exact digest and installed authority, and run the authenticated staging catalog/order journeys before production activation. The release packet remains explicitly blocked/not-built until that evidence exists. Never substitute an old archive or claim a payment/financial postcondition from a catalog or fulfillment result.
