# Cedros Pay Server - Data Models (Storage & Integrations)

Storage models, callback events, and integration types.

**Note:** This is part 2 of data models. See [05-data-models.md](./05-data-models.md) for core models.

---

## Subscription Models

### Subscription

| Field | Type | JSON | Description |
|-------|------|------|-------------|
| ID | string | `id` | Subscription ID |
| ProductID | string | `productId` | Product ID |
| Wallet | string | `wallet` | User wallet |
| StripeCustomerID | string | `stripeCustomerId` | Stripe customer |
| StripeSubscriptionID | string | `stripeSubscriptionId` | Stripe subscription |
| PaymentMethod | string | `paymentMethod` | "stripe" or "x402" |
| BillingPeriod | string | `billingPeriod` | Period type |
| BillingInterval | int | `billingInterval` | Period count |
| Status | string | `status` | Subscription status |
| CurrentPeriodStart | time.Time | `currentPeriodStart` | Period start |
| CurrentPeriodEnd | time.Time | `currentPeriodEnd` | Period end |
| TrialEnd | *time.Time | `trialEnd` | Trial end date |
| CancelledAt | *time.Time | `cancelledAt` | Cancellation date |
| CancelAtPeriodEnd | bool | `cancelAtPeriodEnd` | Cancel at end |
| Metadata | map[string]string | `metadata` | Custom metadata |
| CreatedAt | time.Time | `createdAt` | Creation timestamp |
| UpdatedAt | time.Time | `updatedAt` | Last update |

**Status Values:**
- `active` - Subscription is active
- `trialing` - In trial period
- `past_due` - Payment failed
- `cancelled` - Cancelled by user
- `unpaid` - Multiple payment failures
- `expired` - Period ended (x402 only)

**Status Transitions:**

```
                  ┌──────────────────────────────────────────┐
                  │         SUBSCRIPTION LIFECYCLE           │
                  └──────────────────────────────────────────┘

  ┌─────────┐     trial ends      ┌──────────┐
  │trialing │ ─────────────────►  │  active  │
  └────┬────┘                     └────┬─────┘
       │                               │
       │ cancelled                     │ payment failed
       ▼                               ▼
  ┌─────────┐                    ┌──────────┐
  │cancelled│ ◄─────cancelled────│ past_due │
  └─────────┘                    └────┬─────┘
                                      │
                                      │ payment succeeds
                                      ▼
                               ┌──────────┐
                               │  active  │
                               └────┬─────┘
                                    │
       ┌────────────────────────────┤
       │ period ends (x402 only)    │ user cancels
       ▼                            ▼
  ┌─────────┐                 ┌──────────┐
  │ expired │                 │cancelled │
  └─────────┘                 └──────────┘
```

**Transition Rules:**
| From | To | Trigger |
|------|-----|---------|
| trialing | active | Trial period ends |
| trialing | cancelled | User cancels during trial |
| active | past_due | Payment fails (Stripe) |
| active | cancelled | User cancels |
| active | expired | Period ends without renewal (x402) |
| past_due | active | Retry payment succeeds |
| past_due | cancelled | User cancels |
| past_due | unpaid | Multiple payment failures |
| cancelled | active | Reactivation (if still in period) |

**Reactivation Rules:**
- Can only reactivate if `CancelAtPeriodEnd == true` AND `now <= CurrentPeriodEnd`
- Reactivation sets `CancelAtPeriodEnd = false`, clears `CancelledAt`
- Cannot reactivate fully cancelled (past period end) or expired subscriptions

**Methods:**
- `IsActive() bool` - Check if currently active
- `IsActiveAt(t time.Time) bool` - Check if active at time
- `IsTrialing() bool` - Check if in trial
- `DaysUntilExpiration() int` - Days until expiry

---

## Storage Models

### CartQuote

