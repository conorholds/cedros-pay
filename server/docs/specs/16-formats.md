# Cedros Pay Server - ID Formats & JSON Conventions

Critical format specifications for reimplementation compatibility.

---

## ID Generation Formats

All IDs use cryptographically secure random generation via `crypto/rand`.

### ID Format Summary

| ID Type | Prefix | Method | Total Length | Example |
|---------|--------|--------|--------------|---------|
| Cart | `cart_` | 16 bytes → hex | 37 chars | `cart_a1b2c3d4e5f6...` |
| Refund | `refund_` | 16 bytes → hex | 39 chars | `refund_a1b2c3d4...` |
| Event | `evt_` | 12 bytes → hex | 28 chars | `evt_a1b2c3d4e5f6...` |
| Admin Nonce | (none) | 16 bytes → hex | 32 chars | `a1b2c3d4e5f67890...` |
| Subscription | (none) | UUID v4 | 36 chars | `550e8400-e29b-41d4-a716-446655440000` |
| Request | `req_` | 16 bytes → hex | 36 chars | `req_a1b2c3d4e5f6...` |
| Webhook | `webhook_` | UnixNano | ~26 chars | `webhook_1701432156789123456` |
| Memo Nonce | (none) | 6 bytes → base64url | 8 chars | `aBc1DeFg` |

**Collision Guarantees:**
- Cart/Refund IDs: 16 random bytes = 2^128 possible values (negligible collision risk)
- Event IDs: 12 random bytes = 2^96 possible values (negligible collision risk)
- If collision occurs: Database UNIQUE constraint prevents duplicate
- UUIDs: Standard UUID v4 collision probability

**ID Validation:**
- Cart IDs: Must start with `cart_`, followed by 32 hex chars
- Refund IDs: Must start with `refund_`, followed by 32 hex chars
- Solana signatures: 88 base58 characters
- Stripe IDs: Validated by Stripe API (prefixes like `cs_`, `cus_`, `sub_`)

### Generation Functions

```
GenerateCartID()    → "cart_" + hex(16 random bytes)
GenerateRefundID()  → "refund_" + hex(16 random bytes)
generateEventID()   → "evt_" + hex(12 random bytes)
GenerateNonceID()   → hex(16 random bytes)
generateNonce()     → base64url(6 random bytes)  // For memo
generateRequestID() → "req_" + hex(16 random bytes)
generateWebhookID() → "webhook_" + UnixNano timestamp
```

### Fallback Behavior

If `crypto/rand.Read()` fails:
- Event ID: `evt_` + UnixNano timestamp
- Request ID: `req_fallback`
- Memo Nonce: `nonce`

### Stripe-Managed IDs (Not Generated)

These IDs come from Stripe and are stored/referenced but not generated:
- Session: `cs_...` or `sess_...`
- Customer: `cus_...`
- Subscription: `sub_...`
- Price: `price_...`

---

## JSON Field Naming Conventions

**All JSON fields use camelCase.** This is critical for UI compatibility.

### Common Field Mappings

| Go Field | JSON Field | Notes |
|----------|------------|-------|
| `ResourceID` | `resource` or `resourceId` | Context-dependent |
| `CustomerEmail` | `customerEmail` | |
| `SuccessURL` | `successUrl` | |
| `CancelURL` | `cancelUrl` | |
| `StripePriceID` | `stripePriceId` | |
| `CouponCode` | `couponCode` | |
| `SubscriptionID` | `subscriptionId` | |
| `ProductID` | `productId` | |
| `CurrentPeriodEnd` | `currentPeriodEnd` | ISO 8601 format |
| `CreatedAt` | `createdAt` | ISO 8601 format |
| `ExpiresAt` | `expiresAt` | ISO 8601 format |

### Request/Response Struct Tags

#### Quote Request
```json
{
  "resource": "string",      // Required
  "couponCode": "string"     // Optional (omitempty)
}
```

#### Stripe Session Response
```json
{
  "sessionId": "cs_...",
  "url": "https://checkout.stripe.com/..."
}
```

#### Cart Checkout Request
```json
{
  "items": [
    {
      "priceId": "price_...",    // Required (or resource)
      "resource": "product-id",   // Optional (fallback)
      "quantity": 1,              // Required, > 0
      "description": "string",    // Optional
      "metadata": {}              // Optional
    }
  ],
  "customerEmail": "string",     // Optional
  "metadata": {},                // Optional
  "successUrl": "string",        // Optional
  "cancelUrl": "string",         // Optional
  "couponCode": "string"         // Optional
}
```

#### Subscription Status Response
```json
{
  "active": true,
  "status": "active",            // active|trialing|past_due|cancelled|expired
  "expiresAt": "2025-12-31T23:59:59Z",
  "currentPeriodEnd": "2025-12-31T23:59:59Z",
  "interval": "monthly",
  "cancelAtPeriodEnd": false
}
```

