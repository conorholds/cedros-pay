# Pay capacity v1 integration

The machine-readable `portal-usage-capacity-v1` contract is vendored from the
public Cedros extension authoring kit 0.1.82 (contract document v1.2.0,
accounting revision 2). Its Pay operation schemas remain unchanged and the
financial wire envelopes remain v1.0.0. Pay keeps the ownership and funding
policy wording aligned with the current provider boundary; Data owns the
standard. The matching public fixture set is checked by the repository's
extended behavioral checker. The Rust domain validates against the
pinned financial wire schema, including duplicate-key rejection and the exact
whole-quote digest. Synthetic fixtures are not commercial configuration.

The adapter supports the native-only `capacity.binding.read` operation.
Existing financial wire shapes are unchanged. Data's four core service paths
remain the published extension-service bindings. Native enforcement and joint
activation remain Data-owned; sales gates remain in force.

Pay registers eight HTTP routes and nine internal service routes. See the
pinned `operations` and `serviceBindings` tables for exact paths, IDs and schemas.
Internal calls use the existing WIT extension-services import. Public requests
use Login authentication plus `X-Cedros-Capacity-Delegation`; mutations also need
`Idempotency-Key`. Native Data reads require its exact host-fixed principal,
capability and `orgId`, and never call back to Data. Missing Data adapters return
503; Login identity alone never binds an organization.

## Configuration before activation

Sales default to unavailable and require verified installation and commercial
configuration. Operators configure `capacity_v1` through the existing
**subscriptions** admin configuration category
(the stored key is `subscriptions.capacity_v1`). It contains:

- `payInstallationId`, `environment` (`test` or `live`), `salesEnabled`, and
  `jointActivationVerified`. Environment must match the saved `stripe.mode`.
- `portalOrigin` (HTTPS origin) and `recoveryPath` (fixed absolute Portal path).
- `stripePortalConfigurationId`: a dedicated Stripe portal configuration with
  subscription updates/cancellation disabled and payment-method/invoice access
  enabled. Pay verifies those flags before issuing an action URL.
- `organizations`: keyed by verified organization ID, with `stripeCustomerId`,
  `baseSubscriptionIds`, `commercialVerified` and `runtimeReady` for each owner.
  These are operator-owned installation/billing bindings, not buyer assertions.
  Data independently verifies scope on each delegated operation. Stripe customer
  metadata must match `capacityOrganizationId` and `capacityPayInstallationId`;
  Pay checks it before quoting, and requires zero customer balance, no inherited
  discount and no tax exemption to keep the accepted totals authoritative. Never bind an individual's financial customer to
  an organization merely because their Login ID owns a base subscription.

Accounting revision 2 is opt-in through `organizations[org].accountingVersion: 2`.
Its budget meters are Sites count, Storage bytes, all-outbound Email accepted
recipients, and configured credits. `managed.credits` can cover Intelligence,
Search, Blockchain and X API once. A category cannot also receive an independent
copy of the same pool. Image operations share Intelligence; SEO and Voice are
outside Providers Manager and have no Pay-funded products or accounting-v2
allowances. Their legacy meters remain readable as history only. No Developer
plan multiplier or allowance is inferred. `basePlanAllowances` requires approved quantities and categories.
Purchased credit reset/expiry must be explicitly configured through the supported
`calendar_month_recurring_no_rollover` policy; one-time/rollover credit lots are
not implemented. Existing accepted financial snapshots retain their old units.

The accounting-v2 offer mappings are listed below. Retired
`cedros-addon-managed-capacity` and `cedros-addon-campaign-email` request/campaign
offers cannot be sold anew and remain isolated from base plans. Their accepted
snapshots and subscriptions retain their original terms.

The native binding read additionally uses these operator-owned organization fields:

- `baseSubscriptionIds` is the complete inventory of bound base records, unique
  across organizations. An explicitly configured empty list means unsubscribed;
  an unknown organization or missing listed record returns 503.