| Field | Type | JSON | Description |
|-------|------|------|-------------|
| ID | string | `id` | Cart ID ("cart_" prefix) |
| Items | []CartItem | `items` | Cart items |
| Total | Money | `total` | Total price |
| Metadata | map[string]string | `metadata` | Custom metadata |
| CreatedAt | time.Time | `createdAt` | Creation timestamp |
| ExpiresAt | time.Time | `expiresAt` | Expiration time |
| WalletPaidBy | string | `walletPaidBy` | Wallet that paid |

**Cart Quote Expiration Behavior:**
- Default TTL: 15 minutes (configurable via `storage.cart_quote_ttl`)
- Expiration is checked at payment verification time, NOT during quote lookup
- If a cart is expired when payment is submitted:
  - Return `ErrQuoteExpired` error
  - User must request a new cart quote
- Expired cart quotes are NOT automatically deleted (for audit trails)
- To clean up old carts, run periodic archival (see archival worker)

### CartItem

| Field | Type | JSON | Description |
|-------|------|------|-------------|
| ResourceID | string | `resource` | Product ID |
| Quantity | int | `quantity` | Item quantity |
| Price | Money | `price` | Item price |
| Metadata | map[string]string | `metadata` | Item metadata |

### Order

| Field | Type | JSON | Description |
|-------|------|------|-------------|
| ID | string | `id` | Order ID |
| TenantID | string | `tenantId` | Tenant isolation |
| Source | string | `source` | "stripe" or "x402" |
| PurchaseID | string | `purchaseId` | Stripe session ID or tx signature |
| ResourceID | string | `resourceId` | Product ID or `cart:{id}` |
| UserID | *string | `userId` | Optional user id |
| Customer | *string | `customer` | Stripe customer or wallet |
| Status | string | `status` | See OrderStatus |
| Items | []OrderItem | `items` | Purchased items |
| Amount | int64 | `amount` | Atomic amount |
| AmountAsset | string | `amountAsset` | Asset code (usd/usdc) |
| CustomerEmail | *string | `customerEmail` | Email (Stripe) |
| Shipping | *OrderShipping | `shipping` | Shipping details |
| Metadata | map[string]string | `metadata` | Custom metadata |
| CreatedAt | time.Time | `createdAt` | Creation timestamp |
| UpdatedAt | *time.Time | `updatedAt` | Last update |
| StatusUpdatedAt | *time.Time | `statusUpdatedAt` | Last status change |

**OrderStatus values:** `created`, `paid`, `processing`, `fulfilled`, `shipped`, `delivered`, `cancelled`, `refunded`

### OrderHistoryEntry

| Field | Type | JSON | Description |
|-------|------|------|-------------|
| ID | string | `id` | History entry id |
| OrderID | string | `orderId` | Order id |
| FromStatus | string | `fromStatus` | Previous status |
| ToStatus | string | `toStatus` | New status |
| Note | *string | `note` | Optional note |
| Actor | *string | `actor` | Admin/system actor |
| CreatedAt | time.Time | `createdAt` | Timestamp |

### Fulfillment

| Field | Type | JSON | Description |
|-------|------|------|-------------|
| ID | string | `id` | Fulfillment id |
| OrderID | string | `orderId` | Order id |
| Status | string | `status` | `pending` \| `shipped` \| `delivered` \| `cancelled` |
| Carrier | *string | `carrier` | Carrier code/name |
| TrackingNumber | *string | `trackingNumber` | Tracking number |
| TrackingUrl | *string | `trackingUrl` | Tracking URL |
| Items | []OrderItem | `items` | Fulfilled items |
| ShippedAt | *time.Time | `shippedAt` | Ship time |
| DeliveredAt | *time.Time | `deliveredAt` | Delivery time |
| Metadata | map[string]string | `metadata` | Custom metadata |
| CreatedAt | time.Time | `createdAt` | Created time |
| UpdatedAt | *time.Time | `updatedAt` | Updated time |

### InventoryReservation

| Field | Type | JSON | Description |
|-------|------|------|-------------|
| ID | string | `id` | Reservation id |
| ProductID | string | `productId` | Product id |
| Quantity | int | `quantity` | Reserved quantity |
| ExpiresAt | time.Time | `expiresAt` | Expiration time |
| CartID | *string | `cartId` | Cart id |
| Status | string | `status` | `active` \| `released` \| `converted` |
| CreatedAt | time.Time | `createdAt` | Created time |

