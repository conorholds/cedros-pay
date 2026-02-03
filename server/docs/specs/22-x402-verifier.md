# Cedros Pay Server - x402 Verifier

Complete specification for x402 payment verification on Solana.

---

## Architecture Overview

The x402 verifier consists of several components:

1. **SolanaVerifier**: Core verification logic
2. **TransactionQueue**: Rate-limited transaction processing
3. **WalletHealthChecker**: Server wallet balance monitoring
4. **GaslessBuilder**: Server-paid fee transaction construction

---

## SolanaVerifier Structure

```go
type SolanaVerifier struct {
    rpcClient               *rpc.Client
    wsClient                *ws.Client
    clock                   func() time.Time
    serverWallets           []solana.PrivateKey
    walletIndex             atomic.Uint64        // Round-robin counter
    gaslessEnabled          bool
    autoCreateTokenAccounts bool
    txQueue                 *TransactionQueue
    healthChecker           *WalletHealthChecker
    metrics                 *metrics.Metrics
    network                 string
}
```

---

## Constructor and Configuration

### NewSolanaVerifier

```go
func NewSolanaVerifier(rpcURL, wsURL string) (*SolanaVerifier, error)
```

**Behavior:**
- rpcURL is required
- If wsURL is empty, derives from rpcURL (https→wss)
- Establishes WebSocket connection for fast confirmations

**Error Conditions:**
- Empty rpcURL → error
- WebSocket connection failure → error

---

### Configuration Methods

| Method | Purpose |
|--------|---------|
| `SetServerWallets(wallets)` | Configure server wallets for gasless + token account creation |
| `EnableGasless()` | Enable gasless transaction support |
| `EnableAutoCreateTokenAccounts()` | Enable automatic token account creation |
| `SetupTxQueue(minTimeBetween, maxInFlight)` | Initialize rate-limited queue |
| `WithMetrics(metrics, network)` | Add Prometheus metrics collection |

### Lifecycle Methods

| Method | Purpose |
|--------|---------|
| `Close()` | Close RPC and WebSocket connections |
| `ShutdownTxQueue()` | Gracefully shutdown transaction queue |
| `RPCClient() *rpc.Client` | Access underlying RPC client |
| `GetHealthChecker() *WalletHealthChecker` | Access wallet health checker |

---

## Core Verification

### Verify Method

```go
func (s *SolanaVerifier) Verify(
    ctx context.Context,
    proof PaymentProof,
    requirement Requirement,
) (VerificationResult, error)
```

**Process:**

1. **Validation**
   - RecipientOwner required
   - TokenMint required
   - Transaction payload required
   - Decode base64 transaction

2. **Gasless Fee Payer Check**
   - If gasless enabled and proof.FeePayer set
   - Validate fee payer matches transaction

3. **Transfer Validation**
   - Extract amount and user wallet from transaction
   - Validate transfer instruction structure
   - Check amount >= requirement (with tolerance)

4. **Gasless Co-Signing** (if applicable)
   - Find matching server wallet for fee payer
   - Partial sign transaction with server key

5. **Transaction Submission**
   - Send via RPC with configured commitment
   - Handle errors (rate limits, insufficient funds, missing accounts)

6. **Confirmation**
   - WebSocket subscription (fast path)
   - RPC polling fallback

7. **Result**
   - Return wallet, amount, signature, expiry

---

## Payment Proof Types

### PaymentPayload (x402 Spec)

```go
type PaymentPayload struct {
    X402Version int    `json:"x402Version"`
    Scheme      string `json:"scheme"`
    Network     string `json:"network"`
    Payload     any    `json:"payload"`
}
```

### SolanaPayload (Scheme-Specific)

```go
type SolanaPayload struct {
    Signature             string            `json:"signature"`
    Transaction           string            `json:"transaction"`
    Resource              string            `json:"resource,omitempty"`
    ResourceType          string            `json:"resourceType,omitempty"`
    FeePayer              string            `json:"feePayer,omitempty"`
    Memo                  string            `json:"memo,omitempty"`
    RecipientTokenAccount string            `json:"recipientTokenAccount,omitempty"`
    Metadata              map[string]string `json:"metadata,omitempty"`
}
```

### PaymentProof (Internal)

