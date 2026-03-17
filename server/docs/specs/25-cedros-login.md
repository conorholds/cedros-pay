# Cedros Pay Server - Cedros-Login Integration

Complete specification for the Cedros-Login external authentication service integration.

---

## Overview

Cedros-Login is an external authentication and identity service. The cedros-pay server integrates
with it for JWT validation, embedded wallet lookups, credits management, and compliance status
checks.

This integration is a prerequisite for:

- Credits payments
- Gift card fulfillment
- Asset tokenization
- Compliance gates (KYC, accredited investor)

---

## Configuration

### CedrosLoginConfig

| Field | Type | Source | Description |
|-------|------|--------|-------------|
| `enabled` | `bool` | `CEDROS_LOGIN_ENABLED` | Master feature flag |
| `credits_enabled` | `bool` | `CEDROS_CREDITS_ENABLED` | Enable credits balance/hold methods |
| `base_url` | `String` | `CEDROS_LOGIN_BASE_URL` | HTTPS required in production |
| `api_key` | `String` | `CEDROS_LOGIN_API_KEY` | Redacted in `Debug` output |
| `timeout` | `Duration` | `CEDROS_LOGIN_TIMEOUT` | Default: 30s |
| `jwt_issuer` | `Option<String>` | YAML only | Expected JWT issuer claim |
| `jwt_audience` | `Option<String>` | YAML only | Expected JWT audience claim |

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `CEDROS_LOGIN_ENABLED` | No | Enables the integration (default false) |
| `CEDROS_CREDITS_ENABLED` | No | Enables credits methods (default false) |
| `CEDROS_LOGIN_BASE_URL` | If enabled | Base URL of the Cedros-Login service |
| `CEDROS_LOGIN_API_KEY` | If enabled | API key for server-to-server calls |
| `CEDROS_LOGIN_TIMEOUT` | No | HTTP timeout (default 30s) |

### Config Keys (YAML only)

| Key | Type | Description |
|-----|------|-------------|
| `cedros_login.jwt_issuer` | `string` | Validated against `iss` claim |
| `cedros_login.jwt_audience` | `string` | Validated against `aud` claim |

### Validation Rules

- When `enabled = true`: `base_url` is required (non-empty)
- HTTPS is enforced for `base_url` in production mode
- `api_key` is redacted in `Debug` output (must never appear in logs)

---

## Client Structure

### CedrosLoginClient

| Field | Type | Description |
|-------|------|-------------|
| `client` | `reqwest::Client` | Underlying HTTP client |
| `base_url` | `String` | Base URL of the Cedros-Login service |
| `api_key` | `String` | Server-to-server API key (redacted in `Debug`) |
| `jwks_cache` | `Cache<JwkSet>` | JWKS cached with 5-minute TTL |
| `expected_issuer` | `Option<String>` | Expected value for `iss` JWT claim |
| `expected_audience` | `Option<String>` | Expected value for `aud` JWT claim |

### Wiring

The client is constructed in `app.rs` when both conditions are met:

```
cedros_login.enabled == true
cedros_login.base_url is non-empty
```

It is shared as `Arc<CedrosLoginClient>` and injected into:

- `PaywallService`
- `AssetFulfillmentService`
- `GiftCardFulfillmentService`
- `ComplianceChecker`

---

## JWT Validation

### Algorithm and Key Source

- Algorithm: RS256
- Public keys fetched from: `{base_url}/.well-known/jwks.json`
- JWKS response is cached for 5 minutes to reduce remote calls

### Methods

```
validate_jwt(token: &str) -> Result<CedrosLoginClaims, CedrosLoginError>
```

Validates signature, expiry, issuer (if configured), and audience (if configured).
Returns the decoded claims on success.

```
extract_user_id_from_auth_header(header: &str) -> Option<String>
```

Strips the `"Bearer "` prefix, calls `validate_jwt`, and returns `Some(sub)` on success
or `None` on any validation failure.

### CedrosLoginClaims

JWT payload fields decoded from a validated token:

| Field | Type | Description |
|-------|------|-------------|
| `sub` | `String` | User ID (subject) |
| `sid` | `String` | Session ID |
| `exp` | `i64` | Expiry (Unix timestamp) |
| `iat` | `i64` | Issued-at (Unix timestamp) |
| `iss` | `String` | Issuer |
| `aud` | `String` | Audience |
| `org_id` | `Option<String>` | Organisation ID |
| `role` | `Option<String>` | User role |
| `is_system_admin` | `Option<bool>` | System admin flag |

Example decoded payload:

```json
{
  "sub": "user_abc123",
  "sid": "sess_xyz789",
  "exp": 1710000000,
  "iat": 1709996400,
  "iss": "https://auth.cedros.io",
  "aud": "cedros-pay",
  "org_id": "org_def456",
  "role": "buyer",
  "is_system_admin": false
}
```

---

## Client Methods — User Lookup

All admin endpoints require the `api_key` sent as a bearer token or API key header.