### RefundQuote

| Field | Type | JSON | Description |
|-------|------|------|-------------|
| ID | string | `id` | Refund ID ("refund_" prefix) |
| OriginalPurchaseID | string | `originalPurchaseId` | Original tx signature/session ID |
| RecipientWallet | string | `recipientWallet` | Refund destination |
| Amount | money.Money | - | Refund amount (includes asset info) |
| Reason | string | `reason` | Refund reason |
| Metadata | map[string]string | `metadata` | Custom metadata |
| CreatedAt | time.Time | `createdAt` | Creation timestamp |
| ExpiresAt | time.Time | `expiresAt` | Quote expiration |
| ProcessedBy | string | `processedBy` | Admin wallet that executed refund |
| ProcessedAt | *time.Time | `processedAt` | When refund was processed |
| Signature | string | `signature` | Refund tx signature |

**Methods:**
- `IsExpiredAt(time.Time) bool` - Check if quote expired at given time
- `IsProcessed() bool` - Check if refund completed (ProcessedAt != nil && Signature != "")

**Note:** Refund status is inferred from state (not stored as a field):
- **Pending:** `ProcessedAt == nil && !IsExpiredAt(now)`
- **Expired:** `ProcessedAt == nil && IsExpiredAt(now)` (can be re-quoted via `RegenerateRefundQuote`)
- **Denied:** Record deleted from storage
- **Processed:** `ProcessedAt != nil && Signature != ""`

This approach avoids status enum drift - the status is always derivable from the actual state.

### RefundQuoteResponse

Response from `RegenerateRefundQuote`.

| Field | Type | JSON | Description |
|-------|------|------|-------------|
| RefundID | string | `refundId` | Refund identifier |
| Quote | *CryptoQuote | `quote` | x402 quote for refund |
| ExpiresAt | time.Time | `expiresAt` | Quote expiration |

### PaymentTransaction

Replay protection record.

| Field | Type | Description |
|-------|------|-------------|
| Signature | string | Transaction signature (PK) |
| ResourceID | string | Resource purchased |
| Wallet | string | Payer wallet |
| Amount | Money | Payment amount |
| CreatedAt | time.Time | Payment timestamp |
| Metadata | map[string]string | Custom metadata |

### AdminNonce

Admin replay protection.

| Field | Type | Description |
|-------|------|-------------|
| ID | string | Nonce value |
| Purpose | string | Action type (e.g., "list-pending-refunds", "approve-refund") |
| CreatedAt | time.Time | Creation timestamp |
| ExpiresAt | time.Time | Expiration time |
| ConsumedAt | *time.Time | When used (null if unused) |

### PendingWebhook

Persistent webhook queue.

| Field | Type | Description |
|-------|------|-------------|
| ID | string | Webhook ID |
| URL | string | Destination URL |
| Payload | []byte | JSON payload |
| Headers | map[string]string | HTTP headers |
| EventType | string | Event type |
| Status | string | Delivery status |
| Attempts | int | Attempt count |
| MaxAttempts | int | Max retries |
| LastError | string | Last error message |
| LastAttemptAt | *time.Time | Last attempt time |
| NextAttemptAt | *time.Time | Next retry time |
| CreatedAt | time.Time | Creation timestamp |
| CompletedAt | *time.Time | Completion time |

**Status Values:**
- `pending` - Not yet attempted
- `processing` - Currently being delivered
- `success` - Delivered successfully
- `failed` - All retries exhausted

---

## Callback Models

### PaymentEvent

Payment webhook payload.