#### Product List Response
```json
{
  "products": [
    {
      "id": "product-id",
      "description": "string",
      "fiatAmount": 10.00,
      "effectiveFiatAmount": 9.00,
      "fiatCurrency": "usd",
      "stripePriceId": "price_...",
      "cryptoAmount": 10.00,
      "effectiveCryptoAmount": 9.00,
      "cryptoToken": "USDC",
      "hasStripeCoupon": true,
      "hasCryptoCoupon": true,
      "stripeCouponCode": "SAVE10",
      "cryptoCouponCode": "CRYPTO10",
      "stripeDiscountPercent": 10.0,
      "cryptoDiscountPercent": 10.0,
      "metadata": {}
    }
  ],
  "checkoutStripeCoupons": [...],
  "checkoutCryptoCoupons": [...]
}
```

---

## X-PAYMENT Header Format

Base64-encoded JSON in the `X-PAYMENT` request header:

```json
{
  "x402Version": 0,
  "scheme": "solana-spl-transfer",
  "network": "mainnet-beta",
  "payload": {
    "signature": "tx_signature_base58",
    "transaction": "base64_serialized_tx",
    "resource": "product-id",
    "resourceType": "regular",       // regular|cart|refund
    "feePayer": "server_wallet",     // Optional for gasless
    "memo": "optional_memo",
    "recipientTokenAccount": "...",
    "metadata": {}
  }
}
```

---

## X-PAYMENT-RESPONSE Header Format

Settlement response in `X-PAYMENT-RESPONSE` header:

```json
{
  "success": true,
  "txHash": "transaction_signature",
  "networkId": "mainnet-beta",
  "error": null
}
```

On failure:
```json
{
  "success": false,
  "txHash": null,
  "networkId": null,
  "error": "error message"
}
```

---

## Date/Time Formats

All timestamps use **ISO 8601** format with timezone:
- `2025-12-01T10:00:00Z` (UTC)
- `2025-12-01T10:00:00-05:00` (with offset)

Go marshals `time.Time` to RFC 3339 by default, which is ISO 8601 compatible.

---

## Amount Formats

### Atomic Units (Internal)

All amounts stored as `int64` atomic units:

| Asset | Decimals | Example |
|-------|----------|---------|
| USD | 2 | $10.50 = 1050 |
| USDC | 6 | 1.5 USDC = 1500000 |
| SOL | 9 | 0.5 SOL = 500000000 |

### Display Units (API Boundaries)

Use `float64` only at API request/response boundaries:
- `"amount": 10.50` (JSON)
- `"cryptoAmount": 1.5` (JSON)

### Amount Conversion Algorithms

**Float to Atomic (FromMajor):**
```
func FromMajor(amount float64, decimals uint8) int64 {
    multiplier = 10 ^ decimals
    result = amount * multiplier
    return RoundCeiling(result)  // Always round UP
}
```

**Atomic to Float (ToMajor):**
```
func ToMajor(atomic int64, decimals uint8) float64 {
    divisor = 10 ^ decimals
    return float64(atomic) / float64(divisor)
}
```

**Conversion Examples:**

| Asset | Decimals | Float Input | Atomic Output | Notes |
|-------|----------|-------------|---------------|-------|
| USD | 2 | 10.50 | 1050 | Exact |
| USD | 2 | 10.505 | 1051 | Rounds UP to 10.51 |
| USD | 2 | 10.501 | 1051 | Rounds UP |
| USDC | 6 | 1.5 | 1500000 | Exact |
| USDC | 6 | 1.500001 | 1500001 | Exact |
| USDC | 6 | 1.5000005 | 1500001 | Rounds UP |
| SOL | 9 | 0.5 | 500000000 | Exact |

**Critical Rules:**
1. Always use ceiling rounding for float→atomic (prevents underpayment)
2. Never use floor or half-up rounding for payments
3. Use int64 arithmetic internally, never float64
4. Only convert to float64 at API boundaries

### String Amounts (x402 Protocol)

The x402 protocol uses string representation:
- `"maxAmountRequired": "1000000"` (atomic units as string)

---

## Memo Template Interpolation

Memo templates support variable interpolation:

| Variable | Description | Format |
|----------|-------------|--------|
| `{nonce}` | Random identifier | 8-char base64url string |
| `{resource}` | Resource/product ID | As-is (no escaping) |
| `{wallet}` | User wallet address | Full base58 address |
| `{amount}` | Payment amount | Display units (e.g., "1.5") |

Example template: `cedros:{resource}:{nonce}`
Result: `cedros:product-123:aBc1DeFg`

### Interpolation Rules

1. **Unknown variables:** Leave as literal text (don't replace `{unknown}`)
2. **Missing variables:** Leave placeholder as-is
3. **Max length:** 566 bytes (Solana memo limit)
4. **Overflow handling:** If result > 566 bytes, truncate from end
5. **Encoding:** UTF-8 only
6. **Special characters:** No escaping needed (curly braces in resource ID are rare)
7. **Empty template:** Use default `"Payment for {resource}"`

