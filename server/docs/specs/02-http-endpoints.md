# Cedros Pay Server - HTTP Endpoints

33 HTTP endpoints with exact request/response JSON formats for UI compatibility.

---

## Route Configuration

- [ ] Support configurable route prefix (e.g., `/api`, `/cedros`) via `Server.RoutePrefix`
- [ ] All paywall routes under `{prefix}/paywall/v1/`
- [ ] Stripe webhook routes intentionally bypass prefix for URL stability
- [ ] Route prefix is normalized: must start with `/` and not end with `/`

---

## Endpoint Summary (33 Registered)

| Category | Count | Timeout | Notes |
|----------|-------|---------|-------|
| Health & Discovery | 6 | 5s | Includes metrics |
| Stripe Webhooks | 4 | 60s | No prefix (URL stability) |
| Single-Item Payments | 5 | 60s | Quote, verify, checkout |
| Multi-Item Cart | 2 | 60s | Idempotent |
| Gasless | 1 | 60s | Server-paid fees |
| Refund Management | 4 | 60s | Admin auth required |
| Admin Utilities | 1 | 60s | Nonce generation |
| Products & Catalog | 2 | 60s | Product list, coupon validation |
| Subscriptions | 8 | 60s | Stripe + x402 subscriptions |
| **Optional Admin** | 4 | - | Not registered by default |
| **Internal Handlers** | 2 | - | Called via /verify route |

---

## Health & Discovery (5s timeout)

### GET /cedros-health

Health check with component status.

```json
// Response
{
  "status": "ok",                 // "ok" | "degraded" | "error"
  "uptime": "12h30m45s",          // Go duration string
  "timestamp": "2025-12-01T10:00:00Z",
  "rpcHealthy": true,
  "routePrefix": "/api",          // Configured route prefix
  "network": "mainnet-beta",
  "features": [                   // Array of OPTIONAL enabled features
    "gasless",                    // Only if gasless is enabled
    "auto-create-token-accounts", // Only if enabled
    "balance-monitoring"          // Only if monitoring configured
  ],
  "walletHealth": {
    "summary": {
      "healthy": 1,
      "unhealthy": 0,
      "critical": 0
    },
    "wallets": [
      {
        "publicKey": "Gm1234...", // Truncated for privacy (first 6 chars + "...")
        "balance": "0.500000",    // SOL balance as string
        "status": "healthy",      // "healthy" | "low" | "critical"
        "lastChecked": "2025-12-01T10:00:00Z"
      }
    ]
  }
}
```

**Features Array:**
- Does NOT include "stripe" or "x402" (these are always implicitly available)
- Only shows optional features that deviate from defaults
- Empty array if only defaults enabled

**Wallet Address Truncation:**
- Public keys are truncated to first 6 characters + "..." for privacy
- Full addresses never exposed in health check

### GET /.well-known/payment-options

Payment method discovery.

```json
{
  "version": "1.0",
  "server": "cedros-pay",
  "resources": [
    {
      "id": "product-id",
      "name": "Product Name",
      "description": "Description",
      "endpoint": "/paywall/product-id",
      "price": {
        "fiat": {"amount": 10.00, "currency": "USD"},
        "crypto": {"amount": 10.00, "token": "USDC"}
      },
      "metadata": {}
    }
  ],
  "payment": {
    "methods": ["stripe", "x402-solana-spl-transfer"],
    "x402": {
      "network": "mainnet-beta",
      "paymentAddress": "...",
      "tokenMint": "..."
    }
  }
}
```

### GET /.well-known/agent.json

Agent protocol card (A2A).

```json
{
  "name": "Cedros Pay",
  "version": "1.0",
  "description": "Unified payment gateway...",
  "service_endpoint": "https://api.example.com",
  "capabilities": [
    "payment-processing",
    "x402-payment",
    "stripe-checkout",
    "product-catalog",
    "webhook-notifications",
    "coupon-support"
  ],
  "authentication": {
    "type": "hybrid",
    "schemes": ["x402", "stripe-session", "none"]
  },
  "payment_methods": [
    {
      "type": "cryptocurrency",
      "protocol": "x402-solana-spl-transfer",
      "network": "mainnet-beta",
      "description": "Instant USDC payments on Solana"
    },
    {
      "type": "fiat",
      "protocol": "stripe",
      "description": "Credit/debit card payments"
    }
  ],
  "metadata": {
    "project_url": "https://github.com/CedrosPay/server",
    "documentation": "https://...",
    "discovery_rfc8615": "/.well-known/payment-options",
    "discovery_mcp": "POST /resources/list",
    "openapi_spec": "/openapi.json"
  }
}
```

### GET /openapi.json

OpenAPI specification (auto-generated).

### POST /resources/list

MCP resources list (JSON-RPC 2.0).

```json
// Request
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "resources/list",
  "params": {}
}

// Response
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "resources": [
      {
        "uri": "cedros-pay://paywall/product-id",
        "name": "Product Name",
        "description": "Description",
        "mimeType": "application/json"
      }
    ]
  }
}

// Error Response
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32601,
    "message": "Method not found",
    "data": null
  }
}
```

