# Cedros Pay Server - Subscription & Admin Endpoints

HTTP endpoints for subscription management and administrative functions.

**Note:** These endpoints are part of the main API. See [02-http-endpoints.md](./02-http-endpoints.md) for core endpoints and [04-http-endpoints-refunds.md](./04-http-endpoints-refunds.md) for refund endpoints.

---

## Subscriptions (60s timeout)

### GET /paywall/v1/subscription/status

Get subscription status.

```json
// Query: ?userId={wallet_or_customer_id}&resource={product_id}

// Response
{
  "active": true,
  "status": "active",             // "active" | "trialing" | "past_due" | "canceled" | "unpaid" | "expired"
  "expiresAt": "2025-12-31T23:59:59Z",
  "currentPeriodEnd": "2025-12-31T23:59:59Z",
  "interval": "monthly",          // "daily" | "weekly" | "monthly" | "yearly" | "custom"
  "cancelAtPeriodEnd": false
}
```

**Field Relationship:**
- `active` is a convenience boolean: `true` when status is `active`, `trialing`, or `past_due`
- `status` is the authoritative source - use for detailed logic
- `expiresAt` and `currentPeriodEnd` are the same value (different names for compatibility)

**Note:** Query param is `userId` (not `wallet`) to support both Stripe customer IDs and Solana wallet addresses.

### POST /paywall/v1/subscription/stripe-session

Create Stripe subscription (idempotent).

```json
// Request
{
  "resource": "string",           // Required: Product ID
  "interval": "monthly",          // "weekly" | "monthly" | "yearly" | "custom"
  "intervalDays": 0,              // For custom interval
  "trialDays": 0,                 // Optional: Trial period
  "customerEmail": "string",      // Optional
  "metadata": {},                 // Optional
  "couponCode": "string",         // Optional
  "successUrl": "string",         // Optional
  "cancelUrl": "string"           // Optional
}

// Response
{
  "sessionId": "cs_...",
  "url": "https://checkout.stripe.com/..."
}
```

### POST /paywall/v1/subscription/quote

Get subscription quote (idempotent).

```json
// Request
{
  "resource": "string",           // Required: Product ID
  "interval": "monthly",          // Required: "daily" | "weekly" | "monthly" | "yearly" | "custom"
  "couponCode": "string",         // Optional
  "intervalDays": 0               // For custom interval
}

// Response (HTTP 402)
{
  "requirement": {
    // x402 quote format (same as /quote response)
  },
  "subscription": {
    "interval": "monthly",        // Normalized interval string
    "intervalDays": 0,            // Days (for custom only)
    "durationSeconds": 2592000,   // Subscription duration in seconds
    "periodStart": "2025-12-01T00:00:00Z",
    "periodEnd": "2026-01-01T00:00:00Z"
  }
}
```

### POST /paywall/v1/subscription/x402/activate

Activate x402 subscription (idempotent).

```json
// Request
{
  "productId": "string",          // Required: Product ID
  "wallet": "string",             // Required: User's wallet address
  "paymentSignature": "string",   // Optional: x402 payment signature (if provided, verifies payment)
  "metadata": {}                  // Optional: Custom metadata
}

// Response
{
  "subscriptionId": "sub_...",
  "productId": "product-id",
  "wallet": "...",
  "status": "active",
  "currentPeriodStart": "2025-12-01T00:00:00Z",
  "currentPeriodEnd": "2026-01-01T00:00:00Z",
  "billingPeriod": "month",
  "billingInterval": 1,
  "quote": {                      // Optional: Payment quote if payment not yet made
    // x402 quote format
  }
}
```

**Note:** If `paymentSignature` is omitted or invalid, the response includes a `quote` for the user to complete payment.

### POST /paywall/v1/subscription/cancel

Cancel subscription.

```json
// Request
{
  "subscriptionId": "string",     // Required
  "atPeriodEnd": true             // Cancel immediately (false) or at period end (true)
}

// Response
{
  "success": true,
  "atPeriodEnd": true
}
```

