# Cedros Pay Server - External Integrations

Stripe and Solana integration specifications.

---

## Stripe Integration

### Stripe Client Methods

| Method | Description |
|--------|-------------|
| `NewClient(secretKey, webhookSecret)` | Create client |
| `CreateCheckoutSession(ctx, req)` | Create one-time checkout |
| `CreateSubscriptionCheckout(ctx, req)` | Create subscription checkout |
| `ParseWebhook(ctx, payload, signature)` | Verify and parse webhook |
| `HandleCompletion(ctx, event)` | Handle checkout.session.completed |
| `CancelSubscription(ctx, stripeSubID, atPeriodEnd)` | Cancel subscription |
| `GetSubscription(ctx, stripeSubID)` | Get subscription details |
| `UpdateSubscription(ctx, req)` | Upgrade/downgrade subscription |
| `PreviewProration(ctx, subID, newPriceID)` | Preview upgrade cost |
| `ReactivateSubscription(ctx, stripeSubID)` | Reactivate cancelled sub |
| `CreateBillingPortalSession(ctx, customerID, returnURL)` | Self-service portal |
| `ParseSubscriptionWebhook(payload, eventType)` | Parse sub webhooks |
| `HandleSubscriptionWebhook(ctx, event, subRepo)` | Handle sub webhook events |

### Required Features

- [ ] Checkout session creation with line items
- [ ] Session status retrieval
- [ ] Webhook signature verification (using stripe-signature header)
- [ ] Customer management
- [ ] Subscription management (create, update, cancel, reactivate)
- [ ] Billing portal sessions for self-service
- [ ] Promotion code lookup and application
- [ ] Tax rate application (optional)

### Webhook Event Types

**CRITICAL:** The following webhook events must be handled:

| Event Type | Status | Handler | Actions |
|------------|--------|---------|---------|
| `checkout.session.completed` | ✅ Active | `HandleCompletion()` | Record payment, increment coupon usage, trigger callback |
| `customer.subscription.created` | ⚠️ SDK Only | `HandleSubscriptionWebhook()` | Create subscription record |
| `customer.subscription.updated` | ⚠️ SDK Only | `HandleSubscriptionWebhook()` | Update status, track plan changes |
| `customer.subscription.deleted` | ⚠️ SDK Only | `HandleSubscriptionWebhook()` | Set status to cancelled |
| `invoice.paid` | ⚠️ SDK Only | `HandleSubscriptionWebhook()` | Extend subscription period |
| `invoice.payment_failed` | ⚠️ SDK Only | `HandleSubscriptionWebhook()` | Set status to past_due |

**Note:** Subscription webhook events have SDK support but require wiring into the HTTP handler.

### Webhook Signature Verification

```go
event, err := webhook.ConstructEvent(payload, sig, webhookSecret)
```

**Headers:**
- `Stripe-Signature` - HMAC signature for verification

**Verification Steps:**
1. Parse `Stripe-Signature` header format: `t=<timestamp>,v1=<signature>`
2. Extract timestamp (`t`) as Unix seconds
3. Verify timestamp is within tolerance: `|now - timestamp| <= 300` (5 minutes)
4. If timestamp invalid: Return `ErrCodeInvalidSignature`
5. Construct signed payload: `timestamp + "." + raw_body`
6. Compute HMAC-SHA256 of signed payload using webhook secret
7. Compare computed signature with `v1` value (timing-safe comparison)
8. If signature mismatch: Return `ErrCodeInvalidSignature`

**Timestamp Tolerance:**
- Default: 300 seconds (5 minutes)
- Purpose: Prevents replay attacks with old webhook payloads
- Clock skew: Server clock should be synchronized (NTP)

**Header Format Example:**
```
Stripe-Signature: t=1701432156,v1=abc123def456...
```

---

## Solana Integration

### RPC Client Features

- [ ] RPC client with retry logic
- [ ] Transaction verification
- [ ] Account balance queries
- [ ] Token account lookups
- [ ] Transaction building
- [ ] Transaction signing
- [ ] Transaction submission
- [ ] WebSocket subscription (optional)
- [ ] Commitment level support

### Solana-Specific Features

- [ ] SPL token transfer verification
- [ ] Token account creation (ATA)
- [ ] Compute budget instructions
- [ ] Priority fee instructions
- [ ] Memo program integration
- [ ] Associated token account derivation

### Program IDs

| Program | ID |
|---------|-----|
| Token Program | `TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA` |
| Token 2022 Program | `TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb` |
| Associated Token Program | `ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL` |
| Memo Program | `MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr` |
| Compute Budget Program | `ComputeBudget111111111111111111111111111111` |