### GET /metrics

Prometheus metrics (optional auth via admin API key).

---

## Paywall Quote & Verification (60s timeout)

### POST /paywall/v1/quote

Single resource pricing quote.

```json
// Request
{
  "resource": "string",           // Required: Product ID
  "couponCode": "string"          // Optional: Discount code
}

// Response (HTTP 402)
{
  "x402Version": 0,
  "accepts": [{
    "scheme": "solana-spl-transfer",
    "network": "mainnet-beta",
    "maxAmountRequired": "1000000",  // Atomic units as string
    "resource": "product-id",
    "description": "Product description",
    "mimeType": "application/json",
    "payTo": "TokenAccountAddress",
    "maxTimeoutSeconds": 300,
    "asset": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    "extra": {
      "recipientTokenAccount": "...",
      "decimals": 6,
      "tokenSymbol": "USDC",
      "memo": "...",
      "feePayer": "..."  // Optional: For gasless support
    }
  }]
}
```

### POST /paywall/v1/verify

Verify x402 payment proof.

```json
// Request: X-PAYMENT header (base64-encoded)
{
  "x402Version": 0,
  "scheme": "solana-spl-transfer",
  "network": "mainnet-beta",
  "payload": {
    "signature": "tx_signature",
    "transaction": "base64_serialized_tx",
    "resource": "product-id",           // Resource being purchased
    "resourceType": "regular",          // "regular" | "cart" | "refund"
    "feePayer": "server_wallet",        // Optional: For gasless
    "memo": "optional_memo",
    "recipientTokenAccount": "...",
    "metadata": {}
  }
}

// Response (HTTP 200) - X-PAYMENT-RESPONSE header
{
  "success": true,
  "txHash": "...",
  "networkId": "mainnet-beta",
  "error": null
}
```

### POST /paywall/v1/cart/quote

Multi-item cart quote (idempotent).

```json
// Request
{
  "items": [
    {
      "resource": "string",       // Required: Product ID
      "quantity": 1,              // Required: Must be > 0
      "metadata": {}              // Optional: Per-item metadata
    }
  ],
  "metadata": {},                 // Optional: Cart-level metadata
  "couponCode": "string"          // Optional: Discount code
}

// Response
{
  "cartId": "cart_abc123...",
  "quote": {
    "scheme": "solana-spl-transfer",
    "network": "mainnet-beta",
    "maxAmountRequired": "3000000",
    "resource": "cart:cart_abc123...",
    "description": "Cart purchase (3.00 USDC)",
    "payTo": "...",
    "maxTimeoutSeconds": 900,
    "asset": "...",
    "extra": {...}
  },
  "items": [
    {
      "resource": "product-id",
      "quantity": 2,
      "priceAmount": 1.50,        // Per-unit after discounts
      "originalPrice": 2.00,      // Per-unit before discounts
      "token": "USDC",
      "description": "Product name",
      "appliedCoupons": ["DISCOUNT10"]
    }
  ],
  "totalAmount": 3.00,
  "metadata": {
    "coupon_codes": "DISCOUNT10",
    "catalog_coupons": "DISCOUNT10"
  },
  "expiresAt": "2025-12-01T12:15:00Z"
}
```

### POST /paywall/v1/cart/checkout

Stripe cart checkout (idempotent).

```json
// Request
{
  "items": [
    {
      "priceId": "price_...",     // Stripe price ID (preferred)
      "resource": "product-id",   // OR product ID (fallback)
      "quantity": 1,
      "description": "string",    // Optional
      "metadata": {}              // Optional
    }
  ],
  "customerEmail": "string",      // Optional
  "metadata": {},                 // Optional
  "successUrl": "string",         // Optional
  "cancelUrl": "string",          // Optional
  "couponCode": "string"          // Optional
}

// Response
{
  "sessionId": "cs_...",
  "url": "https://checkout.stripe.com/...",
  "totalItems": 3
}
```

**Stripe Cart Coupon Handling:**

| Scenario | Behavior |
|----------|----------|
| Coupon applies to ALL items | Apply discount at Stripe checkout level |
| Coupon applies to SOME items | Return error: `coupon_not_applicable` |
| Coupon is Stripe promotion code | Pass to Stripe as `promotionCode` |
| Coupon is internal-only | Apply discount on server, pass adjusted prices |
| Multiple coupons | Only one coupon per cart checkout |

**Coupon Application Flow:**
1. Validate coupon is active and not expired
2. Check coupon applies to ALL items in cart (scope check)
3. If coupon has Stripe promotion code: Pass `promotionCode` to Stripe
4. If coupon is internal: Calculate discounted prices, create Stripe session with adjusted amounts
5. Store applied coupon in session metadata for webhook processing

**Error Cases:**
- Coupon not found: Return `coupon_not_found`
- Coupon expired: Return `coupon_expired`
- Coupon doesn't apply to all items: Return `coupon_not_applicable`
- Coupon is x402-only: Return `coupon_wrong_payment_method`

### GET /paywall/v1/cart/{cartId}

