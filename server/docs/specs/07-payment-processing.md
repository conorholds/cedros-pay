# Cedros Pay Server - Payment Processing

x402 and Stripe payment flows with verification details.

---

## x402 Payment Flow

### Protocol Constants

| Constant | Value | Description |
|----------|-------|-------------|
| BlockhashValidityWindow | 90 seconds | Time-based estimate for blockhash validity (see note below) |
| RPCPollInterval | 2 seconds | Polling frequency for RPC fallback (only used when WebSocket fails) |
| DefaultConfirmationTimeout | 2 minutes | Max wait for confirmation |
| DefaultAccessTTL | 45 minutes | How long verified payments remain cached |
| AmountTolerance | 1e-9 | Epsilon for float comparisons in x402 verification |

**BlockhashValidityWindow Design Tradeoff:**

The Go implementation uses a **time-based estimate** (90 seconds) instead of tracking `lastValidBlockHeight` from the blockhash. This is a practical tradeoff:

*Time-based approach (current):*
```
maxValidTime = now + 90 seconds
// Poll until time expires or transaction confirms
```

*Slot-based approach (more accurate):*
```
blockhash = GetLatestBlockhash()  // Returns lastValidBlockHeight
// During polling:
currentSlot = GetSlot()           // Extra RPC call each poll
if currentSlot > lastValidBlockHeight → expired
```

| Approach | Pros | Cons |
|----------|------|------|
| Time-based (90s) | Fewer RPC calls, simpler | Less precise, conservative buffer needed |
| Slot-based | Exact expiry detection | Extra `GetSlot()` calls, must track `lastValidBlockHeight` |

The 90-second window is intentionally conservative (actual validity ~60s on mainnet) to account for slot time variance and network congestion. Implementations prioritizing accuracy over RPC costs may prefer the slot-based approach.

**Amount Tolerance Usage:**
- Used in `Verify()` when comparing paid amount to required amount
- Formula: `if amount + AmountTolerance < requirement.Amount` → reject
- This allows for tiny floating-point rounding differences
- Overpayment is allowed (for tips), underpayment is rejected
- Cart verification uses separate tolerance (1e-6) for exact matching

### Verification Steps

1. **Parse X-PAYMENT header** (base64 JSON or raw JSON for testing)
2. **Validate x402Version** (must be 0)
3. **Validate scheme** ("solana-spl-transfer" or "solana")
4. **Validate network** matches config
5. **Extract Solana payload:**
   - `signature` - Transaction signature (optional, extracted from tx if not provided)
   - `transaction` - Base64-encoded serialized transaction (REQUIRED)
   - `feePayer` - Server wallet for gasless mode (optional)
   - `resource` - Resource ID from payload
   - `resourceType` - "regular" | "cart" | "refund"
   - `memo` - Payment memo (optional)
   - `recipientTokenAccount` - Destination token account (optional)
   - `metadata` - Custom key-value pairs (optional)
6. **Deserialize transaction** from base64 (see Transaction Format section below)
7. **Validate transfer instruction:**
   - Extract user wallet (transfer authority)
   - Validate recipient matches config
   - Validate token mint matches allowed tokens
   - Extract and validate amount (>= required amount with tolerance)
8. **For gasless transactions** (feePayer provided):
   - Validate fee payer in transaction matches configured server wallets
   - Co-sign transaction with matching server wallet
9. **Submit transaction** via RPC:
   - Handle "already processed" errors (idempotent)
   - Handle insufficient funds errors (token vs SOL)
   - Handle missing token account (auto-create if enabled)
10. **Wait for confirmation** (WebSocket subscription with RPC fallback)
11. **Store signature** for replay protection
12. **Return settlement response** with X-PAYMENT-RESPONSE header

---

## Solana Transaction Format

### Transaction Serialization

Transactions are serialized using **bincode** format (Solana standard) and then base64-encoded.

**Deserialization Steps:**
1. Base64 decode the `transaction` field from X-PAYMENT payload
2. Bincode deserialize into Transaction struct
3. Transaction contains: signatures array + message

**Transaction Structure:**
```
Transaction {
    signatures: [Signature; num_signers]  // 64 bytes each
    message: Message {
        header: MessageHeader {
            num_required_signatures: u8
            num_readonly_signed_accounts: u8
            num_readonly_unsigned_accounts: u8
        }
        account_keys: [PublicKey; n]      // 32 bytes each
        recent_blockhash: Hash            // 32 bytes
        instructions: [CompiledInstruction; m]
    }
}

CompiledInstruction {
    program_id_index: u8                  // Index into account_keys
    accounts: [u8; a]                     // Indices into account_keys
    data: [u8; d]                         // Instruction data
}
```

### Expected Instruction Order (Gasless)

For gasless transactions built by `BuildGaslessTransaction`:

```
Index 0: SetComputeUnitLimit (ComputeBudget program)
Index 1: SetComputeUnitPrice (ComputeBudget program)
Index 2: TransferChecked (Token program)
Index 3: Memo (Memo program)
```