```go
type PaymentProof struct {
    X402Version           int
    Scheme                string
    Network               string
    Signature             string
    Payer                 string
    Transaction           string
    Memo                  string
    Metadata              map[string]string
    Resource              string
    ResourceType          string
    RecipientTokenAccount string
    FeePayer              string
}
```

---

## Requirement Structure

```go
type Requirement struct {
    ResourceID            string
    RecipientOwner        string
    RecipientTokenAccount string
    TokenMint             string
    Amount                float64
    Network               string
    TokenDecimals         uint8
    AllowedTokens         []string
    QuoteTTL              time.Duration
    SkipPreflight         bool
    Commitment            string
}
```

---

## Verification Result

```go
type VerificationResult struct {
    Wallet    string
    Amount    float64
    Signature string
    ExpiresAt time.Time
}
```

---

## Transaction Queue

Rate-limited transaction processing for high-volume scenarios.

### Structure

```go
type TransactionQueue struct {
    queue          *list.List
    minTimeBetween time.Duration
    maxInFlight    int
    inFlight       int
    lastSendTime   time.Time
    rpcClient      *rpc.Client
    verifier       *SolanaVerifier
}
```

### Constants

| Constant | Value | Description |
|----------|-------|-------------|
| QueuePollInterval | 50ms | Worker poll frequency |
| TxTimeout | 30s | Transaction send timeout |
| TxConfirmTimeout | 60s | Confirmation wait timeout |
| MaxTxRetries | 3 | Max retries for rate-limited tx |

### Methods

| Method | Description |
|--------|-------------|
| `NewTransactionQueue(rpc, verifier, minTime, maxFlight)` | Create queue |
| `Start()` | Begin worker goroutine |
| `Shutdown()` | Graceful shutdown |
| `Enqueue(id, tx, opts, req)` | Add to back of queue |
| `EnqueuePriority(qtx)` | Add to front (rate-limited retries) |
| `Stats()` | Return {queued, in_flight} counts |

### Rate Limit Handling

1. Send fails with rate limit error
2. Increment retry counter
3. Calculate backoff: `500ms * 2^(retry-1)`
4. Wait for backoff
5. Enqueue to FRONT of queue
6. Retry up to MaxTxRetries times

### Complete Transaction Retry Policy

| Error Type | Retryable | Max Retries | Backoff | Notes |
|------------|-----------|-------------|---------|-------|
| Rate limit (429) | Yes | 3 | 500ms × 2^n | Exponential, priority re-queue |
| Network timeout | Yes | 2 | 500ms fixed | Connection issues |
| RPC 5xx errors | Yes | 3 | 500ms × 2^n | Server errors |
| Blockhash expired | No | 0 | - | Must get new blockhash |
| Insufficient funds (SOL) | No | 0 | - | User/server needs funds |
| Insufficient funds (token) | No | 0 | - | User needs tokens |
| Account not found | Special | 1 | - | Auto-create ATA if enabled |
| Already processed | No | 0 | - | Idempotent success |
| Program error | No | 0 | - | Transaction invalid |

**Retry Timeout:**
- Max total retry duration: 120 seconds from initial submit
- If timeout exceeded before max retries: Give up
- Timeout and retry count checked independently (whichever fails first)

**Non-Queue Path (Direct Verify):**
For transactions not using the queue, retry logic is simpler:
1. Send transaction
2. If rate-limited: Wait 500ms, retry once
3. If still failing: Return error to caller

---

## Wallet Health Checker

Monitors server wallet SOL balances.

### Constants

| Constant | Value | Description |
|----------|-------|-------------|
| MinHealthyBalance | 0.005 SOL | Minimum for healthy status |
| CriticalBalance | 0.001 SOL | Critical threshold |
| HealthCheckInterval | 5 minutes | Check frequency |
| HealthCheckTimeout | 10 seconds | RPC timeout |

### WalletHealth Structure

```go
type WalletHealth struct {
    PublicKey      solana.PublicKey
    Balance        float64
    IsHealthy      bool      // balance >= 0.005 SOL
    IsCritical     bool      // balance <= 0.001 SOL
    LastChecked    time.Time
    LastCheckError error
}
```

### Methods

