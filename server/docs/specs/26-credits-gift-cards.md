# Cedros Pay Server - Credits & Gift Cards

Specification for the credits payment flow and gift card system, including public/admin endpoints,
data models, service behaviour, and storage API.

---

## Credits Payment Flow

Credits are an alternative payment method alongside x402 crypto and Stripe. The buyer's credits
balance is managed by `cedros-login`; `cedros-pay` orchestrates the hold/capture/release cycle.

All credits endpoints require a valid JWT `Authorization` header. Missing or invalid tokens return
`401 Unauthorized`.

---

### Public Endpoints

#### POST /paywall/v1/credits/hold

Creates a hold on the authenticated user's credits balance for the price of a single product
(after coupon discount). Calls `paywall_service.create_credits_hold_for_user()`.

Request:
```json
{
  "resource": "product-id",
  "couponCode": "SAVE10"
}
```

Response:
```json
{
  "holdId": "hold_abc123",
  "resource": "product-id",
  "amount": 1050,
  "currency": "usd",
  "expiresAt": "2026-03-17T12:00:00Z"
}
```

`couponCode` is optional. `resource` is validated via `validate_resource_id`.

---

#### POST /paywall/v1/cart/:cartId/credits/hold

Creates a hold on the authenticated user's credits balance for an entire cart total.
Calls `paywall_service.create_cart_credits_hold_for_user()`.

Request: empty body `{}`

Response:
```json
{
  "cartId": "cart_xyz",
  "holdId": "hold_def456",
  "amount": 5000,
  "currency": "usd",
  "expiresAt": "2026-03-17T12:15:00Z"
}
```

---

#### POST /paywall/v1/credits/hold/:holdId/release

Releases a previously created hold (e.g., buyer cancelled). Validates that the authenticated user
owns the hold before releasing.

Response:
```json
{
  "holdId": "hold_abc123",
  "status": "released"
}
```

Returns `403` if the hold belongs to a different user.

---

#### POST /paywall/v1/credits/authorize

Captures the held credits and completes a single-product purchase.
Calls `paywall_service.authorize_credits_for_user()`.

Request:
```json
{
  "resource": "product-id",
  "holdId": "hold_abc123",
  "couponCode": "SAVE10",
  "wallet": "base58encodedAddress"
}
```

`couponCode` is optional. `resource` validated via `validate_resource_id`. `couponCode` validated
via `validate_coupon_code` if provided.

---

#### POST /paywall/v1/cart/:cartId/credits/authorize

Captures held credits for a cart purchase.

Request:
```json
{
  "holdId": "hold_def456",
  "wallet": "base58encodedAddress"
}
```

---

#### GET /paywall/v1/credits/balance

Returns the authenticated user's credits balance from `cedros-login`.

Response:
```json
{
  "available": 5000,
  "held": 1050,
  "currency": "usd"
}
```

---

### Validation Summary

| Field        | Validator              | Required         |
|--------------|------------------------|------------------|
| `resource`   | `validate_resource_id` | Yes              |
| `couponCode` | `validate_coupon_code` | No               |
| `wallet`     | base58 format check    | Yes (authorize)  |
| JWT          | middleware             | All endpoints    |

---

## Gift Cards

### Data Models

#### GiftCard

Represents a reloadable or single-use gift card scoped to a tenant.

```
code:            String          — uppercase, primary key within tenant
tenant_id:       String
initial_balance: i64             — face value in atomic units (e.g. cents)
balance:         i64             — current remaining balance in atomic units
currency:        String          — ISO 4217 (e.g. "usd")
active:          bool
expires_at:      Option<DateTime>
metadata:        serde_json::Value
created_at:      DateTime
updated_at:      DateTime
```

`code` is normalised to uppercase on write and lookup.

#### GiftCardRedemption

Records a single redemption event, covering both immediate (recipient known) and
pending (recipient unknown at purchase time) flows.

```
id:                    String          — UUID
tenant_id:             String
order_id:              String
product_id:            String
buyer_user_id:         Option<String>
recipient_user_id:     Option<String>
face_value_cents:      i64
currency:              String
credits_issued:        i64
token_minted:          bool
token_mint_signature:  Option<String>
created_at:            DateTime
redemption_token:      Option<String>  — UUID, set when recipient is unknown at purchase time
claimed:               bool
recipient_email:       Option<String>
last_activity_at:      Option<DateTime>
```

---

### Admin Endpoints

All admin endpoints require admin authentication.