- `baseCustomerRefs` maps every listed subscription ID to its approved Pay
  `customerRef`. The read verifies both against the stored subscription. This
  explicit ownership binding is required even when that ref is a Login identity.
- `canonicalSiteIds` lists Data's canonical site IDs owned by this organization.
  Accounting revision 2 allows configured site ceilings underneath organization
  pools; a site ceiling is not another included organization allowance. Legacy
  bindings retain their original local meter identities for historical reads.
- `basePlanAllowances` maps catalog entry IDs to `{approvalId,
  includedAllowances}`. Each allowance has the standard `BaseAllowance` shape;
  Pay resolves its `offerIds` from the approved catalog rather than trusting
  supplied handles. Configure only owner-approved quantities and limit states.
  Omitted meters/mappings are `unconfigured`, never zero or inferred from price.

The read returns all bound base subscriptions, excludes capacity add-ons, and
uses catalog titles as customer-facing names. Active/trialing records contribute
through their recorded period end, using Pay's existing base-entitlement rule.
Past-due, incomplete, unpaid, canceled, paused and expired bases contribute nothing;
a provider period end alone is not proof of payment. Recovery/selection states
remain explicit. Capacity upgrades do not mutate that base record; already
purchased add-ons retain their separately verified grant intervals.
Duplicate scopes, conflicting aggregate states, unsafe totals and incomplete or
changing source reads return 503. The content revision excludes freshness; its
60-second validity is shortened at the nearest contributing expiry. No Stripe
IDs, customer refs, approval metadata, Data callbacks or provider IO are exposed
by this leaf read. Sales activation is neither required nor enabled by reading.

Use the existing `capacityAddOn` catalog model and the reserved handles below.
Their active/public/purchasable flags and the selected price flags must all be
true. Product `metadata.capacityV1` supplies `priceId`, exact standard `terms`,
`quantityConstraints`, `currencyMinorUnitDigits`, `taxBasisPoints`, an explicit
`stripeTaxRateId` (null only for an approved zero rate), and
`commercialApprovalId`. `stripeProductId` and the selected price's
`stripePriceId` are required and checked against Stripe's active price,
product/currency/amount/interval/mode, exclusive tax behavior and licensed units.
Only interval count 1 and exact basis-point tax rates are supported.

Approved reversal metadata is required explicitly: `partialRefundPolicy` =
`preserve_allowance`, `fullRefundPolicy` = `revoke_at_confirmation`,
`disputePolicy` = `revoke_on_open_restore_on_win`, and `latePaymentPolicy` =
`full_refund_after_expiry`. These are supported adapter policies, not claims of
commercial approval. Other policies keep the offer unavailable until implemented
and configured. Partial monetary refunds do not invent a quantity reduction.
Once a dispute has been observed, a cleared charge flag or missing dispute details cannot erase its
history or restore capacity. Recovery requires the explicit authenticated dispute
outcome; incomplete reads remain retryable without changing grants.

`none` proration charges the full recurring amount for the new item's interval.
`prorated_charge_full_allowance` requires the verified base subscription's exact
`currentPeriodStart`/`currentPeriodEnd` to span the selected billing interval. It
rounds the proportional money amount half up; allowance is never prorated. Tax
rounds half up in minor units. Catalog changes cannot replace a stored quote.

## Upgrade catalog

The adapter maps the following handles to Data's accounting meters. A supported
mapping does not establish an installed product, approved pricing, or runtime
readiness.

| Pay offer handle | Data service / meter | Unit and allowance basis | Configuration status |
| --- | --- | --- | --- |
| `cedros-addon-sites` | `sites` / `sites.count` | site; simultaneous organization occupancy | Requires approved catalog terms and organization binding |
| `cedros-addon-managed-credits-v2` | `managed-services` / `managed.credits` | integer credit; organization pool per UTC calendar month, no rollover | Existing mapping; only explicitly approved recurring no-rollover policy is accepted |
| `cedros-addon-email-recipients-v2` | `email` / `email.recipient-acceptances` | accepted outbound recipient; organization allowance per UTC calendar month | Existing mapping; not campaign-only, not messages or bytes |
| `cedros-addon-storage-v2` | `storage` / `storage.occupied-bytes` | logical retained byte; simultaneous organization occupancy, no monthly reset | Provisional handle; requires an approved installed product and terms |