| Method | Description |
|--------|-------------|
| `NewWalletHealthChecker(rpc, wallets)` | Create checker |
| `Start()` | Begin background loop |
| `Stop()` | Graceful shutdown |
| `CheckAll()` | Immediate check of all wallets |
| `GetHealthyWallet(currentIndex)` | Round-robin healthy wallet |
| `GetHealth()` | All wallet health statuses |
| `GetWalletHealth(pubkey)` | Single wallet health |
| `HealthySummary()` | (healthy, unhealthy, critical) counts |
| `SetCriticalCallback(fn)` | Set callback for critical alerts |

### Health Status Flow

```
Wallet Added → IsCritical=true (assume worst)
    ↓
First Check → Update based on balance
    ↓
Healthy (≥0.005 SOL) | Low (<0.005) | Critical (≤0.001)
    ↓
Transitions logged (warn/error for degradation)
    ↓
Critical callback invoked on transition to critical
```

### Server Wallet Selection for Gasless

When selecting a server wallet for gasless transactions:

1. **Round-Robin Selection**: Uses atomic counter `walletIndex` to distribute load
2. **Health-Aware Selection**: `GetHealthyWallet(currentIndex)` skips unhealthy wallets
3. **Fallback Behavior**: If all wallets unhealthy, still uses round-robin (better than failing)
4. **Specific Fee Payer**: If `FeePayer` specified in request, MUST match a configured server wallet

**Selection Algorithm:**
```go
func GetHealthyWallet(currentIndex uint64) (wallet, newIndex) {
    // Try starting from currentIndex
    for i := 0; i < len(wallets); i++ {
        idx := (currentIndex + i) % len(wallets)
        if wallets[idx].IsHealthy {
            return wallets[idx], idx + 1
        }
    }
    // All unhealthy - return next in round-robin anyway
    return wallets[currentIndex % len(wallets)], currentIndex + 1
}
```

**Server Wallet Selection Rules:**

| Scenario | Behavior |
|----------|----------|
| FeePayer specified in request | MUST use that exact wallet; error if not configured |
| FeePayer specified but unhealthy | Still use it (user explicitly requested) |
| No FeePayer, healthy wallets exist | Round-robin through healthy wallets |
| No FeePayer, all wallets unhealthy | Use round-robin anyway (degrade gracefully) |
| No FeePayer, all wallets critical | Use round-robin, but log error |
| Wallet becomes unhealthy mid-tx | Transaction may fail; caller must retry |

**Health Check Timing:**
- Health status updated every 5 minutes (background loop)
- NOT real-time checked during transaction
- Wallet may become unhealthy between check and use
- Mid-transaction failures are NOT auto-retried with different wallet

---

## Gasless Transaction Builder

### GaslessTxRequest

```go
type GaslessTxRequest struct {
    PayerWallet           solana.PublicKey
    FeePayer              *solana.PublicKey  // Optional specific server wallet
    RecipientTokenAccount solana.PublicKey
    TokenMint             solana.PublicKey
    Amount                uint64             // Atomic units
    Decimals              uint8
    Memo                  string
    ComputeUnitLimit      uint32
    ComputeUnitPrice      uint64             // Priority fee (microlamports)
    Blockhash             solana.Hash
}
```

### GaslessTxResponse

```go
type GaslessTxResponse struct {
    Transaction string `json:"transaction"` // Base64 unsigned tx
    Blockhash   string `json:"blockhash"`
    FeePayer    string `json:"feePayer"`    // Server wallet
}
```

### BuildGaslessTransaction

```go
func (s *SolanaVerifier) BuildGaslessTransaction(
    ctx context.Context,
    req GaslessTxRequest,
) (GaslessTxResponse, error)
```

**Transaction Structure:**
1. SetComputeUnitLimit instruction
2. SetComputeUnitPrice instruction
3. TransferChecked instruction (SPL token)
4. Memo instruction

**Notes:**
- Transaction is NOT signed
- User signs as transfer authority
- Server co-signs as fee payer during Verify

---

## Confirmation Strategy

### Primary: WebSocket Subscription

```go
func (s *SolanaVerifier) awaitConfirmationViaWebSocket(
    ctx context.Context,
    signature solana.Signature,
    commitment rpc.CommitmentType,
) error
```

- Subscribe to signature updates
- Wait for confirmation result
- Return immediately on success/failure

### Fallback: RPC Polling

```go
func (s *SolanaVerifier) awaitConfirmationViaRPC(
    ctx context.Context,
    signature solana.Signature,
    commitment rpc.CommitmentType,
) error
```