| Method | Path                                        | Description                              |
|--------|---------------------------------------------|------------------------------------------|
| GET    | /api/admin/gift-cards                       | List gift cards (filterable via query)   |
| GET    | /api/admin/gift-cards/:code                 | Get a single gift card by code           |
| POST   | /api/admin/gift-cards                       | Create a new gift card                   |
| PUT    | /api/admin/gift-cards/:code                 | Update a gift card                       |
| POST   | /api/admin/gift-cards/:code/adjust-balance  | Adjust balance by a signed amount        |
| GET    | /api/admin/gift-card-redemptions            | List all redemptions                     |

#### POST /api/admin/gift-cards — Create

Request:
```json
{
  "code": "SUMMER25",
  "initialBalance": 5000,
  "currency": "usd",
  "active": true,
  "expiresAt": "2026-12-31T23:59:59Z",
  "metadata": {}
}
```

`code` is optional; one is generated if omitted. `active` defaults to `true`.

#### POST /api/admin/gift-cards/:code/adjust-balance

Request:
```json
{
  "amount": -500,
  "reason": "customer service credit correction"
}
```

`amount` is signed: positive adds balance, negative deducts. `reason` is optional.

---

### Public Endpoints

#### GET /paywall/v1/gift-card/balance/:code

Public balance lookup. No authentication required. Code is normalised to uppercase.

Response:
```json
{
  "code": "SUMMER25",
  "balance": 5000,
  "currency": "usd",
  "active": true,
  "expiresAt": null
}
```

Returns `404` if the code does not exist or is inactive.

---

#### GET /paywall/v1/gift-card/claim/:token

Returns claim metadata for a pending gift card. No authentication required.

Response:
```json
{
  "faceValueCents": 2500,
  "currency": "usd",
  "claimed": false,
  "recipientEmail": "user@example.com"
}
```

Returns `404` if the token does not exist. `recipientEmail` may be `null`.

---

#### POST /paywall/v1/gift-card/claim/:token

Claims a pending gift card for the authenticated user (requires JWT). Deposits credits to the user
via `cedros-login`, then marks the redemption as claimed.

Response:
```json
{
  "success": true,
  "creditsAdded": 2500,
  "currency": "usd",
  "newBalance": 7500
}
```

Error cases:
- `400` — already claimed (happy-path race: see below).
- `401` — missing or invalid JWT.
- `404` — token not found.

**Race condition on double-claim:** if two concurrent requests attempt to claim the same token,
credits are deposited once, the second write returns `StorageError::Conflict`, the conflict is
logged (without PII), and the response returns `success: true`. Credits are not double-issued
because the deposit call is idempotent on the `redemption_token`.

---

### GiftCardFulfillmentService

Handles downstream actions after a gift card product is purchased.

#### fulfill_gift_card

```
fulfill_gift_card(
    tenant_id:          &str,
    order_id:           &str,
    product:            &Product,
    buyer_user_id:      Option<&str>,
    recipient_user_id:  Option<&str>,
    recipient_email:    Option<&str>,
) -> Result<GiftCardRedemption>
```

Process:

1. Deposit credits to recipient via `cedros_login.add_credits()`.
2. Optionally mint a Token-22 gift card token to the recipient's embedded wallet.
3. Record a `GiftCardRedemption` in the store with `claimed: true`.

#### record_pending_redemption

```
record_pending_redemption(
    tenant_id:      &str,
    order_id:       &str,
    product:        &Product,
    buyer_user_id:  Option<&str>,
    recipient_email: Option<&str>,
) -> Result<GiftCardRedemption>
```

Creates an unclaimed redemption with a generated `redemption_token` UUID when the recipient is
unknown at purchase time. The buyer (or a follow-up flow) shares the claim link; the recipient
calls `POST /paywall/v1/gift-card/claim/:token` to collect their credits.

---

### Storage API

All methods require `tenant_id`.

```
store.list_gift_cards(tenant_id, query)
store.get_gift_card(tenant_id, code)
store.create_gift_card(gift_card)
store.update_gift_card(gift_card)
store.adjust_gift_card_balance(tenant_id, code, amount)
store.create_gift_card_redemption(redemption)
store.get_gift_card_redemption_by_token(token)
store.claim_gift_card_redemption(id, user_id, amount) -> Result<_, StorageError::Conflict>
store.list_gift_card_redemptions(tenant_id, query)
```

`claim_gift_card_redemption` returns `StorageError::Conflict` on a duplicate claim attempt.
Callers must handle this case explicitly (see double-claim behaviour above).