| Method | HTTP | Path | Returns |
|--------|------|------|---------|
| `lookup_user_by_wallet(wallet)` | GET | `/admin/users/by-wallet/:wallet` | `Option<WalletLookupResponse>` |
| `lookup_user_by_stripe_customer(customer_id)` | GET | `/admin/users/by-stripe-customer/:id` | `Option<UserRecord>` |
| `lookup_user_by_email(email)` | GET | `/admin/users/by-email/:email` | `Option<UserRecord>` |
| `link_stripe_customer(user_id, customer_id)` | POST | `/admin/users/:id/link-stripe` | `Result<()>` |
| `get_embedded_wallet(user_id)` | GET | `/admin/users/:id/wallet` | `Option<WalletRecord>` |

### WalletLookupResponse

```json
{
  "user_id": "user_abc123",
  "wallet": "So1ana...",
  "linked_at": "2024-03-01T12:00:00Z"
}
```

---

## Client Methods — Credits

Credits methods are only active when `credits_enabled = true`.

| Method | HTTP | Path | Returns |
|--------|------|------|---------|
| `check_balance(user_id)` | GET | `/admin/users/:id/credits` | `CreditsBalance` |
| `create_hold(user_id, req)` | POST | `/credits/hold/:id` | `HoldResponse` |
| `capture_hold(user_id, hold_id, amount)` | POST | `/credits/capture/:id` | `Result<()>` |
| `release_hold(user_id, hold_id)` | POST | `/credits/release/:id` | `Result<()>` |
| `add_credits(user_id, amount_cents, currency, description)` | POST | `/admin/users/:id/credits/add` | `Result<()>` |

### CreditsBalance

```json
{
  "available": 5000,
  "held": 1000,
  "currency": "USD"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `available` | `i64` | Spendable balance in cents |
| `held` | `i64` | Amount locked by active holds |
| `currency` | `String` | ISO 4217 currency code |

### HoldResponse

```json
{
  "hold_id": "hold_xyz",
  "amount": 1000,
  "asset": "USD",
  "expires_at": "2024-03-01T12:05:00Z"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `hold_id` | `String` | Unique hold identifier |
| `amount` | `i64` | Amount held in cents |
| `asset` | `String` | Currency or asset identifier |
| `expires_at` | `DateTime<Utc>` | When the hold auto-expires |

### Hold Lifecycle

```
create_hold → HoldResponse.hold_id
    ↓
capture_hold(hold_id, amount)   — deduct from balance, fulfil order
    OR
release_hold(hold_id)           — return held funds to available
```

---

## Client Methods — Compliance

| Method | HTTP | Path | Returns |
|--------|------|------|---------|
| `get_user_compliance(user_id)` | GET | `/admin/users/:id/compliance` | `Option<UserComplianceStatus>` |

### UserComplianceStatus

```json
{
  "kyc_status": "Verified",
  "accredited_investor": true,
  "accredited_verified_at": "2024-01-15T09:30:00Z"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `kyc_status` | `KycStatus` | Current KYC state |
| `accredited_investor` | `bool` | Whether user is accredited |
| `accredited_verified_at` | `Option<DateTime<Utc>>` | When accreditation was verified |

### KycStatus

| Variant | Description |
|---------|-------------|
| `None` | No KYC submitted |
| `Pending` | KYC submitted, under review |
| `Verified` | KYC approved |
| `Expired` | Previously verified, now expired |

---

## Error Handling

### CedrosLoginError Variants

| Variant | Condition |
|---------|-----------|
| `Http` | Non-2xx response from Cedros-Login API |
| `JwtValidation` | Token signature, expiry, issuer, or audience invalid |
| `JwksFetch` | Failed to retrieve or parse JWKS from `/.well-known/jwks.json` |
| `KeyNotFound` | JWKS response did not contain the key matching the token's `kid` |
| `NotConfigured` | Method called when `enabled = false` or client not wired |
| `InsufficientCredits` | `check_balance` or `create_hold` indicates insufficient funds |
| `HoldNotFound` | `capture_hold` or `release_hold` references unknown `hold_id` |
| `HoldAlreadyProcessed` | Hold was already captured or released |

---

## Security

1. **API Key Redaction**
   - `api_key` implements a custom `Debug` that emits `"[REDACTED]"`
   - Never logged, never included in error messages

2. **HTTPS Enforcement**
   - `base_url` must use HTTPS in production mode
   - HTTP base URLs are rejected at startup

3. **JWT Validation Order**
   - Signature verified before any claim is trusted
   - Expiry checked after signature
   - Issuer and audience validated last (if configured)

4. **Fail Closed**
   - Any error in `extract_user_id_from_auth_header` returns `None`
   - Compliance and credits gates deny access on error, never grant

---

## Storage Methods

The Cedros-Login client does not directly persist to the cedros-pay database. Downstream services
that consume its responses are responsible for caching or recording data as needed. The JWKS cache
is in-process memory only (5-minute TTL, not persisted across restarts).

---

## Integration Points

| Consumer | Methods Used | Purpose |
|----------|-------------|---------|
| `PaywallService` | `extract_user_id_from_auth_header`, `check_balance`, `create_hold`, `capture_hold`, `release_hold` | Authenticate requests; gate and deduct credits |
| `AssetFulfillmentService` | `get_embedded_wallet`, `lookup_user_by_wallet` | Resolve destination wallet for tokenized assets |
| `GiftCardFulfillmentService` | `lookup_user_by_email`, `lookup_user_by_stripe_customer`, `link_stripe_customer` | Associate gift card purchases with user accounts |
| `ComplianceChecker` | `get_user_compliance` | Enforce KYC and accredited investor requirements |