### POST /paywall/v1/subscription/portal

Stripe billing portal URL.

```json
// Request
{
  "customerId": "cus_...",        // Required: Stripe customer ID
  "returnUrl": "string"           // Required: Return URL after portal
}

// Response
{
  "url": "https://billing.stripe.com/..."
}
```

### POST /paywall/v1/subscription/change

Upgrade/downgrade (idempotent).

```json
// Request
{
  "subscriptionId": "string",     // Required
  "newResource": "string",        // Required: New product ID
  "prorationBehavior": "string"   // "create_prorations" | "none" | "always_invoice"
}

// Response
{
  "success": true,
  "subscriptionId": "sub_...",
  "previousResource": "old-product",
  "newResource": "new-product",
  "status": "active",
  "currentPeriodEnd": "2026-01-01T00:00:00Z",
  "prorationBehavior": "create_prorations"
}
```

### POST /paywall/v1/subscription/reactivate

Reactivate cancelled subscription.

```json
// Request
{
  "subscriptionId": "string"      // Required
}

// Response
{
  "success": true,
  "subscriptionId": "sub_...",
  "status": "active",
  "cancelAtPeriodEnd": false,
  "currentPeriodEnd": "2026-01-01T00:00:00Z"
}
```

---

## Admin Endpoints (Optional - Not Currently Registered)

These endpoints exist in the codebase but are not registered in the main router. Implementations may choose to expose them:

### GET /admin/webhooks

List webhooks (query: status, limit).

### GET /admin/webhooks/{id}

Get webhook by ID.

### POST /admin/webhooks/{id}/retry

Retry failed webhook.

### DELETE /admin/webhooks/{id}

Delete webhook from queue.

---

## Admin Orders (Registered)

These endpoints are registered under `/admin` and require admin signature headers.

### GET /admin/orders

Query: `status`, `search`, `createdBefore`, `createdAfter`, `limit`, `offset`

Response:
```
{
  "orders": [Order],
  "total": 123
}
```

### GET /admin/orders/{id}

Response:
```
{
  "order": Order,
  "history": [OrderHistoryEntry],
  "fulfillments": [Fulfillment]
}
```

### POST /admin/orders/{id}/status

Request:
```
{
  "status": "processing",
  "note": "packed",
  "actor": "admin"
}
```

### POST /admin/orders/{id}/fulfillments

Create a fulfillment with items, tracking info, and optional metadata.

### POST /admin/fulfillments/{id}/status

Update fulfillment status + tracking fields.

---

## Webhook Payloads

### Payment Success Webhook

```json
{
  "eventId": "evt_...",
  "eventType": "payment.succeeded",
  "eventTimestamp": "2025-12-01T10:00:00Z",
  "resourceId": "product-id",
  "method": "x402",               // "stripe" | "x402" | "x402-cart"
  "stripeSessionId": "cs_...",    // If Stripe
  "stripeCustomer": "cus_...",    // If Stripe
  "fiatAmountCents": 1000,        // If fiat
  "fiatCurrency": "usd",          // If fiat
  "cryptoAtomicAmount": 10000000, // If crypto
  "cryptoToken": "USDC",          // If crypto
  "wallet": "...",                // If crypto
  "proofSignature": "tx_...",     // If crypto
  "metadata": {},
  "paidAt": "2025-12-01T10:00:00Z"
}
```

### Refund Success Webhook

```json
{
  "eventId": "evt_...",
  "eventType": "refund.succeeded",
  "eventTimestamp": "2025-12-01T10:00:00Z",
  "refundId": "refund_...",
  "originalPurchaseId": "tx_...",
  "recipientWallet": "...",
  "atomicAmount": 10000000,
  "token": "USDC",
  "processedBy": "admin_wallet",
  "signature": "refund_tx_sig",
  "reason": "Customer request",
  "metadata": {},
  "refundedAt": "2025-12-01T10:00:00Z"
}
```