For every row, `allowancePerItem`, quantity minimum/maximum/step,
`pricePerItemMinor`, currency, tax, and monthly versus annual billing are
operator-supplied commercial values. No defaults are supplied. Approved catalog
metadata must specify them exactly; preview multiplies the purchased item count
by the allowance and price and records both in the immutable quote. Supported
purchase mode is recurring, interval count one, cancellation paid through, with
explicit proration and renewal totals. Each verified grant expires at its paid
interval boundary, even for occupancy meters whose usage itself never resets.
Payment failure cannot extend that boundary or replace an existing paid grant.
Full-refund and dispute policies are listed above and require commercial approval.

Eligibility requires an active/public/purchasable product and selected price,
exact meter/unit/basis, approved policy metadata, a bound organization and base
subscription, and BillingManage authority. Non-site v2 offers require explicit
accounting revision 2. Pay's sales/commercial/runtime/joint-test gates remain
required. Data independently checks current complete coverage, binding revision,
base eligibility and the offer IDs on the applicable included allowance before
issuing/redeeming authorization. A Pay mapping alone does not establish readiness.
Missing mappings return an unconfigured offer; unavailable sources return 503.

Data owns shared Storage allocation across retained assets, mail and media. Site
ceilings consume the same organization pool and never multiply it. R2 public and
DigitalOcean private routing are storage breakdowns, not extra customer budgets.
Before Storage sales, Data must verify current writers, root/legacy inventory
adoption, allocation and runtime acknowledgement. No byte quantity or per-site
CPU, RAM, physical disk or traffic allocation follows from purchasing a site.
Those hosting dimensions and grandfathered allocations need Data's explicit
allocation policy before activating the new base plans.

Use distinct approved catalog entries and Stripe price IDs for new contracts.
Do not replace an existing plan's `basePlanAllowances`, update subscription prices,
or migrate subscribers by matching a display name. Existing subscriptions retain
their recorded price and allowance. BYOK does not imply unlimited Sites, Storage,
or Email.

## Persistence and recovery

Capacity records have a distinct `capacityRecordType` discriminator and
`capacity:` key namespace in the existing guarded subscription collection.
They contain no legacy subscription-selection `customerRef` or `status` fields.
Base selection/provisioning uses its existing records. Data combines base
entitlements with verified grants; Pay does not invent new entitlement keys or
aggregate cross-organization capacity into the legacy unscoped entitlement read.

Pay claims the purchase before Data redemption and never dispatches payment
before confirmed acceptance. The existing subscription-sync schedule recovers
redemption, provider state and grant hints without a browser session. Its capacity
work follows base-plan reconciliation, so a capacity dependency failure does not
prevent that run's base-plan updates. Persistent invoice cursors bound work per
purchase. Signed capacity webhooks atomically record a receipt and schedule
reconciliation, bypassing legacy first-subscription projections.

The existing manifest declares exactly one `cedros-pay:schedule-subscription-sync`
schedule for `cedros-pay:subscription-sync`: `*/15 * * * *`, **enabled: false**,
`timeoutSeconds: 300`, `maxRetries: 0`. This declaration does not enable an installed schedule. Capacity follows base
work using the same elapsed invocation budget, checks a 270-second budget between
capacity work units and provider reads, retains invoice cursors/accepted snapshots,
and rotates failed purchases for later runs. Pending grant notifications are retried before provider work, so
a slow provider cannot repeatedly starve an already-confirmed payment notification.
New revisions are also delivered after financial commits; each revision is tried
at most once per invocation. Notification errors do not abort payment recovery
while invocation budget remains. The 60-second `reconcileAfter` delay makes work eligible; it does
not schedule a run. Base processing retains its existing 240-second budget.
Budgets are cooperative: host HTTP/database/service deadlines must still bound
in-flight calls within the 300-second job timeout.

