# Cedros Pay Server - Compliance (Sanctions, KYC, Token Gates)

Specification for compliance gates enforcing regulatory requirements before minting tokens or
allowing purchases. Three enforcement layers: sanctions screening, KYC/accredited investor
verification (via cedros-login), and on-chain token gate checks.

---

## Overview

Compliance gates run before any purchase or mint operation. Each layer is independently
configurable per product via `ComplianceRequirements`. A request is blocked if any enabled layer
returns a violation; all failure reasons are collected and returned together.

Layers in evaluation order:

1. **Sanctions screening** — checks wallet against static OFAC SDN list and a dynamic API-fetched list
2. **Token gates** — checks on-chain SPL Token / Token-2022 balances against configured minimums
3. **KYC / accredited investor** — checks user compliance status via `cedros-login`

---

## Data Models

### ComplianceRequirements

Per-product compliance configuration. Multiple products' requirements are merged before evaluation
(see `merge_requirements`).

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `require_sanctions_clear` | `bool` | `true` | Block sanctioned wallets |
| `require_kyc` | `bool` | — | Require `KycStatus::Verified` |
| `require_accredited_investor` | `bool` | — | Require accredited investor status |
| `token_gates` | `Option<Vec<TokenGate>>` | — | On-chain token holdings requirements |

---

### TokenGate

Defines a required on-chain token holding for access.

| Field | Type | Description |
|-------|------|-------------|
| `address` | `String` | Mint address (fungible) or collection address (NFT) |
| `gate_type` | `TokenGateType` | `FungibleToken` or `NftCollection` |
| `min_amount` | `u64` | Minimum balance required (atomic units) |

---

### TokenHolder

Records a minted token holder for compliance tracking and freeze/thaw operations.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `String` | Unique record ID |
| `tenant_id` | `String` | Owning tenant |
| `collection_id` | `String` | Product/collection identifier |
| `mint_address` | `String` | Token mint address |
| `wallet_address` | `String` | Holder's wallet address |
| `user_id` | `String` | Associated user ID |
| `amount_minted` | `i64` | Token quantity minted |
| `status` | `String` | `active`, `frozen`, or `thawed` |
| `frozen_at` | `Option<DateTime>` | When the account was frozen |
| `freeze_tx` | `Option<String>` | Transaction signature for freeze |
| `thaw_tx` | `Option<String>` | Transaction signature for thaw |
| `created_at` | `DateTime` | Record creation timestamp |

---

### ComplianceAction

Audit log entry for every compliance enforcement action.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `String` | Unique action ID |
| `tenant_id` | `String` | Owning tenant |
| `action_type` | `ComplianceActionType` | See variants below |
| `wallet_address` | `String` | Affected wallet |
| `mint_address` | `Option<String>` | Affected mint (if applicable) |
| `holder_id` | `Option<String>` | Associated `TokenHolder` ID |
| `reason` | `String` | Human-readable justification |
| `actor` | `String` | Who triggered the action (`system` or admin user ID) |
| `tx_signature` | `Option<String>` | On-chain transaction signature |
| `report_reference` | `Option<String>` | External report reference |
| `created_at` | `DateTime` | Timestamp |

#### ComplianceActionType Variants

| Variant | Description |
|---------|-------------|
| `freeze` | Manual freeze by admin |
| `thaw` | Manual thaw by admin |
| `sweep_freeze` | Automated freeze from sanctions sweep worker |
| `mint_blocked` | Mint or purchase blocked by compliance check |
| `report_generated` | Compliance report exported |

---

### SanctionsApiSettings

Stored in `app_config` (`category = "compliance"`, `key = "sanctions_api"`).

| Field | Type | Description |
|-------|------|-------------|
| `api_url` | `String` | External sanctions list API endpoint |
| `refresh_interval_secs` | `u64` | How often to re-fetch (seconds) |
| `enabled` | `bool` | Whether dynamic list fetching is active |

---

### SanctionsSweepSettings

Stored in `app_config` (`category = "compliance"`, `key = "sanctions_sweep"`).

| Field | Type | Description |
|-------|------|-------------|
| `enabled` | `bool` | Whether the sweep worker is active |
| `batch_size` | `i32` | Holders processed per sweep batch |

---

## ComplianceChecker Service

Central service that orchestrates all three compliance layers.

### check_compliance

```
check_compliance(
    tenant_id:    &str,
    wallet:       &str,
    user_id:      Option<&str>,
    requirements: &ComplianceRequirements,
) -> ComplianceResult
```

Evaluation steps:

1. **Sanctions** (when `require_sanctions_clear = true`)
   - Calls `SanctionsListService::is_sanctioned(tenant_id, wallet)`
   - Checks both the static embedded list and the dynamic API-fetched list
   - Failure reason: `"sanctions_match"`

2. **Token gates** (when `token_gates` is non-empty)
   - Calls `TokenGateChecker::check_gates(wallet, gates)`
   - Checks SPL Token and Token-2022 programs for sufficient balances
   - Failure reason per gate: `"token_gate_failed: <address>"`

3. **KYC and accredited investor** (when either flag is set)
   - Calls `CedrosLoginClient::get_user_compliance(user_id)`
   - Result is cached 5 minutes / 1000 entries (LRU)
   - KYC failure reason: `"kyc_required"`
   - Accredited investor failure reason: `"accredited_investor_required"`

Returns:

```
ComplianceResult::Cleared
ComplianceResult::Blocked { reasons: Vec<String> }
```

All failing reasons are collected before returning; evaluation does not short-circuit.

---

### merge_requirements

```
merge_requirements(products: &[Product]) -> ComplianceRequirements
```

OR-combines boolean flags across all products:

- `require_sanctions_clear` — `true` if any product requires it (default `true`)
- `require_kyc` — `true` if any product requires it
- `require_accredited_investor` — `true` if any product requires it

Token gates are deduplicated by `(address, gate_type)`, keeping `max(min_amount)` across
products that share the same gate.

---

## Sanctions

### Static List (`services/sanctions.rs`)

Checks against an embedded OFAC SDN list compiled into the binary.

| Method | Returns | Description |
|--------|---------|-------------|
| `is_sanctioned(wallet) -> bool` | `bool` | Match against embedded SDN addresses |
| `is_allowed_for_asset(wallet, allowed) -> bool` | `bool` | Country/jurisdiction check |

---

### Dynamic List (`services/sanctions_list.rs`)

Fetches and caches a tenant-specific sanctions list from an external API.

#### SanctionsListService

| Field | Description |
|-------|-------------|
| `capacity` | LRU cache capacity (entries) |
| `ttl` | Cache entry lifetime |

Constructor: `SanctionsListService::new(capacity, ttl)`

#### External API Contract

```
GET {api_url}

Response:
{
  "addresses": ["<base58>", ...],
  "countries":  ["<ISO-2>", ...]
}
```

#### Methods

```
is_sanctioned(tenant_id: &str, wallet: &str) -> bool
```

Checks the dynamic list first; falls back to the static list. Returns `true` if either list
matches. Returns `false` (fail open) if the external API is unreachable — the static list
always applies regardless.

---

## Token Gate Checker (`services/token_gate.rs`)

```
check_gates(wallet: &str, gates: &[TokenGate]) -> Vec<String>
```

Returns a list of failure reason strings (empty = all gates passed).

For each gate:

1. Derives the Associated Token Account (ATA) for both SPL Token and Token-2022 programs.
2. Fetches on-chain account data for each ATA.
3. Parses token balance from account data.
4. Fails the gate if balance < `min_amount` on both programs.

A gate passes if either the SPL Token or Token-2022 ATA meets the minimum balance.

---

## Public Endpoints

### POST /paywall/v1/compliance-check

Evaluates compliance for one or more products against the caller's wallet.

**Authentication:** Bearer JWT required. `user_id` is extracted from the token's `sub` claim.

Request:
```json
{
  "resources": ["product-1", "product-2"],
  "wallet": "base58encodedAddress"
}
```

Response (cleared):
```json
{
  "cleared": true
}
```

Response (blocked):
```json
{
  "cleared": false,
  "reasons": ["sanctions_match", "kyc_required"]
}
```

Behaviour:

- Always returns HTTP 200 regardless of compliance outcome.
- Merges `ComplianceRequirements` from all listed products via `merge_requirements`.
- Returns all failure reasons; does not short-circuit on first failure.

---

## Admin Endpoints

All admin endpoints require admin authentication.

