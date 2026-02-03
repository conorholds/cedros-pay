# Cedros Pay Server - Refund & Product Endpoints

Refund processing and product catalog endpoints.

**Note:** This is part 3 of HTTP endpoints. See [02-http-endpoints.md](./02-http-endpoints.md) for core endpoints and [03-http-endpoints-subscriptions.md](./03-http-endpoints-subscriptions.md) for subscription endpoints.

---

## Refund Processing (60s timeout)

### POST /paywall/v1/refunds/request

Request refund quote (idempotent).

```json
// Request
{
  "originalPurchaseId": "string", // Required: Original tx signature
  "recipientWallet": "string",    // Required: Wallet to receive refund
  "amount": 10.00,                // Required: Amount to refund
  "token": "USDC",                // Required: Token symbol
  "reason": "string",             // Optional: Reason for refund
  "metadata": {}                  // Optional
}

// Response
{
  "refundId": "refund_...",
  "status": "pending",
  "originalPurchaseId": "tx_signature...",
  "recipientWallet": "wallet_address...",
  "amount": 10.00,
  "token": "USDC",
  "reason": "Customer request",
  "createdAt": "2025-12-01T10:00:00Z",
  "message": "Refund request submitted successfully. An admin will review and process your request."
}
```

### POST /paywall/v1/refunds/approve

Approve refund (admin).

```json
// Request
{
  "refundId": "string",           // Required
  "nonce": "string",              // Required: From /nonce endpoint
  "signature": "string"           // Required: Ed25519 signature
}

// Response
{
  "refundId": "refund_...",
  "quote": {
    "scheme": "solana-spl-transfer",
    "network": "mainnet-beta",
    "maxAmountRequired": "10000000",   // Atomic units as string
    "resource": "refund_abc123...",    // Refund ID as resource
    "description": "Refund to wallet...",
    "payTo": "RecipientWalletTokenAccount...",  // Customer's ATA
    "asset": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    "maxTimeoutSeconds": 900,
    "extra": {
      "recipientTokenAccount": "...",
      "decimals": 6,
      "tokenSymbol": "USDC",
      "memo": "refund:refund_abc123",
      "feePayer": "ServerWallet..."    // Server wallet for gasless
    }
  },
  "expiresAt": "2025-12-01T12:15:00Z"
}
```

**Note:** The quote `payTo` is the CUSTOMER's token account (recipient of refund), not the server's.

### POST /paywall/v1/refunds/deny

Deny refund request.

```json
// Request
{
  "refundId": "string",           // Required
  "nonce": "string",              // Required
  "signature": "string",          // Required
  "reason": "string"              // Optional: Denial reason
}

// Response
{
  "success": true,
  "message": "refund denied"
}
```

### POST /paywall/v1/refunds/pending

List pending refunds.

```json
// Request
{
  "nonce": "string",              // Required: From /nonce endpoint
  "signature": "string"           // Required: Ed25519 signature
}

// Response
{
  "refunds": [
    {
      "id": "refund_...",
      "originalPurchaseId": "tx_sig",
      "recipientWallet": "...",
      "amount": 10.00,
      "token": "USDC",
      "reason": "Customer request",
      "status": "pending",
      "createdAt": "2025-12-01T10:00:00Z"
    }
  ]
}
```

### POST /paywall/v1/nonce

Generate admin nonce.

```json
// Request
{
  "purpose": "string"             // Optional: "refund_list" | "refund_approve" | "refund_deny"
}

// Response
{
  "nonce": "nonce_abc123...",
  "expiresAt": 1733049900,        // Unix timestamp (seconds)
  "purpose": "refund_list"        // Echoes the requested purpose
}
```

**Note:** `expiresAt` is returned as Unix timestamp (integer seconds), not ISO 8601 string.

**Nonce Purpose Enforcement:**

| Purpose | Valid Operations |
|---------|------------------|
| `refund_list` | POST /paywall/v1/refunds/pending |
| `refund_approve` | POST /paywall/v1/refunds/approve |
| `refund_deny` | POST /paywall/v1/refunds/deny |
| (empty) | Any operation (backwards compatibility) |

**Enforcement Rules:**
1. `ConsumeNonce` MUST validate purpose matches the operation
2. Mismatched purpose returns error (e.g., using `refund_list` nonce for approve)
3. Empty purpose acts as wildcard (less secure, for backwards compatibility)
4. Nonces are single-use: consumed immediately on successful validation
5. Nonce TTL: 5 minutes (hardcoded, not configurable)

**All Valid Nonce Purpose Values:**

| Purpose | Valid Operations | Description |
|---------|------------------|-------------|
| `""` (empty) | Any operation | Wildcard - backwards compatibility |
| `refund_list` | POST /paywall/v1/refunds/pending | List pending refunds |
| `refund_approve` | POST /paywall/v1/refunds/approve | Approve refund |
| `refund_deny` | POST /paywall/v1/refunds/deny | Deny refund |
| `webhook_retry` | POST /admin/webhooks/{id}/retry | Retry failed webhook |
| `webhook_delete` | DELETE /admin/webhooks/{id} | Delete webhook |

**Nonce Validation Error Codes:**
- `nonce_not_found`: Nonce ID doesn't exist
- `nonce_expired`: Nonce TTL exceeded
- `nonce_already_used`: Nonce already consumed
- `invalid_nonce_purpose`: Purpose doesn't match operation

### GET /paywall/v1/refunds/{refundId}

Verify refund execution via X-PAYMENT header (internal handler, called via /verify).

---

## Products & Coupons (60s timeout)

### GET /paywall/v1/products

List active products.

Query params:
- `collectionId` (optional): Filter products to a specific collection. If collection is missing or inactive, returns an empty list.

```json
// Response
{
  "products": [
    {
      "id": "product-id",
      "description": "Product description",
      "fiatAmount": 10.00,
      "effectiveFiatAmount": 9.00,      // After catalog coupon
      "fiatCurrency": "usd",
      "stripePriceId": "price_...",
      "cryptoAmount": 10.00,
      "effectiveCryptoAmount": 9.00,    // After catalog coupon
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
  "checkoutStripeCoupons": [
    {
      "code": "CHECKOUT5",
      "discountType": "percentage",
      "discountValue": 5.0,
      "currency": "",
      "description": "5% off at checkout"
    }
  ],
  "checkoutCryptoCoupons": [...]
}
```

### POST /paywall/v1/coupons/validate

Validate coupon code.

```json
// Request
{
  "code": "string",               // Required: Coupon code
  "productIds": ["string"],       // Optional: Products to check
  "paymentMethod": "string"       // Optional: "stripe" | "x402"
}

// Response
{
  "valid": true,
  "code": "SAVE10",
  "discountType": "percentage",   // "percentage" | "fixed"
  "discountValue": 10.0,
  "scope": "all",                 // "all" | "specific"
  "applicableProducts": [],       // For scope="specific"
  "paymentMethod": "",            // "stripe" | "x402" | ""
  "expiresAt": "2025-12-31T23:59:59Z",
  "remainingUses": 100,           // null if unlimited
  "error": ""                     // Error message if invalid
}
```