| Field | Type | JSON | Description |
|-------|------|------|-------------|
| EventID | string | `eventId` | Unique event ID |
| EventType | string | `eventType` | "payment.succeeded" |
| EventTimestamp | time.Time | `eventTimestamp` | Event time |
| ResourceID | string | `resourceId` | Product ID |
| Method | string | `method` | Payment method |
| StripeSessionID | string | `stripeSessionId` | Stripe session |
| StripeCustomer | string | `stripeCustomer` | Stripe customer |
| FiatAmountCents | int64 | `fiatAmountCents` | Fiat amount |
| FiatCurrency | string | `fiatCurrency` | Fiat currency |
| CryptoAtomicAmount | int64 | `cryptoAtomicAmount` | Crypto amount |
| CryptoToken | string | `cryptoToken` | Crypto token |
| Wallet | string | `wallet` | Payer wallet |
| ProofSignature | string | `proofSignature` | Tx signature |
| Metadata | map[string]string | `metadata` | Custom metadata |
| PaidAt | time.Time | `paidAt` | Payment time |

### RefundEvent

Refund webhook payload.

| Field | Type | JSON | Description |
|-------|------|------|-------------|
| EventID | string | `eventId` | Unique event ID |
| EventType | string | `eventType` | "refund.succeeded" |
| EventTimestamp | time.Time | `eventTimestamp` | Event time |
| RefundID | string | `refundId` | Refund ID |
| OriginalPurchaseID | string | `originalPurchaseId` | Original tx |
| RecipientWallet | string | `recipientWallet` | Refund destination |
| AtomicAmount | int64 | `atomicAmount` | Refund amount |
| Token | string | `token` | Token symbol |
| ProcessedBy | string | `processedBy` | Admin wallet |
| Signature | string | `signature` | Refund tx signature |
| Reason | string | `reason` | Refund reason |
| Metadata | map[string]string | `metadata` | Custom metadata |
| RefundedAt | time.Time | `refundedAt` | Refund time |

### RetryConfig

Webhook retry settings.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| MaxAttempts | int | 5 | Maximum retry attempts |
| InitialInterval | time.Duration | 1s | Initial backoff |
| MaxInterval | time.Duration | 5m | Maximum backoff |
| Multiplier | float64 | 2.0 | Backoff multiplier |
| Timeout | time.Duration | 10s | Request timeout |

**Callback Helper Functions:**
- `generateEventID() string` - Creates `evt_<24 hex chars>` format
- `PreparePaymentEvent(*PaymentEvent)` - Sets EventID, EventType, EventTimestamp if unset
- `PrepareRefundEvent(*RefundEvent)` - Sets EventID, EventType, EventTimestamp if unset

**Note:** EventID serves as idempotency key for webhook deduplication.

---

## Stripe Integration Models

### CreateSessionRequest

Stripe checkout session request.

| Field | Type | JSON | Description |
|-------|------|------|-------------|
| ResourceID | string | `resource` | Product ID |
| AmountCents | int64 | - | Amount in cents |
| Currency | string | - | Currency code |
| PriceID | string | `priceId` | Stripe Price ID |
| CustomerEmail | string | `customerEmail` | Pre-fill email |
| Metadata | map[string]string | `metadata` | Custom metadata |
| SuccessURL | string | `successUrl` | Success redirect |
| CancelURL | string | `cancelUrl` | Cancel redirect |
| Description | string | - | Product description |
| CouponCode | string | `couponCode` | Discount code |
| OriginalAmount | int64 | - | Original amount before discount |
| DiscountAmount | int64 | - | Discount amount |
| StripeCouponID | string | - | Stripe coupon ID |

### CartLineItem

Multi-item cart line item.

| Field | Type | JSON | Description |
|-------|------|------|-------------|
| PriceID | string | `priceId` | Stripe Price ID |
| Resource | string | `resource` | Product ID |
| Quantity | int | `quantity` | Item quantity |
| Description | string | `description` | Item description |
| Metadata | map[string]string | `metadata` | Item metadata |

### CreateCartSessionRequest

Cart checkout request.

| Field | Type | JSON | Description |
|-------|------|------|-------------|
| Items | []CartLineItem | `items` | Cart items |
| CustomerEmail | string | `customerEmail` | Pre-fill email |
| Metadata | map[string]string | `metadata` | Cart metadata |
| SuccessURL | string | `successUrl` | Success redirect |
| CancelURL | string | `cancelUrl` | Cancel redirect |
| CouponCode | string | `couponCode` | Discount code |
| OriginalTotal | int64 | - | Original total |
| DiscountAmount | int64 | - | Discount amount |
| StripeCouponID | string | - | Stripe coupon ID |