For non-gasless transactions (user-built):
- Instruction order may vary
- Must scan all instructions to find SPL transfer
- Transfer instruction MUST be present

### Signer Arrangement

**Gasless Transactions:**
```
Signer 0: Server wallet (fee payer) - signs SECOND (co-signs)
Signer 1: User wallet (transfer authority) - signs FIRST
```

**Non-Gasless Transactions:**
```
Signer 0: User wallet (fee payer + transfer authority)
```

### Transfer Instruction Extraction

To validate and extract transfer details:

1. Find instruction where `program_id = Token Program`
2. Parse instruction data:
   - Byte 0: Instruction type (12 = TransferChecked)
   - Bytes 1-8: Amount (little-endian u64)
   - Byte 9: Decimals
3. Extract accounts from instruction:
   - Account 0: Source token account
   - Account 1: Token mint
   - Account 2: Destination token account
   - Account 3: Authority (signer)

### Transaction Versioning

Both legacy and v0 (versioned) transactions are supported:
- Legacy: First byte != 0x80
- Versioned (v0): First byte = 0x80

For versioned transactions, skip the version byte before parsing message.

---

### Verifier Interface

```go
type Verifier interface {
    Verify(ctx context.Context, proof PaymentProof, requirement Requirement) (VerificationResult, error)
}
```

### SolanaVerifier Methods

| Method | Description |
|--------|-------------|
| `NewSolanaVerifier(rpcURL, wsURL)` | Create verifier |
| `SetServerWallets([]PrivateKey)` | Configure wallets for gasless/auto-create |
| `EnableGasless()` | Enable gasless transaction support |
| `EnableAutoCreateTokenAccounts()` | Enable automatic ATA creation |
| `SetupTxQueue(minTimeBetween, maxInFlight)` | Configure rate limiting |
| `ShutdownTxQueue()` | Stop transaction queue gracefully |
| `WithMetrics(*Metrics, network)` | Add Prometheus metrics |
| `Verify(ctx, proof, requirement)` | Verify payment |
| `BuildGaslessTransaction(ctx, req)` | Build gasless tx |
| `Close()` | Release resources |
| `RPCClient()` | Access underlying RPC client |
| `GetHealthChecker()` | Get health checker |

### Transaction Confirmation Strategy

**Primary: WebSocket SignatureSubscribe** (fast, event-driven)
- Subscribe to `SignatureSubscribe(signature, commitment)` via WebSocket
- Wait for confirmation notification from Solana
- Returns immediately on success or transaction error

**Fallback: RPC Polling** (only when WebSocket fails)
- Used when WebSocket connection fails or subscription errors
- Critical for payment reliability - ensures we don't miss successful payments
- Polls `GetSignatureStatuses` every `RPCPollInterval` (2s)
- Stops polling after `BlockhashValidityWindow` (90s) - transaction would be dropped
- Does one final check on context timeout

```
awaitConfirmation(ctx, signature, commitment)
├── Try WebSocket SignatureSubscribe (primary - fast)
│   └── Wait for confirmation notification
└── If WebSocket fails → RPC polling fallback (reliability)
    ├── Poll GetSignatureStatuses every 2s
    ├── Stop after BlockhashValidityWindow (90s) - tx dropped
    └── Final check on context timeout
```

### Commitment Level Handling

| Level | Description |
|-------|-------------|
| `CommitmentProcessed` | Transaction landed in block (fastest, least reliable) |
| `CommitmentConfirmed` | 66%+ stake voted (default, recommended) |
| `CommitmentFinalized` | 31+ confirmations (slowest, most reliable) |

### Solana Error Detection Helpers

| Function | Description |
|----------|-------------|
| `isTransactionNotFoundError(err)` | Still pending, continue polling |
| `isAlreadyProcessedError(err)` | Tx already processed (idempotent success) |
| `isAccountNotFoundError(err)` | Token account doesn't exist |
| `isInsufficientFundsTokenError(err)` | SPL token balance too low (0x1) |
| `isInsufficientFundsSOLError(err)` | Not enough SOL for fees |
| `isRateLimitError(err)` | RPC rate limited (429) |

---

## Stripe Payment Flow

### Checkout Session Flow

1. **Create checkout session** with line items
2. **Support metadata** pass-through
3. **Handle success/cancel** redirects
4. **Process webhook events**

### Webhook Event Handling

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Extract `resource_id` from metadata, record payment (signature = `stripe:{session_id}`), trigger payment.succeeded webhook, if subscription mode create subscription record |
| `customer.subscription.created` | Link Stripe subscription ID to local subscription, set initial billing period |
| `customer.subscription.updated` | Update status (active, past_due, canceled), update period dates, handle `cancel_at_period_end` flag, handle plan changes |
| `customer.subscription.deleted` | Mark subscription as cancelled in local storage |
| `invoice.paid` | Extend subscription period, update status to active |
| `invoice.payment_failed` | Mark subscription as past_due |

### Webhook Requirements