Verify cart payment via X-PAYMENT header (internal handler, called via /verify).

---

## Stripe Payment Processing (60s timeout)

### POST /paywall/v1/stripe-session

Create checkout session (idempotent).

```json
// Request
{
  "resource": "string",           // Required: Product ID
  "customerEmail": "string",      // Optional: Pre-fill email
  "metadata": {},                 // Optional: Custom metadata
  "successUrl": "string",         // Optional: Override default
  "cancelUrl": "string",          // Optional: Override default
  "couponCode": "string"          // Optional: Discount code
}

// Response
{
  "sessionId": "cs_...",
  "url": "https://checkout.stripe.com/..."
}
```

### GET /paywall/v1/stripe-session/verify

Verify session status.

```json
// Query: ?session_id={session_id}

// Response
{
  "verified": true,
  "resource_id": "product-id",
  "paid_at": "2025-12-01T10:00:00Z",
  "amount": "10.50",
  "customer": "user@example.com",
  "metadata": {}
}
```

**Note:** Response uses snake_case for compatibility with existing integrations.

### GET /paywall/v1/x402-transaction/verify

Verify x402 transaction.

```json
// Query: ?signature={tx_signature}

// Response
{
  "verified": true,
  "resource_id": "product-id",
  "wallet": "...",
  "paid_at": "2025-12-01T10:00:00Z",
  "amount": "1.50",
  "metadata": {}
}
```

**Note:** Response uses snake_case for compatibility with existing integrations.

### GET /stripe/success

Checkout success redirect handler.

```
// Query: ?session_id={session_id}

// Behavior:
1. Validates session_id query parameter
2. Verifies session status with Stripe
3. If successUrl configured: Redirects (HTTP 302) to configured URL
4. If no successUrl: Returns JSON response:

{
  "status": "success",
  "sessionId": "cs_...",
  "message": "Payment successful"
}
```

### GET /stripe/cancel

Checkout cancel redirect handler.

```
// Query: ?session_id={session_id}

// Behavior:
1. If cancelUrl configured: Redirects (HTTP 302) to configured URL
2. If no cancelUrl: Returns JSON response:

{
  "status": "cancelled",
  "sessionId": "cs_...",
  "message": "Payment cancelled"
}
```

### POST /webhook/stripe

Stripe webhook handler. Processes Stripe events.

**Handled Event Types:**
| Event | Action |
|-------|--------|
| `checkout.session.completed` | Record payment, fire webhook |
| `invoice.payment_succeeded` | Renew subscription |
| `invoice.payment_failed` | Mark subscription past_due |
| `customer.subscription.deleted` | Mark subscription cancelled |
| `customer.subscription.updated` | Update subscription details |
| `charge.refunded` | Record Stripe refund |

**Signature Verification:**
- Header: `Stripe-Signature`
- Uses `CEDROS_STRIPE_WEBHOOK_SECRET` for verification
- Invalid signature: Returns HTTP 400

### GET /webhook/stripe

Webhook configuration info endpoint.

```json
// Response
{
  "status": "configured",
  "webhookUrl": "/webhook/stripe",
  "configuredEvents": [
    "checkout.session.completed",
    "invoice.payment_succeeded",
    "invoice.payment_failed",
    "customer.subscription.deleted",
    "customer.subscription.updated",
    "charge.refunded"
  ]
}
```

---

## Gasless Transactions (60s timeout)

### POST /paywall/v1/gasless-transaction

Build fee-paying transaction.

```json
// Request
{
  "resourceId": "string",         // Required: Product ID or cart_xxx
  "userWallet": "string",         // Required: User's wallet address
  "feePayer": "string",           // Optional: Specific server wallet
  "couponCode": "string"          // Optional: Discount code
}

// Response
{
  "transaction": "base64...",     // Serialized unsigned transaction
  "feePayer": "server_wallet",    // Server wallet paying fees (full pubkey)
  "blockhash": "...",             // Recent blockhash used
  "lastValidBlockHeight": 123456, // Block height for expiry
  "signers": ["server_pubkey"]    // Accounts that will sign (server wallet)
}
```

**Signers Array:**
- Contains public keys of accounts that must sign the transaction
- For gasless: Server wallet (fee payer) signs first
- User wallet must also sign (as transfer authority) but is not listed here
- Client should sign with user wallet, then server co-signs during verification

**Transaction Structure:**
The returned transaction contains:
1. SetComputeUnitLimit instruction
2. SetComputeUnitPrice instruction (priority fee)
3. SPL Token TransferChecked instruction
4. Memo instruction (if memo configured)

**Client Flow:**
1. Receive unsigned transaction from this endpoint
2. Deserialize and sign with user wallet
3. Submit to `/paywall/v1/verify` with X-PAYMENT header
4. Server co-signs with fee payer and submits to network

---

**See Also:**
- [03-http-endpoints-subscriptions.md](./03-http-endpoints-subscriptions.md) for subscription, admin, and webhook endpoints
- [04-http-endpoints-refunds.md](./04-http-endpoints-refunds.md) for refund and product catalog endpoints