### Holder Management

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/compliance/holders` | List token holders |
| GET | `/admin/compliance/actions` | List compliance actions |
| POST | `/admin/compliance/freeze` | Freeze a token holder |
| POST | `/admin/compliance/thaw` | Thaw a token holder |
| GET | `/admin/compliance/report` | Generate compliance report |

#### GET /admin/compliance/holders

Query parameters:

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | `String` | Filter by `active`, `frozen`, or `thawed` |
| `wallet` | `String` | Filter by wallet address |
| `collection_id` | `String` | Filter by collection |
| `limit` | `i64` | Page size |
| `offset` | `i64` | Page offset |

#### GET /admin/compliance/actions

Query parameters:

| Parameter | Type | Description |
|-----------|------|-------------|
| `action_type` | `String` | Filter by `ComplianceActionType` |
| `wallet` | `String` | Filter by wallet address |
| `from` | `DateTime` | Start of time range |
| `to` | `DateTime` | End of time range |
| `limit` | `i64` | Page size |
| `offset` | `i64` | Page offset |

#### POST /admin/compliance/freeze

Freezes a token holder's Token-22 account and records a `ComplianceAction`.

Request:
```json
{
  "holderId": "holder_abc123",
  "reason": "sanctions match — manual review"
}
```

Steps:
1. Loads `TokenHolder` by `holderId`.
2. Calls `token22::freeze_account(mint_address, wallet_address)`.
3. Updates holder `status` to `frozen`, sets `frozen_at` and `freeze_tx`.
4. Records a `freeze` `ComplianceAction`.

#### POST /admin/compliance/thaw

Thaws a frozen token holder's Token-22 account and records a `ComplianceAction`.

Request:
```json
{
  "holderId": "holder_abc123",
  "reason": "sanctions review cleared"
}
```

Steps mirror freeze: calls `token22::thaw_account`, updates status to `thawed`, records `thaw`
action.

#### GET /admin/compliance/report

Generates a compliance report for a given time range.

Query parameters: `from` (DateTime), `to` (DateTime).

Returns all `ComplianceAction` records within the range plus aggregate counts by `action_type`.
Records a `report_generated` `ComplianceAction` as an audit trail entry.

---

### Sanctions API Policy

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/compliance/sanctions-api` | Retrieve current `SanctionsApiSettings` |
| PUT | `/admin/compliance/sanctions-api` | Update `SanctionsApiSettings` |
| POST | `/admin/compliance/sanctions-api/refresh` | Force immediate refresh from external API |

PUT request body mirrors `SanctionsApiSettings` fields. Force refresh triggers an immediate
fetch regardless of `refresh_interval_secs`.

---

### Sweep Settings

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/compliance/sweep-settings` | Retrieve current `SanctionsSweepSettings` |
| PUT | `/admin/compliance/sweep-settings` | Update `SanctionsSweepSettings` |

---

## Background Workers

### Sanctions Refresh Worker (`workers/sanctions_refresh.rs`)

Periodically fetches the dynamic sanctions list from the configured external API.

- Interval controlled by `SanctionsApiSettings::refresh_interval_secs`.
- Only runs when `SanctionsApiSettings::enabled = true`.
- On successful fetch, updates the in-memory `SanctionsListService` cache.
- Fetch errors are logged with context; the stale cached list remains active.

---

### Sanctions Sweep Worker (`workers/sanctions_sweep.rs`)

Periodically sweeps all active token holders against the current sanctions list and
auto-freezes any matches.

- Only runs when `SanctionsSweepSettings::enabled = true`.
- Processes holders in batches of `SanctionsSweepSettings::batch_size`.

Per batch:
1. Loads a page of `active` `TokenHolder` records.
2. Calls `SanctionsListService::is_sanctioned(tenant_id, wallet_address)` for each.
3. For each match:
   a. Calls `token22::freeze_account(mint_address, wallet_address)`.
   b. Updates holder `status` to `frozen`, sets `frozen_at` and `freeze_tx`.
   c. Records a `sweep_freeze` `ComplianceAction` with `actor = "system"`.

---

## Integration Points

| Consumer | Gate Checked | Purpose |
|----------|-------------|---------|
| `PaywallService` | All layers | Checked before x402 and credits payments when `compliance_checker` is wired |
| `AssetFulfillmentService` | All layers | Checked before minting fungible tokens and NFTs |
| `SubscriptionService` | All layers | Checked before subscription renewals |

---

## Storage Methods

All methods are scoped to `tenant_id`.

```
store.list_token_holders(tenant_id, query)         — list with optional filters
store.get_token_holder(tenant_id, id)              — fetch single holder
store.record_token_holder(holder)                  — insert new holder record
store.update_token_holder_status(id, status, ...)  — update status, freeze/thaw metadata
store.count_token_holders(tenant_id, query)        — count for pagination

store.list_compliance_actions(tenant_id, query)    — list actions with optional filters
store.record_compliance_action(action)             — insert new audit action

config_repo.get(category="compliance", key="sanctions_api")   -> SanctionsApiSettings
config_repo.set(category="compliance", key="sanctions_api")
config_repo.get(category="compliance", key="sanctions_sweep") -> SanctionsSweepSettings
config_repo.set(category="compliance", key="sanctions_sweep")
```