- [ ] Verify webhook signatures using `stripe-signature` header and webhook secret
- [ ] Return 200 immediately after successful processing (Stripe expects < 30s response)

---

## Gasless Transactions

- [ ] Build Solana transaction with server as fee payer
- [ ] Sign with server wallet
- [ ] Return partially-signed transaction for user co-sign
- [ ] Handle compute unit limits and priority fees
- [ ] Optional: Auto-create missing token accounts

### GaslessTxRequest

| Field | Type | Description |
|-------|------|-------------|
| PayerWallet | PublicKey | User's wallet |
| FeePayer | *PublicKey | Specific server wallet (optional) |
| RecipientTokenAccount | PublicKey | Payment destination |
| TokenMint | PublicKey | Token mint address |
| Amount | uint64 | Amount in atomic units |
| Decimals | uint8 | Token decimals |
| Memo | string | Transaction memo |
| ComputeUnitLimit | uint32 | Compute budget |
| ComputeUnitPrice | uint64 | Priority fee (microlamports) |
| Blockhash | Hash | Recent blockhash |

### GaslessTxResponse

| Field | JSON | Description |
|-------|------|-------------|
| Transaction | `transaction` | Base64-encoded serialized tx |
| FeePayer | `feePayer` | Server wallet public key |
| Blockhash | `blockhash` | Blockhash used |
| LastValidBlockHeight | `lastValidBlockHeight` | Block height limit |
| Signers | `signers` | Required signer public keys |

---

## Cart Checkout

- [ ] Create cart quote with multiple items
- [ ] Calculate totals with quantity multipliers
- [ ] Apply coupons to eligible items
- [ ] Generate Stripe checkout session with multiple line items
- [ ] Track cart expiration (default: 15 minutes)
- [ ] Verify cart payment by ID

### Cart Flow

1. **POST /paywall/v1/cart/quote** - Create cart with items
2. User receives x402 quote for total
3. User pays via x402 or Stripe
4. **POST /paywall/v1/verify** with resourceType="cart"
5. Payment verified against cart total

---

## Refund Processing

- [ ] Create refund quote (requires original transaction)
- [ ] Admin approval workflow with nonce
- [ ] Execute Solana transfer to recipient wallet
- [ ] Update refund status through lifecycle
- [ ] Emit refund webhook on completion

### Refund Flow

1. **POST /paywall/v1/refunds/request** - Create refund request
2. Admin reviews pending refunds via **POST /paywall/v1/refunds/pending**
3. Admin approves via **POST /paywall/v1/refunds/approve** (requires nonce + signature)
4. System executes refund transfer
5. Webhook triggered on completion

### Refund Status Lifecycle

```
pending → approved → processed
                  ↘ denied
```

---

## Subscription Management

- [ ] Support Stripe and x402 payment methods
- [ ] Handle subscription status transitions
- [ ] Grace period after expiration
- [ ] Trial period support
- [ ] Upgrade/downgrade with proration
- [ ] Cancel at period end
- [ ] Reactivation of cancelled subscriptions
- [ ] Stripe billing portal integration

### Subscription Status Transitions

```
                  ┌──────────────────┐
                  │                  │
                  ▼                  │
created → trialing → active ─────► cancelled
              │         │              ▲
              │         ▼              │
              └──► past_due ──────────┘
                      │
                      ▼
                   expired
```

### Status Definitions

| Status | Description |
|--------|-------------|
| trialing | In trial period |
| active | Payment current |
| past_due | Payment failed |
| cancelled | User or system cancelled |
| expired | Period ended without renewal |

### Subscription Service Methods

| Method | Description |
|--------|-------------|
| `CreateStripeSubscription(ctx, req)` | Create Stripe-backed subscription |
| `CreateX402Subscription(ctx, req)` | Create x402-backed subscription |
| `ExtendX402Subscription(ctx, id, period, interval)` | Extend existing |
| `HasAccess(ctx, wallet, productID)` | Check subscription access |
| `HasStripeAccess(ctx, stripeSubID)` | Check Stripe subscription |
| `Cancel(ctx, id, atPeriodEnd)` | Cancel subscription |
| `ChangeSubscription(ctx, req)` | Upgrade/downgrade plan |
| `ReactivateSubscription(ctx, id)` | Reactivate cancelled |
| `HandleStripeRenewal(ctx, stripeSubID, periodStart, periodEnd)` | Process renewal |
| `HandleStripePaymentFailed(ctx, stripeSubID)` | Handle failure |
| `HandleStripeCancelled(ctx, stripeSubID)` | Handle cancellation |
| `HandleStripeSubscriptionUpdated(ctx, stripeSubID, update)` | Handle update |
| `Get(ctx, id)` | Get by ID |
| `GetByWallet(ctx, wallet, productID)` | Get by wallet |
| `GetByStripeSubscriptionID(ctx, stripeSubID)` | Get by Stripe ID |
| `ListExpiring(ctx, within)` | List expiring |
| `ExpireOverdue(ctx)` | Expire overdue x402 subscriptions |