Data/Portal recovery must treat timeout/503 as unavailable or paid-but-capacity-pending,
retain the original quote/authorization/purchase identifiers, and recover status
and revisioned snapshots without creating a new financial purchase. Same- and
different-key retries of the same accepted quote converge on the durable purchase.
A browser redirect never grants service. Data must preserve paid grants while
refresh is pending and enforce only applicable confirmed grant intervals; Portal
must refresh from Data's applied revision, not infer activation from Pay payment.

Before enabling the existing schedule in an approved test installation, verify
scheduler registration/identity, persisted job metadata (neither dry-run nor
x402-only), Stripe test credentials, guarded writes and Data hint transport.
Capture at least two **automatically dispatched** runs with a failed notification
followed by recovery, restart persistence, a slow provider and a bounded backlog.
With `maxRetries: 0`, recovery depends on subsequent scheduled runs; alert on
missing runs, backlog age and stale source revisions. Manual fixture runs do not verify automatic scheduling or slow-provider
recovery on an installed host.

The Stripe adapter creates an independent recurring subscription. An immediate
invoice item charges the exact accepted initial subtotal, with the recurring
item anchored to the accepted paid-through boundary using Stripe's trial billing
bridge ([Stripe documentation](https://docs.stripe.com/billing/subscriptions/trials)).
The provider's trial flag grants no service. Only verified invoice payment
creates a grant for the original interval. Payment attempts, financial
observations, grants, receipt outcomes and pending change hints remain durable.
Ambiguous creation retries use the identical stored request and provider key;
after 23 hours, recovery searches the organization customer instead of risking
creation after Stripe's idempotency retention. Payment confirmed after the quoted
paid-through boundary is refunded under the configured policy, without shifting
the interval.

Grant revisions and the organization source revision commit together. Snapshots
pin the complete grant history, digest and page cursors in a guarded commit.
Reads fail explicitly when collection/batch bounds cannot produce a complete
snapshot. Cursors expire after one hour; existing cursors replay identical pages.
Data owns atomic application, active-capacity status, Usage receipts and native
enforcement. A paid purchase remains recoverable if Data's hint endpoint fails.

## Verification

Run the pinned Python checker and the targeted Rust suites from the repository
root. Domain tests use simulated host services:

```sh
python3 docs/contracts/capacity-v1/fixtures/check_portal_usage_capacity_v1.py
cargo test --locked --manifest-path server-wasm/Cargo.toml -p cedros-pay-extension-domain capacity::
cargo test --locked --manifest-path server-wasm/Cargo.toml -p cedros-pay-extension-domain subscription
cargo test --locked --manifest-path server-wasm/Cargo.toml -p cedros-pay-extension-domain router::contract_tests
```

Build the component with the pinned Docker toolchain before running the Wasmtime
capacity tests:

```sh
node scripts/build-release-wasm.mjs
cargo test --locked --manifest-path server-wasm/Cargo.toml -p cedros-pay-extension-hostsim --test capacity_contract --test capacity_base_selection
```

The hostsim tests exercise host-service transport, scope rejection, persisted
snapshots, and purchase replay across fresh guest instances. They use synthetic
provider replies. Live Stripe behavior, native Data enforcement, automatic
scheduling, and joint activation require a configured test installation with
approved product, price, and allowance mappings. Fixture IDs and amounts must
not be used as commercial configuration.

Archive provenance and remaining installation gates are recorded in
`cedros-extension.release-inputs.json` and
`cedros-extension.release-readiness.json` at the repository root. Archive
verification does not enable capacity sales or establish joint activation.
