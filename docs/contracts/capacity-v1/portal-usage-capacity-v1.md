# Portal Usage and purchased capacity — financial protocol 1.0.0, accounting revision 2

**Final protocol decision by Cedros platform, under the user's delegated authority.**
Portal, Pay, Providers Manager, Providers and platform must implement accounting revision 2.
The product-owner correction supersedes earlier category and charging definitions.
Financial protocol envelopes remain 1.0.0 so accepted quotes retain their original digest;
`accountingVersion: 2` identifies the new usage/binding semantics. The contract
agreement gate is closed: teams do not need another acceptance round before
implementation. platform owns this standard and resolves concrete implementation
conflicts through versioned changes; a requested amendment does not suspend
unaffected work. Previous drafts 0.1.0–0.3.0 are superseded.

**Protocol publication is separate from runtime availability.** The expanded
service projection, delegated purchase authority and grant reconciler have native
implementations. Native managed-provider credit admission and settlement are implemented in
`portal_capacity/accounting.rs`. Full path coverage, reservation migration and local
runtime quota application still require implementation. `callable: false` and unavailable operation flags record that
fact; they do not mean the standard is provisional. Keep sales disabled until
commercial configuration is verified and native plus joint activation tests pass.
Unknown prices or quantities do not block implementing the published interfaces.
Native Manager guard review and approval are now implemented, as identified by
their operation flags. The overall `callable: false` still describes the
unfinished end-to-end Usage/purchase/activation surface.
Native site-migration bootstrap also reads the existing Portal CAS model; it
supports verified legacy status and explicit unavailability, not activation.

The normative schemas and operation bindings are in
[portal-usage-capacity-v1.contract.json](portal-usage-capacity-v1.contract.json).
[Fixtures](fixtures/portal-usage-capacity-v1.fixtures.json) are synthetic protocol
examples, not configured offers. Operation metadata now uses `path`, `routeId`
and `capabilityId` rather than the drafts' `proposed*` names. Internal service
bindings retain their distinct IDs. Wire envelopes pin `contractVersion: 1.0.0`;
recompute quote digests using that version and never reinterpret an older quote.