### Helper Functions

#### URL Derivation

```
deriveWebsocketURL(rpcURL string) (string, error)
├── "https://" → "wss://"
├── "http://"  → "ws://"
├── "ws://"    → unchanged
└── "wss://"   → unchanged
```

#### Commitment Level Parsing

```
commitmentFromString(value string) CommitmentType
├── "processed"              → CommitmentProcessed
├── "confirmed"              → CommitmentConfirmed
├── "finalized" | "finalised" | "" → CommitmentFinalized (default)
```

#### Token Validation

```go
tokenAllowed(symbol string, allowed []string) bool
// Case-insensitive comparison of token symbols
```

#### Public Key Comparison

```go
pubkeysEqual(expected, actual string) bool
// Compare two base58-encoded public keys for equality
```

### Associated Token Account Derivation

```go
FindAssociatedTokenAddress(owner, mint PublicKey) (PublicKey, uint8, error)
```

**Seeds (in order):**
1. Owner public key (32 bytes)
2. Token program ID (32 bytes) - `TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA`
3. Mint public key (32 bytes)

**Program ID:** `ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL`

**Derivation Algorithm:**
```
seeds = [owner_bytes, token_program_bytes, mint_bytes]
(address, bump) = find_program_address(seeds, ATA_PROGRAM_ID)
```

**Validation Rules:**
1. Derived address MUST be a valid PDA (off-curve point)
2. If account exists on-chain, verify:
   - Account owner = Token Program
   - Account mint = expected mint
   - Account owner field = expected wallet
3. For Token-2022 assets, use Token-2022 program ID in seeds

**Error Handling:**
- If derivation fails (rare): Return error, do not proceed
- If account doesn't exist and auto-create disabled: Return `ErrMissingTokenAccount`
- If account doesn't exist and auto-create enabled: Create ATA before payment

### Transaction Building

#### Transfer Instruction

```go
type TransferInstruction struct {
    Source      PublicKey  // Source token account
    Destination PublicKey  // Destination token account
    Authority   PublicKey  // Transfer authority (signer)
    Amount      uint64     // Amount in atomic units
}
```

#### TransferChecked Instruction

```go
type TransferCheckedInstruction struct {
    Source      PublicKey
    Mint        PublicKey  // Token mint (for verification)
    Destination PublicKey
    Authority   PublicKey
    Amount      uint64
    Decimals    uint8      // Expected decimals (for verification)
}
```

### Compute Budget Instructions

```go
// Set compute unit limit
SetComputeUnitLimit(units uint32)

// Set compute unit price (priority fee)
SetComputeUnitPrice(microLamports uint64)
```

### RPC Retry Logic

**Retryable Errors:**
- Network errors (connection refused, timeout)
- Rate limits (HTTP 429)
- Server errors (HTTP 5xx)

**Non-Retryable Errors:**
- Client errors (HTTP 4xx except 429)
- Transaction failures (program errors)
- Invalid signatures

**Default Settings:**
- Max retries: 3
- Base delay: 100ms
- Exponential backoff

---

## Circuit Breaker Pattern

Protect external service calls from cascading failures.

### Service Types

| Service | Description |
|---------|-------------|
| `solana_rpc` | Solana RPC calls |
| `stripe_api` | Stripe API calls |
| `webhook` | Webhook deliveries |

### Breaker Configuration

| Field | Description |
|-------|-------------|
| MaxRequests | Max requests in half-open state |
| Interval | Stats reset interval |
| Timeout | Time before half-open after trip |
| ConsecutiveFailures | Failures to trip breaker |
| FailureRatio | Ratio to trip (0.0-1.0) |
| MinRequests | Min requests before checking ratio |

### States

```
Closed → (failures exceed threshold) → Open
   ↑                                     │
   │                                     ↓
   └────── (success) ←───── Half-Open ───┘
                            (timeout)
```

### Default Configurations

**Solana RPC:**
- MaxRequests: 3
- Interval: 60s
- Timeout: 30s
- ConsecutiveFailures: 5
- FailureRatio: 0.5
- MinRequests: 10

**Stripe API:**
- MaxRequests: 3
- Interval: 60s
- Timeout: 30s
- ConsecutiveFailures: 3
- FailureRatio: 0.5
- MinRequests: 5

**Webhook:**
- MaxRequests: 5
- Interval: 60s
- Timeout: 60s
- ConsecutiveFailures: 10
- FailureRatio: 0.7
- MinRequests: 20