- **Only used when WebSocket fails** - not the normal path
- Poll `GetSignatureStatuses` every `RPCPollInterval` (2s)
- Stop polling after `BlockhashValidityWindow` (90s) - transaction would be dropped
- Critical for payment reliability - ensures we don't miss successful payments
- Does one final check on context timeout

### Commitment Levels

| Level | Requirement |
|-------|-------------|
| processed | ≥ processed |
| confirmed | ≥ confirmed |
| finalized | = finalized |

**Commitment Level Behavior:**

| Level | Stake Required | Typical Time | Use Case |
|-------|----------------|--------------|----------|
| processed | Block included | ~400ms | Fast but risky |
| confirmed | 66%+ stake voted | ~1-2s | **Default, recommended** |
| finalized | 31+ confirmations | ~12-15s | High-value transactions |

**Default Configuration:**
- If commitment not specified in config: Use `confirmed`
- Parse from string: "processed", "confirmed", "finalized" (case-insensitive)
- Invalid value: Default to `finalized`

**Timeout Behavior:**
- Same timeout (120s) for ALL commitment levels
- No fallback to lower commitment if timeout
- If timeout reached: Return `ErrCodeTransactionNotConfirmed`

**Commitment in Responses:**
- Confirmation uses requested commitment level
- `GetSignatureStatuses` returns actual status reached
- Accept if actual >= requested (e.g., finalized satisfies confirmed)

---

## Auto Token Account Creation

When transaction fails due to missing recipient token account:

1. Detect `AccountNotFound` error
2. If autoCreateTokenAccounts enabled:
   - Get next healthy server wallet
   - Create associated token account
   - Wait for propagation (exponential backoff)
   - Retry original transaction

### Propagation Wait

```go
const maxAttempts = 30
backoff := 500ms
maxBackoff := 2s

for attempt := 0; attempt < maxAttempts; attempt++ {
    // Check account exists
    // If yes, return
    // Exponential backoff with cap
}
```

---

## Error Handling

### Error Detection Functions

| Function | Detects |
|----------|---------|
| `isAlreadyProcessedError(err)` | Duplicate transaction |
| `isInsufficientFundsTokenError(err)` | Insufficient SPL tokens |
| `isInsufficientFundsSOLError(err)` | Insufficient SOL for fees |
| `isAccountNotFoundError(err)` | Missing token account |
| `isRateLimitError(err)` | RPC rate limiting |
| `isTransactionNotFoundError(err)` | Pending transaction |

### RPC Error Message Parsing

Solana RPC errors are returned in JSON-RPC format. Detection must handle string matching:

**Error Message Patterns (case-insensitive substring match):**

| Error Type | Message Contains | Example RPC Response |
|------------|------------------|---------------------|
| Already Processed | `"AlreadyProcessed"` or `"already been processed"` | `{"error": {"message": "Transaction already processed"}}` |
| Blockhash Expired | `"BlockhashNotFound"` or `"blockhash not found"` | `{"error": {"message": "Blockhash not found"}}` |
| Insufficient SOL | `"insufficient funds"` or `"Insufficient funds for fee"` | Program log or RPC error |
| Insufficient Token | `"insufficient"` AND `"token"` or `"0x1"` (custom program error) | SPL Token program error |
| Account Not Found | `"AccountNotFound"` or `"account not found"` | `{"error": {"message": "Account not found"}}` |
| Rate Limit | HTTP 429 status OR `"Too many requests"` | HTTP response or JSON-RPC error |

**Program Error Detection:**

SPL Token program errors return instruction indices and custom error codes:

```json
{
  "error": {
    "code": -32002,
    "message": "Transaction simulation failed",
    "data": {
      "err": {
        "InstructionError": [2, {"Custom": 1}]
      },
      "logs": [
        "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA invoke [1]",
        "Program log: Error: insufficient funds",
        "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA consumed 1234 compute units",
        "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA failed: custom program error: 0x1"
      ]
    }
  }
}
```

**SPL Token Custom Error Codes:**

| Code (hex) | Meaning |
|------------|---------|
| 0x0 | Not rent exempt |
| 0x1 | Insufficient funds |
| 0x2 | Invalid mint |
| 0x3 | Mint mismatch |
| 0x4 | Owner mismatch |
| 0x5 | Fixed supply |
| 0x6 | Already in use |
| 0x7 | Invalid number of decimals |
| 0x8 | Not initialized |
| 0x9 | Invalid state |
| 0xA | Overflow |
| 0xB | Authority type not supported |
| 0xC | Mint cannot freeze |
| 0xD | Account frozen |
| 0xE | Invalid mint decimals |
| 0xF | Non-native not supported |