Run `python3 docs/extension-authoring/contracts/fixtures/check_portal_usage_capacity_v1.py`
(requires the review environment's `jsonschema`; installs nothing). The
[reference checker](fixtures/check_portal_usage_capacity_v1.py) verifies shapes
and reference transitions, not native enforcement or installed runtime readiness.

## Implemented boundary and compatibility

The native owner `GET /portal/v1/usage` preserves `windowDays` and the complete,
customer-safe hosting `sites` projection. It now includes schema/version, complete
canonical site count, organization and site meter identities, source availability,
and a platform publication revision. Uninstrumented service usage and reservations
remain null/unavailable. Pending grants never appear as applied purchased capacity.
The chart series retain their 500-point and 20-recommendation bounds; they are not
commercial balances. Responses that cannot fit the facade limit fail explicitly.

Native owner routes implement delegation creation, immutable authorization,
organization-scoped purchase status/recovery listing and target discovery. Four
Pay-only core service capabilities check delegations and scope, redeem acceptance,
and durably queue grant-change hints. The worker obtains owner bindings and full
pinned snapshots using native reads. Complete snapshots publish transactionally;
partial pages never change the live grant set. Durable hints retain the highest
announced source revision; an older unseen snapshot cannot restore freshness.
Exact replay of a published snapshot remains a non-mutating acknowledgement.
Payment observations use a separate invalidation generation under the same
organization lock; a delayed Pay read cannot overwrite a newer change hint.
Discovery pins target identities while refreshing eligibility on each page;
removed targets expire the cursor instead of returning stale authorization.
No public grant-application route
exists. `portal_capacity_applications` can only hold enforcing-owner evidence;
financial publication cannot write it. The native provider ledger applies accounting-v2 credit/recipient budgets only from
fresh owner bindings. It reserves organization capacity and configured site limits
under the same organization lock, snapshots pricing, retains uncertain reservations,
and settles actual observations idempotently. Other service owners cannot borrow
this acknowledgement. Sales and full activation remain blocked by incomplete
coverage and joint verification; this is not a completed launch.

### Native implementation and remaining activation gates

Before accounting revision 2, provider request/spend guards checked historical
rows before execution and wrote attempts afterward. They were operational limits,
not atomic purchased service allowances. No end-to-end service budget was enforced.

The native revision-2 ledger reserves customer credits and supplier micro-USD under
the existing organization capacity lock. Actual settlement uses the immutable
pricing snapshot; retries cannot dispatch an existing operation a second time.
Uncertain outcomes retain their full reservation. Failed work preserves supplier
cost, and partial Email acceptance charges only accepted recipients. The ledger
uses canonical Portal site IDs for commercial ceilings and retains runtime site
IDs for operational guards. Reviewed guards remain required. Pricing schemas can
select different bounded image settings or operation subtypes without independent
image allowances. A missing durable Idempotency-Key fails paid admission; trace
request IDs do not substitute for a retry identity. AI usage preserves native
prompt totals and separately exposes observed uncached prompt tokens, so approved
rules need not charge cached tokens at the full uncached rate. Missing or
inconsistent cached counters do not produce a fabricated zero. Output bounds must
fit reserved completion-token quantities; provider-specific input/media bounds
and full model billing-dimension coverage still gate activation.

`portal_capacity_applications.coverage=managed_gateway_only` explicitly prevents
checkout readiness, activation receipts and active purchase status. The native
budget can enforce its own admitted requests while Usage reports partial coverage
and null remaining capacity. Only a complete enforcing-owner implementation may
publish `coverage=complete`; financial configuration cannot set that field.
`accountingCutoverAt` records the first native application. Pre-cutover activity
is not converted into customer charges. Rollups group units/funding and publish
atomically; absent supplier observations stay null. Daily request guards retain
rolling 24 hours; monthly guards and included credits use UTC calendar months.

| Category | Working native boundary | Required before complete activation |
|---|---|---|
| Sites / Hosting | Atomic complete-count checks in Deploy, Fleet registration and handoff for revision-2 bindings; shared subscription may host multiple entitled sites. Existing CPU/memory/disk/traffic/request observations retained. | Portal hold import/reserve/commit/release migration and authoritative `siteQuantity` projection; full enforcing acknowledgement. |
| Intelligence | Configured rational credits, shared pools, model/settings snapshots, generation bounds, actual token/image metrics, native reservations and settlement. | Persistent operation IDs throughout background/agent callers; verified input/media token bounds, complete provider billing dimensions, retry reconciliation and configured rates; image editing/model activation tests. |
| Email | SES/SMTP return accepted envelope recipients; native SES reserves the recipient bound and settles actual acceptance. No marketing-only estimate. | Every direct/workflow sender must carry tenant or platform attribution; essential security/recovery budget; remaining adapters' partial-acceptance and recovery receipts. |
| Search | Native extractor remains local-funded; paid Exa extraction enters the shared reservation ledger. Provider/operation identity retained. | Complete Exa search/contents billing observations, cache/fanout reconciliation and durable caller identities. |
| Blockchain / Solana RPC | Method activity retained; fabricated universal compute weights removed. Priced reservations require explicit native dimensions. | Authoritative provider-native chargeable units and method/resource observations; configured bounded pricing. Missing observations hold reservations. |
| X API | Social calls map to X API; actual selected customer/platform credential determines funding. BYOK uses the existing X client; shared priced reservation gate governs Cedros-funded calls. | Native endpoint/resource billing observations and cache/write recovery; configured bounded pricing. Missing observations hold reservations. |
| Storage | Actual resident destination recorded; R2 media/DO private and historical routing retained. Missing sizes, malformed or repeated inventory pages fail explicitly. Operational log reconstruction is marked non-authoritative. | Complete logical inventory, atomic growth admission across signed uploads/local mail/media, replacement/deletion reconciliation, signed read/apply/ack. Physical copies/indexes/staging/backups must remain separate. |

Site-local quota transport must reuse `controls_source_transport.rs` and signed
controls assertions. Native mail/Dovecot and local media remain the enforcing
owners. The complete aggregate, native transport/application acknowledgement and
restart/outage tests are still unimplemented. Unknown storage supplier-cost history blocks new gateway writes and public
handoffs. Existing object reads, metadata checks and deletion remain available
under the existing request/rate and known-spend guards so recovery and reducing
occupancy remain possible. Their unknown supplier costs remain visible; this
recovery policy is not a complete financial cost ceiling. No storage upgrade is
active and no customer data is automatically deleted on downgrade.
Native X consumes a canonical organization-owned credential when selected and
otherwise uses its explicitly configured native platform account. The customer
path shares the existing X feature switches, fixed API origin, response bounds and
no-retry publishing transport. Missing/invalid customer tokens never trigger
The Cedros platform-token fallback, and foreign-organization references are rejected before
admission. Native SES still uses the platform account: a requested customer-key
reference is rejected before reservation or dispatch until a credential-aware SES
execution path exists. These are unfinished platform
implementation tasks, not claims that another team has completed them.

No change in this branch is deployed or verified live. Approved plan quantities,
customer conversion rates, supplier billing configuration, installed extension
versions and signed runtime/Stripe environments must be verified before launch.
The protocol is authoritative; its unfinished paths are explicitly unavailable.

### Native Pay base-binding read

Pay must export the additive `capacity.binding.read` operation. It has **only**
the internal extension-service route `cedros-pay:capacity-binding-read-v1` at
`POST /extensions/cedros-pay/capacity/v1/binding/read`; there is no public HTTP
buyer endpoint. The `Invocation` has null delegation and request key and command
`{organizationId}`. Native platform supplies authenticated extension-service context,
principal/actor `cedros-data`, the exact capability claim and the same organization.
Pay verifies installation/environment from its installed settings and confines the
organization to its trusted customer/base-subscription bindings. This read must
never call back into platform. Public/internal IDs for the existing Pay buyer operations
remain distinct and unchanged. The four platform core operations likewise declare
`transport: extension-service-only`; their operation paths now match their existing
service bindings instead of suggesting unimplemented HTTP aliases.

`BillingBindingResponse` supplies installation, environment, organization,
`bindingRevision`, freshness and the complete base-subscription list. Each subscription
has a stable ID, customer-facing display name, recovery/eligibility state, offer IDs
and included allowance contributions in approved service-owner units. `BaseAllowance`
includes meter, unit, canonical nullable site ID, explicit limit state, included
quantity and meter-specific `offerIds` (a subset of the base subscription's offers). Pay must exclude add-ons from base selection, verify organization/customer
ownership, and use the approved plan-to-meter mappings. Do not infer allowances from
price, Stripe quantity alone, a paginated site list, or wholesale provider guards.
A missing mapping is unconfigured, never zero. Do not include Stripe customer IDs,
prices, credentials, provider records or arbitrary metadata. A genuinely unsubscribed
organization has an authoritative empty list; an unavailable source returns 503.

Finite applicable contributions add; duplicate subscription IDs or scope/meter rows
are rejected. Conflicting limit states are unavailable until the owner mapping is
corrected. Revision-2 contributions use canonical site IDs for explicit site ceilings and
null scope for organization pools. The legacy site-local meters retain their old scope. A binding revision is opaque and immutable for its contents;
The Cedros platform orders observations by their timestamp and rejects revision-content conflicts.
Freshness is at most 60 seconds. Oversized/incomplete projections fail rather than
truncate. This read is required for platform discovery, delegation and reconciliation;
its absence keeps those operations unavailable without manufacturing subscription
ownership from Deploy records. Pay's financial quote, purchase and grant wire shapes
are unchanged.

Reviewed prerequisites: Portal `1e095d6`, Providers Manager `8d86f69`
(`HOST_HANDOFF.md`, managed usage policy), Pay `a823f02b` (base-plan isolation).
The Cedros platform adopts the service identities, units, precision and lifecycle rules below
as the final integration standard, incorporating the teams' concrete amendments.

## Usage read

Add fields inside `usage`, preserving `windowDays` and `sites`. Portal detects
`schemaVersion`; absence means the legacy hosting-only response, never zero
service usage. Version 1 includes complete `siteCount`, `meters`, `generatedAt`,
and `organizationId`. The initial response includes all applicable meter scopes;
there is no implicit pagination or truncation. If response limits prevent a
complete answer, fail explicitly. A future paginated detail API is a separate
versioned change. Organization totals cannot be calculated from a UI page.

`siteCount` comes from `portal_site_eligibility`, including its existing Deploy /
Fleet deduplication and failed/deleted status semantics. It is not `sites.length`.
Site meter scope uses the canonical Portal site ID (Deploy ID when linked to an
actual Deploy row, otherwise Fleet ID); the host resolves runtime IDs internally.
An organization meter appears once, with site attribution in the ledger. Site
ceilings constrain this pool; they do not multiply it.

Every amount is an integer in [0, 9007199254740991] in the declared unit, or null
where the schema permits unknown/not applicable. Use checked integer arithmetic.
Never coerce overflow, source failure, an empty result, or missing configuration
into zero. `limited` with `effectiveCap: 0` is an explicit zero allowance;
`unlimited` requires an affirmative entitlement; `unconfigured` has no approved
allowance; `externally_managed` represents BYO/external enforcement. The last three
states have null cap and remaining. `unavailable` is a source state independent
of entitlement configuration. Measured zero is allowed only with an available
source. Partial/stale values remain labelled with their actual observation time.

`freshness` separately describes usage, allowance and reservation sources, with
`observedAt` and `validUntil`. Null timestamps mean unknown. An available source
requires both timestamps and `observedAt <= generatedAt < validUntil`. Overall
availability is the worst applicable state: unavailable, stale, partial, available.
Known fields may remain visible during another source's failure; `remaining`
must be null unless all three sources and the applied revision are current.
Do not stamp the response time onto old rollups. Missing services still get a
row with unavailable sources and null amounts, rather than disappearing.

`included + purchased = effectiveCap` for a known finite allowance. `purchased`
counts only effective, verified grants applied by the enforcing owner; pending
paid grants are shown in purchase status. `remaining = max(0, cap-used-reserved)`
only within one scope, unit, period and applied revision. Consumed usage can
exceed a reduced cap and is never erased. Operational restrictions are separate;
the displayed cap must not promise admission through a throttle or suspension.

`period` explicitly distinguishes UTC calendar month, rolling 24 hours, rolling
minute, subscription interval, and occupancy. Rolling windows have no discrete
reset (`resetsAt: null`); occupancy has no boundaries or reset. Existing daily
request counts are rolling 24 hours and monthly counts use a calendar month;
neither is a subscription-period allowance. New calendar-month meters require
UTC boundaries and no rollover. Grant expiry and financial renewal dates do not
change the meter's reset date.

All authenticated organization members may read Usage under existing
`PortalAuthority::Read`. Offers/status may be read with that authority after
scope verification; omit payment secrets and payment-method details. Preview,
authorization, checkout, and financial mutations require existing
`BillingManage`: owner, admin, billing-admin, billing_admin. Cache public meter
data separately from actor-specific eligibility, or key by actor and authority
as well as organization and site. Recheck membership on every operation.

## Catalog and commercial meaning — accounting revision 2

| Customer category | Customer quantity | Budget and retained breakdowns |
|---|---|---|
| Sites / Hosting | current allocated sites | `sites.count`, no reset. CPU, memory, physical disk, traffic and requests remain operational. Developer adds sites; it does not multiply Individual service budgets. |
| Intelligence | configured customer credits | AI execution, continuations, generation/editing images share one allocation. Retain provider/model/modality/tokens/image settings and activity separately. |
| Email | provider-accepted outbound recipients | `email.recipient-acceptances`, UTC calendar month. All tenant-attributable workflows, including transactional, notifications, replies, recovery and security. |
| Search | configured customer credits | Native extraction, Exa searches and Exa contents retain provider/operation and native cost dimensions. Cache activity cannot invent supplier usage. |
| Blockchain / Solana RPC | configured customer credits | Retain RPC method, provider-native billable units and call activity; no built-in universal method-price table. |
| X API | configured customer credits | Retain endpoints, read/write subtype and returned/billed resource counts; no equal-cost action allowance. |
| Storage | logical retained bytes | `storage.occupied-bytes`, no reset. Files/documents, mail, attachments and media; local and provider-specific breakdowns belong to this category. |

`managed.credits` can fund Intelligence, Search, Blockchain and X API together.
An explicitly configured category-specific credit meter is also supported. A
`BaseAllowance.categories` array maps categories to **one** organization budget;
the cap is published once in `meters`. `Usage.categories[].budgetMeterIds` supplies
references rather than duplicating a shared cap into every category. Site limits
are additional restrictions. Their quantities are not added to the organization
pool. `credit` is an integer customer unit; supplier cost is tracked separately in
micro-USD. Operator-approved rational conversion rates govern both quantities;
a customer credit is never implicitly one supplier dollar. Supplier micro-USD
is calculated from observed units and the snapshotted configured rate; it is not
proof of the provider's final invoice. Provider invoice reconciliation and rate
verification are separate activation requirements.

Platform-owned provider profile `accountingV2` holds immutable-at-admission pricing
rules. Customer-owned profile metadata cannot price Cedros-funded operations;
native synchronized SES/X tenant profiles resolve pricing from the matching
The Cedros platform-owned profile through the existing profile store. Admission snapshots
the pricing profile ID, revision and configured version in the pricing version
identity. Missing or disabled platform pricing is unavailable for funded admission.
BYOK execution does not load Cedros pricing. The existing revision-fenced
`PATCH /admin/runtime/cedros-providers-manager/provider-profiles` permits the
The Cedros platform operator with `OpsWrite` to change only `metadata.accountingV2` on
system-managed SES/X profiles, preserving all native connection settings and
other metadata. An empty rule array disables funded execution. Bootstrap
preserves these rules; full profile replacement and native credential mutation
remain disallowed through that profile endpoint.

Organization-owned X tokens use the existing authenticated
`PUT /admin/runtime/cedros-providers-manager/provider-profiles/x/credential`.
The Cedros platform binds `providers-manager/{organizationId}/x` before storing the secret.
Deletion retains the customer account binding: an absent or invalid token fails
without platform fallback, including after bootstrap or a feature-switch change.
The native client retains the fixed X origin, response/request limits, no automatic
publish retries and separate publishing switch. SES still consumes its native
The Cedros platform account; unsupported credential references fail before reservation.

Existing notification/channel identities, calendar effect IDs and extension
email outbox idempotency keys now feed hashed email operation identities into
the same admission ledger. They do not create a second delivery ledger or infer
acceptance. Correlation-only local provider chains retain their existing delivery
semantics; unknown managed outcomes remain held for reconciliation.
The configured rules contain:
`version`, exact `operation` and `model`, `category`, `meterId`,
`maxRequestBytes`, nullable `maxOutputTokens`, `requestSchema`, and `rates`.
Each rate binds `metric`, `unit`, `maximum`, `supplierMicroUsd`,
`customerCredits`, and positive `divisor`. Rates and quantities are nonnegative
integers; accumulate rational prices before rounding up once. Exactly one rule must match the request schema; ambiguous or unmatched settings
are unavailable. The request schema must constrain the approved model, modality, settings, fanout and resource bounds.
Missing, ambiguous, unsupported or stale configuration rejects paid execution.
Native generation adapters apply the server output bound. An actual observation
outside configured bounds remains unresolved, never becomes a fabricated zero.
No supplier or customer rates are supplied by this standard.

Pay's existing native binding read adds `accountingVersion: 2` only at the
approved cutover. `includedAllowances` remains the owner API; no second plan or
entitlement source is introduced. Approved plan configuration must supply actual
values. Workbook scenarios and Developer plan names do not create allowances.
`purchasedCreditPolicy` explicitly describes purchased allowance behavior. The
currently implemented policy is `calendar_month_recurring_no_rollover`: recurring
capacity supplies each UTC month, within independently verified grant effective
and expiry times. Unsupported or unconfigured rollover/one-time credit policies
remain unavailable; do not silently give them monthly expiry. Sites/storage
remain occupancy entitlements and are unaffected by monthly boundaries.

SEO/Ahrefs and Voice/ElevenLabs are outside Providers Manager and are not Cedros
included/top-up products. The Pay capacity catalog defines no offers, prices,
entitlements, or allowances for them. Their historical meters remain readable but
cannot authorize new routing or purchases; Core-native products own any current
configuration.
Adapters that resolve native global accounts (currently SES and X) must never be
labeled customer-funded from a profile metadata flag. Local infrastructure costs
remain Cedros costs even when a customer's external API key funds an operation.

Email acceptance is distinct from delivery: a later bounce does not refund an
accepted recipient. Unknown outcomes retain their reservations; retries at the instrumented native
gateway cannot send again merely because a worker timed out. Partial acceptance settles the
provider's accepted subset. Platform-owned correspondence must carry its own
internal allocation. Essential tenant security/recovery mail requires a separately
authorized, bounded emergency allowance with visible costs; its missing native
integration is a launch blocker, not permission to omit it from accounting.

Historical request/image/URL/voice/SEO and campaign-only meters remain immutable
history. They cannot authorize new purchases, and their unreliable logs are not
converted into credits or retroactively billed. Existing financial acceptance and
snapshot reconciliation remain idempotent. New offer versions must bind the new
meter/unit and approved conversion policy. Base-plan isolation is unchanged.
The old `cedros-addon-managed-capacity` request mapping and campaign-only mapping
must not be reused without a new immutable offer/version. Voice/SEO/image-only
Cedros-funded offers are prohibited.

Storage routing remains R2 for site/public media and DigitalOcean for private
files, backups and existing non-media workloads. Immutable object locations
preserve old DigitalOcean media reads after the new-write route switches to R2.
Inventory must follow actual residence. Migration copies, platform backups,
replicas, temporary staging and internal indexes add physical costs but do not
multiply logical customer assets. Retained generated files use Storage, without
adding a second Intelligence charge. Over-cap downgrades block growth, not delete
customer data.

## Decision record and incorporated amendments

The standard incorporates Pay's patch against `a12fa68c67`, Providers Manager's
catalog/lifecycle and R1/R2 requests recorded at `7326d1f`, and Portal's discovery,
permissions, recovery, freshness and reservation requirements. platform's final
decision supersedes the former unanimous-review workflow. The record below
explains what was incorporated; it does not solicit another sign-off round.

| Review requests | Amended normative sections / artifacts |
|---|---|
| Pay 1 | Invocation, delegation and exact `serviceBindings` / core registrations |
| Pay 2; Portal 2 | Immutable quote, capacity increase, interval count and currency |
| Pay 3; Manager M1; Portal lifecycle | Recurring service / payment attempts / grants |
| Pay 4; Portal 5 | Uniqueness, acceptance, recovery and actions |
| Pay 5; Portal 3 | Member-safe status and role mapping |
| Pay 6; Portal 4, 6 | Atomic snapshot publication, freshness and Usage receipt |
| Pay 7 | HTTP mappings and executable fixture checks |
| Portal 1 | Target discovery and recovery destinations |
| Portal 7 | Fenced site reservation migration and operation bindings |
| Manager M2, M3 | Local accounting / read-apply-ack; versioned guard migration |
| Pay 0.2.0 request 1 | Distinct public/service route IDs in operations and serviceBindings; union registration check |
| Pay 0.2.0 request 2 | Immutable grant bindings; confined snapshots; duplicate-page/completion replay and revision-zero bootstrap |
| Pay 0.2.0 request 3 | Durable idempotency receipts for all mutations, independent of response-cache retention |
| Manager 0.2.0 R1 | Separate schedule/enforcement identities, strict writer acknowledgement and organization revision mappings |
| Manager 0.2.0 R2 | Complete per-operation guard decisions, immutable values, server approval and atomic migration |

## Invocation, delegation and exact registrations

The existing WIT `server/wit/cedros-extension.wit:314` carries target extension,
route ID, capability ID, method, path, query and body JSON. It carries no original
buyer or request header. `extension_service_routes.rs` constructs a context whose
actor is the **calling extension**, not a customer. Do not reinterpret it as a
buyer. `staging_sync_service.rs` already uses an opaque server-issued authorization
and a request key inside JSON; use that pattern without reusing its unrelated
staging permission or token namespace.

Every internal invocation uses the exact `serviceBindings` JSON table:
`target-extension-id`, `route-id`, `capability-id`, POST, exact concrete `path`,
empty query, and `body-json` serialized from `Invocation`:
`{contractVersion, operationId, delegationId, requestKey, command}`. Command is
validated against that operation's request schema, with no extra fields. Public
HTTP operations retain the six original Pay paths; their HTTP adapters translate
to the same domain command. Internal POST paths differ from public GET paths so
there is no GET-body ambiguity. No caller-supplied headers are forwarded. The required public Pay HTTP adapter
accepts `X-Cedros-Capacity-Delegation` and `Idempotency-Key` alongside existing
Login authentication, and moves those values into the Invocation body. The
operation requestSchema remains the JSON command. These are required header
bindings that Pay must implement. Native platform owner HTTP routes
continue using their established verified owner authentication.

Pay public HTTP route IDs end in `-http-v1`; internal service route IDs keep
their `-v1` IDs. The capability ID names the authorized operation and remains the
internal service ID. Public and internal paths share a domain command, not a
route registration. Register both IDs from the exact tables; the platform registry
permits one method/path per extension/route ID. The checker validates the union
of public Pay and internal service registrations, not each table in isolation.

`requestKey` is the public Idempotency-Key transported as JSON. It is required
for mutations and null for reads. Missing keys and inconsistent header/body keys
are 422. Keep the exact key on retries. Service handlers reject an operation ID,
method, path or exact capability mismatch. platform registrations are enumerated in
`coreCapabilityRegistrations`, all **required-not-registered**. Implementation must
update the published-core allowlist in `extension_service_routes.rs`, Core
capability declarations in `extension_platform.rs`, and compose dispatch into
`staging_sync_service.rs::CoreServices` / `extension_runtime_host.rs`; do not
replace the existing wallet/staging handlers. Pay must register every listed
service route and implement its guest-to-domain invocation adapter. Capability
publication remains withheld until those handlers and authorization tests pass.

For financial and delegated capacity mutations, scope a durable idempotency receipt by operation ID, Pay
installation, payment environment, organization, authenticated acting user, and
request key. Compare the entire canonical command (including target, action,
quantity and referenced quote digest); changed input under the same scoped key
returns 409 idempotency_conflict before side effects. Public and internal adapters
share the same operation identity. Distinct operations or actors have distinct
receipts, but never bypass quote/purchase/authorization financial uniqueness.
Keep canonical request digests and durable outcomes for the financial audit
lifetime, including billing actions, cancellation and authorization redemption.
Expiry of a delegation or removal of a response cache cannot remove these records
or financial uniqueness indexes. Replay always rechecks current authorization,
except the explicitly confined trusted recovery of an already accepted purchase.
An expired action URL stays expired: replay returns the same action/outcome;
a newly authorized action needs a new key and creates no duplicate charge.
Concurrent receipt claim, outcome publication and financial state changes require
atomic native persistence; the in-memory reference is not that implementation.
The new native guard-approval and Portal migration-import operations have no Pay
installation or buyer delegation. Their explicit `idempotencyScope` metadata
and operation-specific rules below apply instead; current operator/host authority
is still required on every replay.

Portal first obtains a delegation through the owner route specified here
`POST /portal/v1/billing/capacity/delegations` using the existing verified owner
facade identity. platform verifies current Login membership and the authority needed
for the requested operation. It stores a hash of a cryptographically random
opaque token, exact operation/command/request key, acting user, organization,
canonical site, target Pay installation and environment, allowed calling
extension and expiry (at most five minutes). The returned delegation ID is a
secret bearer reference restricted to that binding, not a free-form identity.
Do not put it in URLs, logs or durable customer projections. Store tokens using
the existing secret handling pattern; no new shared browser or provider secret.

A Pay HTTP request must still authenticate its Login buyer. Its domain adapter
presents the delegation to platform `capacity.delegation.check` via the host service
route and requires that the returned acting user matches that Login buyer.
A host invocation from Portal has no second buyer header: Pay uses platform's checked
delegation as the original buyer evidence. platform verifies the host-fixed caller,
token hash, command, operation and key, then current membership and expiry.
For scope-check/redemption, the adapter supplies the original delegated operation
and command to delegation-check, then compares the extracted target or accepted
quote to the leaf command. A token for an unrelated read cannot authorize a
purchase. Neither guest-supplied actor fields nor `auth_scheme=extension-service` alone
constitute buyer authority. Delegations cannot be minted by an extension merely
asserting a buyer ID. Browser cookie routes retain CSRF protections.

Installation identity comes from the host's installed Pay record and server-side
billing-account binding; `test/live` comes from that installation's verified Pay
configuration. The generic route-context environment label (managed/self-hosted)
is not a payment environment. Missing or inconsistent mapping returns 503 and
withholds offers. platform scope-check/delegation-check/redemption are **leaf local
operations**, using verified persisted organization/subscription bindings, and
never call Pay. Binding synchronization/discovery is a separate native job. No
The Cedros platform scope check may infer account ownership just from a Deploy subscription ID.

Trusted platform reads of Pay quote/purchase/grant records use a new **native platform
adapter** into the installed Pay service routes, with host-fixed core principal,
exact capability, installation/environment/org confinement and null delegation.
The current `client("cedros-data")` is not this adapter: normal clients require
an installed calling manifest. Implement this explicit core dispatch path before
publishing it. Pay's trusted-read branch validates the native host identity and
returns persisted records without calling platform. Thus platform authorization → Pay
quote read ends at Pay; Portal → Pay → platform delegation check ends at platform. Grant
hints only durably enqueue work; reconciliation runs after the hint call returns.
No nested Pay → platform → Pay callback or invented platform guest manifest is allowed.
The exact native context fields are in `invocationMechanism.nativeDataContext`;
only the native dispatcher may construct that principal. A guest body claiming
those fields is rejected. Internal trusted replay is restricted to an existing
purchase/quote/digest under the verified Pay installation; absence of a live
delegation can never create a new acceptance.

## Target discovery, permissions and safe actions

The Cedros platform `capacity.targets` returns canonical organization/site names and eligible
base-subscription targets from verified billing ownership and the complete site
eligibility projection. It returns every supported target through explicit opaque
cursors pinned to one discovery snapshot, never a paginated UI-site inference.
Unknown sources produce `destination: unavailable`, not an empty subscribed
account. No active base plan produces `base_plan_selection`; past due produces
`billing_recovery`. These destination tokens select Portal's existing base-plan
chooser or billing recovery flow; they are not arbitrary URLs. Add-ons cannot
be base selections. Each target carries offer IDs; offer lookup uses its exact
`Target`, and every subsequent operation revalidates ownership.

Read authority permits Usage, discovery, offers and sanitized purchase/status
listing. BillingManage is required for preview, delegation of billing mutations,
authorization, purchase, cancellation and payment actions. Portal must extend its
Login role parser to map `billing-admin` and `billing_admin` to **billing-only**
authority; it must not map them to owner/admin or grant site/team/security rights.
Unknown roles fail closed. Site reservation operations retain SiteManage.

`PayPurchaseResponse` and `StatusResponse` contain no checkout/action URL. The
separate `capacity.billing.action` operation authenticates a current BillingManage
actor, records `actingUserId`, and returns a short-lived action URL. Another
billing administrator may manage the organization's purchase; immutable
`originalPurchaserId` remains unchanged and each action is separately audited.
This requires an organization-owned Pay financial customer. If provider action
semantics require the original payer, fail closed with 403 rather than share that
payer's link. Member reads do not contain delegation, payment method or financial
provider secrets. URLs are returned only by this action response.

Pay constructs checkout success/cancel URLs from the installed Portal's approved
origin and fixed recovery route, with an opaque expiring return reference bound
to purchase/installation/environment. The customer cannot choose an arbitrary
return URL. Return parameters never prove payment. platform's organization-scoped
`capacity.purchases.list` supports a `quoteId` filter and snapshot-pinned cursors,
so lost responses/session storage do not strand purchases. After Login recovery,
authorized users can recover accepted purchases by organization without the
original request key. No session is required for trusted financial reconciliation.
Activation retries are automatic durable jobs; the browser refreshes status and
must not create another purchase to retry application.

## Complete quote, additional items and financial acceptance

`quantity` means **additional purchased items**, not a new total subscription
quantity. Enforce offer minimum/maximum/step on the server. `Terms` only accepts
billing interval count 1 in this release; catalog offers with count >1 are
ineligible and preview returns 422 `unsupported_interval`. The amount per item
is allowance per UTC calendar month, including annual-billed offers; occupancy
items are a simultaneous site/byte ceiling. No unit proration or rollover.

`Quote` includes the entire Binding, tax, subtotal, total due, renewal total and
renewal tax, currency minor-unit digits, effective and paid-through times,
server-computed `capacityIncrease` (scope/meter/unit/period/amount), and acceptance
policy. Increase is checked `quantity * allowancePerItem`, not arithmetic trusted
from Portal. All money is an integer in that currency's minor unit: display
amount / 10^currencyMinorUnitDigits using localized formatting, never hard-coded
cents. Total due includes tax. Renewal total also includes the quoted renewal tax
and is an estimate for the next billing period; tax changes require a new
Pay-authenticated billing-period record under accepted terms, never editing the
initial accepted quote. Unknown tax/amount prevents preview acceptance.

`PreviewResponse = {quote, quoteDigest}`; digest scheme is
`capacity-json-v1`: SHA-256 of UTF-8 compact JSON with recursively lexicographically
sorted object keys, array order unchanged, unescaped Unicode and standard JSON
escapes, no whitespace, no floats/NaN, safe-range integers only. Field names are
ASCII and the digest covers the **entire Quote including contractVersion**.
No Unicode normalization is applied. Prefix the lowercase hex digest `sha256:`.
Duplicate JSON keys must be rejected before parsing. The fixture runner includes
the canonicalizer; it is not claimed to be general RFC canonical JSON.

The Cedros platform fetches the stored quote through the leaf trusted read, validates digest,
current membership, scope and runtime eligibility, and persists the full immutable
snapshot with authorization. Pay redemption sends quote ID and digest; platform
compares against the stored snapshot, never a subset Binding. Any changed tax,
amount, effective date or paid-through date invalidates authorization. Quote and
snapshot remain available through authorized purchase reads after quote expiry.

Pay durably claims a purchase ID **before** invoking platform redemption. Acceptance
is the atomic platform redemption at a server timestamp strictly before quote expiry,
recorded in Pay through retry/reconciliation. platform rechecks current mutation
authority on first redemption. Pay must not create a charge before confirmed
redemption. Lost redemption responses query/replay the durable result. Expiry
prevents first acceptance, not replay or completion of an accepted purchase.

There is one accepted purchase per `(installation, environment, quoteId)` and one
redemption target per authorization, independent of Idempotency-Key, buyer retry
key, or multiple authorizations. platform additionally binds the quote itself to the
purchase ID, so minting a second authorization cannot evade uniqueness. Pay
returns the existing purchase for compatible retries; conflicting bindings fail
409. Concurrent attempts under different keys cannot create a second charge.
Provider payment idempotency derives from stable purchase/billing-period/attempt
identity, not a fresh browser key. An ambiguous outcome stays pending and is
reconciled against that provider identity; do not start another charge until its
outcome is known. Trusted replay after expiry/session loss must match an already
accepted record; it cannot create fresh acceptance or change the acting buyer.

Delayed payment confirmation activates only the remaining portion of the quoted
[effectiveAt, paidThrough) interval; no silent repricing, shifted dates or reset.
After paidThrough, settlement may still be recorded as paid, but capacity is
expired; Pay must resolve the payment under accepted refund/credit terms. Such
terms must be configured before sales. Until confirmed financial eligibility,
no new grant exists. An accepted quote is never replaced by a newer catalog price.

## Recurring service, grants and payment attempts

`purchaseId` identifies one stable recurring add-on purchase across renewals;
independent purchases may add capacity. `initialAttempt` and `latestAttempt`
carry durable `attemptId`, `billingPeriodId`, initial/renewal kind, financial
interval, payment freshness, refund revision and dispute state. `initialAttempt`
is the latest attempt for the initial billing period, not permanently the first
failed attempt; older attempts remain in Pay audit history. New payment attempts
within a period require a definitively resolved prior failure; ambiguous outcomes
continue using the same attempt identity. The recurring
service has a separate cancellation/paid-through state. A failed or canceled
**initial** payment grants nothing; a failed/canceled/action-required **renewal**
does not revoke previous paid-through capacity. Cancellation stops renewal at the
paid-through boundary, not the current payment or grant. BillingManage may call
`capacity.cancel` with `at_paid_through`; immediate destructive cancellation is
not offered. Replays return the original effective cancellation and actor audit.

Partial refunds do not translate money into units. Pay publishes an explicit
approved revised allowance, possibly unchanged for a monetary-only refund.
Dispute opening may revoke at its explicit effective time; a won dispute may
restore via a higher active revision, while a lost dispute retains revocation.
The Cedros platform does not infer reinstatement from a payment status string. Preserve consumed
units and all admitted reservations throughout refund/dispute changes. A failed
renewal with active paid capacity is expressly valid in `StatusResponse`.

Each grant binds the immutable initial quote snapshot plus billing-period/payment
attempt IDs, financial interval, allowance, and `revisionEffectiveAt`. Annual
billing permits the same contribution each calendar month during that year, not
12 times the monthly cap. Adjacent renewal intervals do not overlap. Reject
overlapping or duplicate interval grants for the same installation/environment/
purchase/scope/meter even with different IDs. Across revisions of one grant,
purchaseId, authorizationId, quoteId, the entire initial snapshot, billingPeriodId,
paymentAttemptId and [effectiveAt, expiresAt)
are immutable. Validate the embedded quote digest and matching quoteId; recomputing
a digest does not authorize rebinding a known grant. Renewal uses a new grant ID
and billing-period identity, retaining the original purchase/quote binding.
Initial revision effectivity equals
effectiveAt; revocation effectivity equals revocationEffectiveAt. Higher revisions
may arrive early; retain the prior effective revision until the transition.
Reject retrograde revision schedules. Corrections received after their effective
time apply immediately on publication while preserving historical settlements;
the new effective timestamp must not precede the prior revision effective time.

Reservations and settlement remain pinned to the **admission calendar period**,
even after midnight. Allocate included capacity first, then purchases by earliest
expiry and grant ID. Track recurring allocation by purchase and calendar period
so adjacent mid-month renewal replaces the item's contribution instead of
refilling consumed allowance. A reduction may leave used > cap; do not erase
usage, double-subtract consumption or reject settlement of admitted work.

## Atomic snapshots, enforcement revision and freshness

Stage every snapshot page under installation/environment/org/snapshot ID, page
index, high-water source revision and immutable snapshot digest. Cursors bind the
same snapshot; expiry restarts collection. The digest uses capacity-json-v1 over
`{payInstallationId, environment, organizationId, sourceRevision, grants}` with
grants sorted by grant ID then numeric revision. Keep historical and scheduled
revisions needed for transitions. Verify all pages and explicit tombstones,
overlap and revision rules before **one transaction** publishes the new ledger
view and advances the source checkpoint. Every page and every embedded grant
must match the trusted requested Pay installation, environment and organization. Reject a mismatched page or grant
before staging. Exact page retries return their stored outcome without appending
again; completed-snapshot retries never republish or move the checkpoint.
A changed payload at the same snapshot ID/page index conflicts. A fresh snapshot
at the current source revision is permitted only with the same source digest;
older unknown snapshots fail closed, while recorded exact replays are no-ops.
No checkpoint is distinct from source revision zero: an initial empty complete
revision-zero snapshot must publish successfully. Preserve replay receipts across
restarts. A rejected final page must leave its staging position retryable; an
expired cursor restarts collection under a new snapshot without changing live data.
No page changes live allowances. This
prevents replacement grants split across pages being counted together. Absence
is not revocation; Pay must retain explicit tombstones until all consumers have
reconciled. Older/conflicting snapshots cannot replace newer published state.

The Cedros platform maps a published source revision to a desired organization revision
`{epoch, sequence}`; sequence increases within a persistent epoch. The mapping is
stored, never inferred by Portal from Pay revision numbers. Scheduled changes
create a new desired revision when effective. Applied revision advances only
when the central resolver and every affected enforcing runtime acknowledge the
same desired state. Mixed application remains applying; reads use each owner's
actual applied state with unavailable/partial status and no invented remaining.
Unknown epochs cannot be compared; restore/migration requires explicit fencing.

Active status includes affected MeterRefs and an opaque platform-issued `usageReceipt`
bound to organization, purchase and applied revision. Portal sends it as
`minimumReceipt` on the existing Usage GET. platform returns Usage at that revision
or a newer same-epoch revision, otherwise 409 `revision_not_applied` or 503 if
unavailable. Portal discards earlier in-flight responses after observing active;
it never compares opaque strings or mixes pre-receipt balances into that view.
The Cedros platform invalidates caches on publication and application, rejects late cache fills
from an old revision, and also aligns `cedros.portal.siteQuantity` with this
resolver before sales. A current lower cap after revocation is valid newer data.

Payment, recurring service, capacity, offers and discovery have separate Source
freshness. Available means observedAt <= now < validUntil. A missing observation
uses unknown and null timestamps; it cannot assert paid, failed, zero or active.
Upon expiry, retain a prior active observation as `last_confirmed_active`, not
active. Other prior states remain explicitly stale; no action eligibility can be
inferred from them. Capacity unknown has null revisions and no Usage receipt.
Status may return null purchase when its source is unavailable after local scope
authorization; nonexistent or other-org IDs remain 404. Browser clocks may render
age but server freshness is authoritative. Expiry never extends itself on a
cached read. Paid + pending/applying/application_failed remains distinct from
active and supports recovery without repurchasing.

## Local quota accounting and signed read/apply/ack

The Cedros platform owns transport, reconciliation and both ends of runtime application. Native
mail plus Dovecot own mail enforcement; local-media storage owns media enforcement.
Manager owns policy review. Exact required POST paths are the three
`capacity.local.*` operation bindings below `/managed-services/controls/v1/capacity/`.
Reuse `controls_source_transport.rs` signed method/path/body/site/actor assertions,
registered HTTPS host, nonce/time validation and no redirects. These are new
source handlers, not existing admin routes. Assert the control-plane service
actor `cedros-data:capacity-reconciler-v1`; the runtime verifies that reserved
actor and an explicit quota-control registration on this exact route. The current
assertion has no capability claim field: do not pretend it does. Ordinary
email-read actors/assertions do not authorize quota mutation. Bind organization, canonical site, runtime site and runtime
installation independently against runtime registration. No customer/admin
credential is forwarded to Portal or exposed in these bodies.

Local mail and media are Storage breakdowns. The existing mail site-quota view
also includes internal index/history bytes, and the local-media guard includes
staging. Those are physical safety measurements, not the revised customer logical
storage quantity. Logical accounting must exclude those copies while preserving
physical infrastructure guards. Count mailbox message/attachment content once per
retained logical asset; do not sum mailbox caps or repeated site totals per user.
Storage bytes follow the asset's recorded destination, not current provider choice.
Remote quota read/apply/ack and aggregate logical inventory remain implementation
gaps; no local storage upgrade may be reported active before the enforcing writer
and Dovecot have applied the revision.

`LocalQuotaCommand.scheduleRevision` orders **stored replacement schedules**,
not organization allowance revisions. It binds validFrom, validUntil, base cap,
and chronologically ordered non-overlapping intervals with unique interval IDs.
Intervals must fit inside the authority lease; all intervals are half-open.
The full command is immutable under capacity-json-v1 digest. Persist a received
schedule immediately, while retaining the prior enforcing schedule until every
writer is ready to switch. Identical revision/digest replays; lower revisions or
a different digest for the same revision conflict. Epoch changes require an
explicit runtime-registration fence. An ordinary replay cannot reset an epoch.

A replacement carrying a future reduction includes the interval covering now
with the unchanged current cap. Merely receiving its future interval does not
change that cap. Once writers adopt the replacement, its current interval can
be acknowledged, while its future interval remains unapplied until its exact
boundary. Runtime adoption switches the full schedule atomically under the
existing writer locks; it must not publish a mixture of two schedules. Future
intervals and fallback must be restored before any growth is allowed on restart.

If a pending replacement's lower-cap transition arrives before every writer can
apply it, fence positive growth until all writers enforce the reduction; do not
extend the old higher cap merely because application is pending. The source then
reports unavailable/pending application rather than successful enforcement.

`LocalQuotaAck.storedSchedule` identifies the latest durably received schedule
revision/digest. `enforcing` separately identifies the schedule actually used by
writers and its current selection: kind, nullable intervalId, and effectiveAt.
These identities are distinct when a newly stored schedule is pending while an
older schedule still enforces. `state: applied` requires them to match; `pending`
can report the older enforcing schedule and cap without granting activation.
The identities of each selection are:

- `interval`: the command's exact interval ID and effectiveAt.
- `base`: null interval ID; effectiveAt is validFrom before the first interval,
  or the immediately preceding interval's expiresAt in a gap or after the last.
  Including this timestamp distinguishes separate base fallback segments.
- `lease_expired`: null interval ID and effectiveAt equal to validUntil; this is
  an expired authority state, never active capacity or permission to grow.

Before validFrom, the command cannot enforce: retain the prior valid schedule or
report unavailable and block growth. At an interval expiry during outage, runtime
selects the next interval or verified base fallback locally. At authority expiry,
it blocks positive growth and reports expired with null enforcingLimitBytes;
this does not report zero usage. Reads, deletion, non-growing replacement and
existing data remain available. Never retain an expired purchased increase.

For an applied acknowledgement, enforcingLimitBytes must be numeric, including
zero; nativeWriterReady must be true; mail additionally requires dovecotReady=true
and allMediaWritersReady=null; media requires allMediaWritersReady=true and
dovecotReady=null. Queued provisioning is pending. Cross-field validation verifies
both identities against persisted commands, site/installation/meter bindings,
digests, chronological selection, cap and lease at observation time and again at
read time. A response crossing a transition boundary cannot prove the new state.
Acknowledgement freshness must expire no later than the next interval/fallback/
lease transition; used/reserved remain null if their source cannot be verified.
No timestamp refresh can manufacture readiness or a measurement.

`LocalOrganizationRevisionMapping` is a **platform-internal persisted mapping**, not
an instruction from Pay or the runtime. It binds runtime/site/meter, the exact
enforcing schedule/selection, numeric cap, and organization allowance revision.
The Cedros platform precomputes mappings for every interval and base-fallback transition and
persists a new desired organization revision when each becomes effective. A
stored schedule acknowledgement alone cannot satisfy that mapping. Publishing
active or issuing a Usage receipt requires current writer readiness and exact
identity/cap correspondence for every affected owner. A prior interval, an older
schedule with equal bytes, or a lease-expired acknowledgement cannot satisfy a
new mapping. A cap-preserving schedule adoption may receive its own organization
revision, but its future transitions remain distinct mappings. The sequence in a
schedule revision is never compared to an organization revision's sequence.

Retrieve acknowledgement with the signed ack operation; lost replies are polled,
not reinterpreted as failure to apply. Restart reports a new boot ID and rechecks
all native/Dovecot/media writers before acknowledgement. Native-mail currently
requires positive limits and media has a fixed 2 GiB cap: unsupported zero or
variable caps remain runtime_not_ready / unsupported_allowance until enforcing
writers and constraints are migrated. Do not clamp silently or enable sales.

## Fenced site reservations and guard-policy migration

### Native Manager review binding (2026-09-09 integration correction)

Use the existing authenticated Manager admin transport:

* `GET /admin/runtime/cedros-providers-manager/organizations/{organizationId}/sites/{siteId}/guard-review`
  requires `OpsRead` and returns `GuardReviewResponse`.
* `POST` to that path plus `/approve` requires `OpsWrite`, one
  `Idempotency-Key` (8–180 bytes), and `GuardApproveRequest` containing only
  `migrationEpoch` and `guardSetDigest`. It returns `GuardReviewResponse`.

These are native HTTP routes, not extension-service capabilities. Organization
and approving actor derive from the authenticated identity. An operator in the
configured control-plane organization may manage registered Fleet tenants;
other operators are restricted to their own organization. BillingManage alone
does not authorize either action. Site IDs here are Fleet runtime IDs, as in the
existing Manager tenant/guard editor, not arbitrary customer-supplied aliases.
Responses use `Cache-Control: no-store` and the shared `Error` envelope.

`policy` is the immutable approved policy, or a complete legacy policy when no
approval exists. `currentReview` and `currentGuardSetDigest` describe all current
rows and the complete route catalog; `approvalCurrent` says whether they still
match the durable approval. Manager must display both when drift occurs and
submit the **current** digest for another review. Never relabel old approval
evidence as the current rows. This response's `salesEligible` remains false:
guard cutover does not prove commercial admission or payment/runtime readiness.

Approval locks the limit table against all existing writers, including tenant
sync, recomputes the review, and atomically records both the policy and mandatory
audit receipt. Same scope/key/body replays the original receipt without changing
the approving actor; a different body or stale digest returns 409. Retry keys
are scoped to organization/site, so another currently authorized operator can
recover a lost response. A replay is historical evidence: reload GET to learn
whether it remains current. Receipt retention is durable, independent of caches.
Fleet removal deletes the active policy and retains its historical audit receipt.
The approved enforcement mode evaluates every applicable operational row using
that row's own scope; unrelated and unmigrated sites keep legacy selection.
Existing attempt, spend, rolling-day and calendar-month accounting is retained;
this change does not turn attempt counts into purchased logical-work units or
make count-before-dispatch admission atomic.

The separate browser read binding is
`GET /admin/runtime/cedros-providers-manager/organizations/{organizationId}/sites/{siteId}/local-quotas`,
with the same authenticated OpsRead/scope checks. `LocalQuotaAdminResponse`
contains exactly one row for each mail/media meter. Each row has a nullable
`observation` (the last platform-validated `LocalQuotaAck`) and independent freshness.
No observation means null, never a fabricated runtime installation/boot identity
or zero usage. An old acknowledgement remains visible as stale evidence;
`state=applied` inside that historical observation does not override its expired
freshness. platform validates runtime ownership, signature, schedule identity and
acknowledgement before storing or projecting it. This operation remains
unavailable until that persistence and transport are implemented. Manager may
wire this browser operation and handle 503; it must never call the signed
`capacity.local.*` routes or receive the reconciler's credentials.

### Portal bootstrap and import binding (bootstrap implemented; native migration pending)

The bootstrap read is implemented for compatibility with existing organizations.
The Cedros platform reads the JSONB `cedros-portal:site-quota-reservations` collection at the
lowercase SHA-256 organization key. A verified absent entry or a valid legacy
reservation array with no migration markers yields `state=legacy` and 15-second
freshness, starting before the database read. Portal can continue its existing
base-plan creation flow in that state. An absent/typed model, malformed record,
duplicate hold identities, or any migration marker yields `state=unavailable`,
null observation times, no epoch/receipt and `canUseDataReservations=false`.
Source errors and timeouts use the shared 503 envelope; neither becomes legacy.
The read requires current SiteManage authority and is never cached.

This compatibility read never issues an epoch, starts import, removes a hold,
or treats a Portal-supplied activation marker as platform evidence. Native Deploy
creation checks the same source inside the site/job transaction under the same
entry lock used by Portal CAS, including absent entries. A committed freeze
blocks new creation; an earlier accepted transaction completes before the freeze
and remains an identity to reconcile. Existing durable creates can replay.
The shared allocation guard also holds the same source lock in Fleet registration
and handoff transactions, including organizations without an accounting-v2 binding.
A frozen source rejects positive allocation growth while permitting metadata
updates and registration of an already-counted deployment. Native Deploy retains
its earlier pre-dispatch fence. This closes the alternative creation-path bypass;
legacy hold import, authoritative reservation transitions and activation remain
unfinished.

`GET /portal/v1/sites/reservations/migration` requires the existing Portal owner
facade and SiteManage. `SiteMigrationStatus` is the authoritative bootstrap:
Portal may reserve only when `state=active`, `canUseDataReservations=true`, and
the current migration epoch and durable import receipt are present. Missing,
unavailable or aging bootstrap is not permission to fall back to legacy holds.
Discovery accepts optional `includeSiteAdmission=true` and then includes
`siteAdmission` plus `migrationEpoch`; its top-level epoch is non-null only for
active admission. Omitting the option preserves the existing discovery shape.
Members can view Discovery's sanitized status, but cannot perform migration.

`POST /portal/v1/sites/reservations/migration/import` accepts `SiteImportRequest`
through the trusted Portal host/owner transport, with SiteManage and
Idempotency-Key. Import retry identity is operation, verified Portal installation,
organization, migration epoch and key. The full canonical page command is bound;
changed input returns 409, and a new key cannot import the same snapshot twice.
This is **not** a browser upload of purported holds: platform must
verify the frozen source CAS version and server-side organization against the
registered Portal installation's `cedros-portal:site-quota-reservations` model.
The entry key is the existing lowercase SHA-256 of organizationId. Portal freezes
that entry with the platform-issued epoch using CAS before reading its full contents;
The Cedros platform must also fence every creation path and reconcile previously dispatched jobs.
No epoch or source version supplied by a buyer is authority for this transition.

The snapshot digest covers `{organizationId,migrationEpoch,snapshotId,sourceVersion,holds}`
under capacity-json-v1. Holds are sorted by `requestHash` and preserve the exact
stored payload, fallback payload, expiry and request identities. Missing legacy
fields become null; never invent a request ID, digest or base subscription.
`sourceVersion=null` means a verified absent entry, never an unavailable read.
Each page carries identical snapshot identity/digest/counts, zero-based pageIndex,
and at most 100 holds. Stage all pages durably; exact repeated pages are no-ops,
conflicting pages/identity/digests fail 409, and incomplete staging produces no
import receipt. Only a complete, source-verified snapshot can atomically publish
all holds and an immutable `SiteImportReceipt`. Snapshot replacement requires a
new snapshotId and a verified newer frozen CAS version; old receipts remain
recoverable. The response distinguishes staged pages from the completed import.

Expiry alone never releases an imported hold. Verify `requestHash` against any
known creationRequestId, requestDigest against the original payload, and both
original/fallback identities against durable platform creation records. Deduplicate
only with verified matching organization and creation identity. Unknown records
remain uncertain and counted. `cleanupAllowed` is false until every imported
identity is reconciled and all old writers are fenced/drained; Portal must retain
legacy records until a matching receipt explicitly permits cleanup. Receipt
reads never expose the imported creation payloads to customer members.

The import and reservation bindings remain marked unavailable until the native admission,
source-version verification, importer and worker fences are implemented and
tested together. Publishing these shapes resolves the transport ambiguity; it
does not authorize Portal to install an epoch or discard existing holds today.

The Cedros platform is the single site-admission owner. The schemas specify reserve,
commit, reconcile and release. Reserve requires SiteManage and exact creation
request ID/digest/base subscription/migration epoch. The organization allowance,
complete eligibility count and live uncommitted holds are checked under one
transactional lock. For the existing `POST /portal/v1/sites`, the migrated handler resolves the hold
by the same organization and Idempotency-Key/creationRequestId and verifies the
request digest under the fence; no client-provided reservation proves admission.
Every customer-allocating creation entry point, including
direct/admin creation, must consume the same reservation or remain fenced.
Commit is trusted creation-worker-only and verifies durable site ownership and
creation request identity; customer-supplied site IDs are not proof. Reconcile
uses persisted creation/idempotency/job state. Release succeeds only with proof
that work was never dispatched or definitively failed without a site. Ambiguous
transport/timeouts remain uncertain and consume a hold; elapsed TTL alone is not
proof. `reconcileAfter` schedules investigation, not automatic release.

Migration phases: (1) persist a new organization migration epoch and fence both
legacy and new creation entry points; old workers check the fence before side
effects, and already-dispatched jobs are drained/reconciled; (2) import Portal's
CAS holds with their original request hashes and payload identity, including
uncertain entries, deduplicating against created Deploy/Fleet sites and platform's
idempotency records; (3) prove complete eligibility + holds and the effective
`cedros.portal.siteQuantity` agree, then atomically switch admission ownership;
(4) publish the epoch and unfreeze only updated clients/workers. Legacy clients
receive migration_fenced, never silently fall back. Crash recovery resumes the
same migration epoch. Do not delete legacy holds until a durable import receipt
and all in-flight identities are reconciled. Portal's current 30-minute expiry
and release-on-transport-error behavior is not sufficient for this transition.

`GuardPolicy.review` replaces the scalar site-wide winner with an immutable
`GuardReview`. It includes the entire organization/site scope, migration epoch,
versioned host route catalog, row snapshots, protection-policy revision and one
`LegacyGuardDecision` for each route/family/operation tuple. Include operations
with no legacy row (selectedRowId=null), not only currently metered routes. The
catalog is the actual host catalog including native adapter entry points; a
customer or UI cannot choose the subset. Reject missing/duplicate decisions,
duplicate rows/targets and catalog changes before cutover.

For every decision record the actual legacy selected row, all top-priority tied
candidate IDs (including the selected ID when tied), the complete enabled
applicable row IDs, and independent provider/safety protection IDs. No tie uses
an invented deterministic winner: record the observed legacy winner and tied set,
and bind all of them to review. Two operations at one site may have different
winners. Disabled rows remain in snapshots for change detection but cannot become
applicable guards. Operator request/rate/spend caps continue to count attempts;
commercial meters remain separate logical-work accounting.

Commercial admission requires trusted site attribution. The initial migration
therefore approves concrete site scopes only; a site-less legacy review may
document its existing selection behavior but cannot cut over or enable sales.
In particular, preserve the inspected SQL's site-less matching and lexical
NULLS LAST ordering when recording legacy evidence; do not silently replace it
with a new specificity rule. Site-less paths must be attributed or remain fenced
before the organization's commercial service can pass its creation/dispatch audit.

`GuardRowSnapshot` contains the existing limit row's scope, enabled state, four
numeric limit values and updatedAt, plus rowId and rowRevision. rowRevision is
the capacity-json-v1 digest of all the snapshot fields except rowRevision itself;
it is a new review fingerprint, not a claim that the old database has a revision
column. Do not include provider credentials or arbitrary operational metadata.
The complete row list comes from the authoritative relevant organization/site
policy inventory, including disabled entries, never a UI page. The existing
safety/protection resolver supplies the separately versioned per-operation
protection list; its digest is protectionPolicyRevision. The reference fixture
uses ordered `{target, guardIds}` records for that list. Omission of an independent
storage-abuse/provider restriction fails review even if all database rows match.

The guardSetDigest covers the **whole GuardReview** under capacity-json-v1,
including scope, epoch, route catalog/revision, complete row revisions/values,
protection revision and decisions. Catalog arrays, rows and decisions have a
persisted order; changing order also changes the digest, rather than silently
normalizing a reviewed document. routeCatalogRevision hashes that full ordered
catalog. Server validation recomputes row/candidate decisions and checks complete
coverage against the current host catalog and current policy rows.

`commercial-all-guards-v2` requires non-null approvedBy and approvedAt even when
salesEligible=false. Those fields are projections of a durable **server-owned**
operator approval receipt for that exact digest and migration epoch; a supplied
name/date is not authorization. Approval requires the established operator/admin
authority, not customer BillingManage. Under one transaction/fence, recheck
catalog, rows, protections, receipt, scope and epoch, then switch the whole scope
from `legacy-winner-v1` to `commercial-all-guards-v2`. A missing or changed guard,
new route, changed values/enabled state, stale epoch or partial review aborts the
cutover and requires a new complete review/approval.

Tenant resync cannot replace the approved policy version, migration epoch or
approval receipt, or turn operational rows into grants. Drift invalidates sales
eligibility and requires a new review while preserving the already-selected
migration model and safety enforcement; it must not silently revert to legacy
winner behavior. Unmigrated scopes remain sales-ineligible. Operator approval
alone never enables sales: enforcing runtime readiness, verified commercial
configuration and joint activation remain independent prerequisites.

## Errors, executable review and remaining activation work

The JSON `httpErrors` table and `Error.error.httpStatus` cover 401 missing buyer,
403 authority denial, 404 scope/resource privacy, 409 conflicts/expired quote or
cursor/revision fences, 422 malformed or unsupported inputs and 503 unavailable
sources. Safe messages never expose provider errors. Successful create acceptance
returns 201; exact replay/read returns 200; a durably queued hint/application
returns 202 with pending state. Never translate 202 to applied capacity.

Run the checked-in Python fixture runner alongside the schema examples. It tests
changed financial fields, independent-key uniqueness, expiry replay, delayed
payment, renewal failure, cancellation, partial refund/dispute revisions, URL
redaction, unknown/aging status, atomic split-page publication, scheduled grants,
annual/monthly allocation, admission-period settlement and revision-aware reads.
These are executable **contract reference checks**, not native enforcement tests.
They cannot establish concurrency, real payment, Dovecot readiness or host trust.

Implementation is authorized now. platform implements native persistence, trusted
adapters, the effective-cap resolver, atomic admission/settlement, reconciliation,
site/guard migrations, runtime quota application and customer-safe reads. Pay
implements the financial owner interfaces and durable lifecycle. Portal consumes
the standard and migrates site reservations. Providers Manager aligns catalog,
policy and migration UI; it does not create a competing enforcement service.

Commercial installation/environment/prices/quantities/terms are configured and
verified before sales. Native authorization, concurrency and replay tests plus
installed payment → grant → enforcing runtime → matching Usage tests remain
launch requirements. Missing implementations stay explicitly unavailable while
teams work against this fixed contract.

## Implementation directives for the teams

The Cedros platform is the integration owner and final protocol decision-maker. Pin this standard
and its companion schemas/fixtures; report implementation defects with an exact
operation/field and a failing case. Continue unaffected implementation while platform
resolves the issue. Do not request blanket contract acceptance or define competing
route, scope, unit, grant, or lifecycle semantics.

**Portal:** implement target discovery, Usage and Upgrade pages, exact quote and
purchase flow, member-safe recovery/status, BillingManage role mapping and
revision-aware refresh. Move site holds to platform's fenced reserve/commit/reconcile/
release boundary. Use capability detection and explicit unavailable states until
installed handlers are ready. Preserve unsubscribed/past-due recovery.

**Pay:** implement the published HTTP and internal service IDs, delegated buyer
adapter, immutable quote/authorization redemption, scoped durable idempotency,
recurring purchase/payment identities, billing actions/cancellation, grants and
restart-safe atomic snapshot reconciliation. Preserve base-plan isolation. Use
synthetic offers for integration tests; verify real installation and commercial
configuration before enabling live purchases.

**Providers Manager:** align wire units/catalog, complete per-operation guard
review/approval, and customer-safe recovery states with this standard. Treat
schedule storage and enforcing interval acknowledgement separately. Preserve
operator safety accounting and keep unmigrated/unready scopes sales-ineligible.
The Cedros platform owns transport, persistence and native mail/media/provider enforcement.

**platform:** implement the remaining backend now, without further protocol approval:
trusted host/owner adapters and durable authority records; shared grant/capacity
ledger with atomic admission and reconciliation; authoritative Usage, site quota
migration and signed runtime read/apply/ack. Coordinate installed integration
checks with the three teams using the exact standard fixtures and failure cases.