### CreateSubscriptionRequest

Stripe subscription request.

| Field | Type | JSON | Description |
|-------|------|------|-------------|
| ProductID | string | `resource` | Product ID |
| PriceID | string | `priceId` | Stripe Price ID |
| CustomerEmail | string | `customerEmail` | Customer email |
| Metadata | map[string]string | `metadata` | Custom metadata |
| SuccessURL | string | `successUrl` | Success redirect |
| CancelURL | string | `cancelUrl` | Cancel redirect |
| TrialDays | int | `trialDays` | Trial period |

### UpdateSubscriptionRequest

Subscription change request.

| Field | Type | JSON | Description |
|-------|------|------|-------------|
| SubscriptionID | string | `subscriptionId` | Stripe subscription ID |
| NewPriceID | string | - | New Stripe Price ID |
| ProrationBehavior | string | `prorationBehavior` | "create_prorations", "none", "always_invoice" |
| Metadata | map[string]string | `metadata` | Custom metadata |

---

## Solana Integration Models

### GaslessTxRequest

Gasless transaction request.

| Field | Type | JSON | Description |
|-------|------|------|-------------|
| PayerWallet | string | `userWallet` | User's wallet address |
| FeePayer | string | `feePayer` | Server wallet for fees |
| RecipientTokenAccount | string | - | Destination token account |
| TokenMint | string | - | Token mint address |
| Amount | uint64 | - | Amount in atomic units |
| Decimals | uint8 | - | Token decimals |
| Memo | string | - | Transaction memo |
| ComputeUnitLimit | uint32 | - | Compute unit limit |
| ComputeUnitPrice | uint64 | - | Priority fee (microlamports) |
| Blockhash | string | - | Recent blockhash |

### GaslessTxResponse

Gasless transaction response.

| Field | Type | JSON | Description |
|-------|------|------|-------------|
| Transaction | string | `transaction` | Base64-encoded serialized tx |
| Blockhash | string | `blockhash` | Blockhash used |
| FeePayer | string | `feePayer` | Server wallet paying fees |
| LastValidBlockHeight | uint64 | `lastValidBlockHeight` | Block height for expiry |
| Signers | []string | `signers` | Accounts that must sign |

### WalletHealth

Server wallet health status.

| Field | Type | Description |
|-------|------|-------------|
| PublicKey | string | Wallet public key |
| Balance | float64 | Current SOL balance |
| IsHealthy | bool | Balance >= MinHealthyBalance |
| IsCritical | bool | Balance <= CriticalBalance |
| LastChecked | time.Time | Last health check time |
| LastCheckError | error | Last check error (if any) |

**Health Constants:**
- `MinHealthyBalance` = 0.005 SOL (enough for rent + ~1000 transactions)
- `CriticalBalance` = 0.001 SOL (may not have enough for ATA creation)
- `HealthCheckInterval` = 5 minutes
- `HealthCheckTimeout` = 10 seconds

### TransactionQueue

Rate-limited transaction queue.

**Queue Constants:**
- `QueuePollInterval` = 50ms (check frequency when queue empty)
- `TxTimeout` = 30 seconds (send and confirm timeout)
- `TxConfirmTimeout` = 60 seconds (confirmation wait timeout)
- `MaxTxRetries` = 3 (max retries for rate-limited tx)

**Queue Methods:**
- `NewTransactionQueue(rpcClient, verifier, minTimeBetween, maxInFlight)` - Create queue
- `Start()` - Begin background processing
- `Enqueue(id, tx, opts, requirement)` - Add transaction to queue
- `EnqueuePriority(queuedTx)` - Add to front (rate-limited retry)
- `Shutdown()` - Graceful stop
- `Stats() map[string]int` - Get queue statistics (queued, in_flight)