**Detection Implementation Pattern:**

```go
func isInsufficientFundsTokenError(err error) bool {
    errStr := strings.ToLower(err.Error())

    // Check message strings
    if strings.Contains(errStr, "insufficient") &&
       (strings.Contains(errStr, "token") || strings.Contains(errStr, "funds")) {
        return true
    }

    // Check for custom program error 0x1
    if strings.Contains(errStr, "custom program error: 0x1") {
        return true
    }

    // Check program logs for "insufficient funds"
    if strings.Contains(errStr, "error: insufficient funds") {
        return true
    }

    return false
}
```

**HTTP vs JSON-RPC Errors:**

| Source | Format | Detection |
|--------|--------|-----------|
| HTTP 429 | HTTP status code | Check response status before parsing body |
| JSON-RPC error | `{"error": {"code": ..., "message": ...}}` | Parse JSON, check `error` field |
| Program error | Nested in `data.err` | Parse JSON, traverse to `InstructionError` |
| Logs | Array in `data.logs` | Iterate logs, substring match |

### Error Codes Returned

| Code | Condition |
|------|-----------|
| ErrCodeInvalidRecipient | Missing recipient owner |
| ErrCodeInvalidTokenMint | Missing token mint |
| ErrCodeInvalidTransaction | Malformed transaction |
| ErrCodeAmountBelowMinimum | Amount < required |
| ErrCodeInsufficientFundsToken | Insufficient token balance |
| ErrCodeInsufficientFunds | Insufficient SOL (non-gasless) |
| ErrCodeInternalError | Insufficient SOL (gasless - server issue) |
| ErrCodeTransactionFailed | Send/confirm failure |

---

## Constants

### Timing (from pkg/x402/constants.go)

| Constant | Value | Description |
|----------|-------|-------------|
| BlockhashValidityWindow | 90s | Time-based estimate (see design note in 07-payment-processing.md) |
| RPCPollInterval | 2s | RPC polling frequency (fallback only, when WebSocket fails) |
| DefaultConfirmationTimeout | 2 minutes | Max wait for confirmation |
| DefaultAccessTTL | 45 minutes | How long verified payments remain cached |
| AmountTolerance | 1e-9 | Floating point tolerance for amount comparisons |

**Note:** The Go implementation uses time-based blockhash expiry (90s) instead of tracking `lastValidBlockHeight` to reduce RPC calls. See [07-payment-processing.md](./07-payment-processing.md#protocol-constants) for the full design tradeoff discussion. Implementations prioritizing accuracy may use slot-based expiry instead.

---

## Metrics Tracked

| Metric | Labels | Description |
|--------|--------|-------------|
| ObserveRPCCall | method, network, duration, error | RPC call timing |
| ObservePayment | method, resource, gasless, duration, amount, currency | Payment processing |

---

## Security Considerations

1. **Fee Payer Validation**
   - Gasless transactions validate fee payer matches server wallet
   - Prevents unauthorized fee payer substitution

2. **Amount Validation**
   - Exact amount matching (with floating point tolerance)
   - Prevents underpayment attacks

3. **Transfer Instruction Validation**
   - Validates instruction structure
   - Extracts authority from transaction (not trusted input)

4. **Replay Prevention**
   - Solana transaction signatures are globally unique
   - Signature recorded before verification completes

---

## Usage Example

```go
// Create verifier
verifier, err := NewSolanaVerifier(rpcURL, wsURL)
if err != nil {
    return err
}
defer verifier.Close()

// Configure
verifier.SetServerWallets(serverWallets)
verifier.EnableGasless()
verifier.EnableAutoCreateTokenAccounts()
verifier.SetupTxQueue(100*time.Millisecond, 10)
verifier.WithMetrics(metricsCollector, "mainnet-beta")

// Verify payment
proof, err := x402.ParsePaymentProof(xPaymentHeader)
if err != nil {
    return err
}

result, err := verifier.Verify(ctx, proof, requirement)
if err != nil {
    return err
}

// Record payment with result.Signature
```

