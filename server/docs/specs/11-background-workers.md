# Cedros Pay Server - Background Workers

All background worker specifications.

---

## Webhook Delivery Worker

- [ ] Poll webhook queue at configurable interval
- [ ] Execute webhooks with exponential backoff
- [ ] Track attempts and last error
- [ ] Move to DLQ after max attempts exhausted
- [ ] Support graceful shutdown

### Retry Logic

| Attempt | Delay |
|---------|-------|
| 1 | 1s |
| 2 | 2s |
| 3 | 4s |
| 4 | 8s |
| 5 | 16s (capped at MaxInterval) |

**Formula:** `min(InitialInterval × 2^(attempt-1), MaxInterval)`

### Dead Letter Queue (DLQ)

Implementations:
- **NoopDLQStore** - Discard failed webhooks
- **MemoryDLQStore** - Keep in memory (testing)
- **FileDLQStore** - Persist to JSON file (atomic writes)

---

## Balance Monitoring Worker

- [ ] Check server wallet SOL balance periodically
- [ ] Send alert webhook when below threshold
- [ ] Configurable check interval (default: 15m)
- [ ] Configurable threshold (default: 0.01 SOL)

### Alert Throttling

- One alert per wallet per 24 hours
- Prevent alert spam during extended low balance

### Alert Payload

```json
{
  "wallet": "...",
  "balance": 0.005,
  "threshold": 0.01,
  "timestamp": "2025-12-01T10:00:00Z"
}
```

---

## Transaction Queue

Rate-limit Solana RPC submissions.

- [ ] Track inflight transactions
- [ ] Configurable min time between submissions
- [ ] Configurable max concurrent transactions
- [ ] Priority queue for rate-limited retries (push to front)
- [ ] Exponential backoff for rate-limited transactions (500ms × 2^retry)
- [ ] Maximum retry limit per transaction (default: 3)

### Queue Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `QueuePollInterval` | 50ms | Check frequency when queue empty |
| `TxTimeout` | 30 seconds | Send and confirm timeout |
| `TxConfirmTimeout` | 60 seconds | Confirmation wait timeout |
| `MaxTxRetries` | 3 | Max retries for rate-limited tx |

### Queue Methods

| Method | Description |
|--------|-------------|
| `NewTransactionQueue(rpcClient, verifier, minTimeBetween, maxInFlight)` | Create queue |
| `Start()` | Begin background processing |
| `Enqueue(id, tx, opts, requirement)` | Add transaction to queue |
| `EnqueuePriority(queuedTx)` | Add to front (rate-limited retry) |
| `Shutdown()` | Graceful stop |
| `Stats()` | Get queue statistics (queued, in_flight) |

### Rate Limit Handling

When a transaction receives a 429 error:
1. Check retry count
2. If retries < MaxTxRetries:
   - Calculate backoff: 500ms × 2^retry
   - Re-enqueue with priority (front of queue)
3. If retries >= MaxTxRetries:
   - Fail transaction permanently

---

## Wallet Health Checker

- [ ] Monitor server wallet SOL balances
- [ ] Track healthy/unhealthy/critical states per wallet
- [ ] Round-robin selection of healthy wallets for gasless transactions
- [ ] Callback on critical balance

### Health Thresholds

| Threshold | Value | Description |
|-----------|-------|-------------|
| `MinHealthyBalance` | 0.005 SOL | Enough for rent + ~1000 transactions |
| `CriticalBalance` | 0.001 SOL | May not have enough for ATA creation |
| `HealthCheckInterval` | 5 minutes | Check frequency |
| `HealthCheckTimeout` | 10 seconds | RPC timeout |

### WalletHealth Struct

```
WalletHealth
├── PublicKey (solana.PublicKey)
├── Balance (float64)        // Current SOL balance
├── IsHealthy (bool)         // Balance >= MinHealthyBalance
├── IsCritical (bool)        // Balance <= CriticalBalance
├── LastChecked (time.Time)
└── LastCheckError (error)
```

### Health Checker Methods

| Method | Description |
|--------|-------------|
| `NewWalletHealthChecker(rpcClient, wallets)` | Create checker |
| `SetCriticalCallback(fn)` | Set callback for critical balance alerts |
| `Start()` | Begin background checking |
| `Stop()` | Graceful stop |
| `CheckAll()` | Immediate check of all wallets |
| `GetHealthyWallet(currentIndex *uint64)` | Round-robin healthy wallet |
| `GetHealth()` | Get all wallet statuses |
| `GetWalletHealth(pubkey)` | Get specific wallet |
| `HealthySummary()` | Summary counts (healthy, unhealthy, critical) |

### Wallet Selection Algorithm

```
GetHealthyWallet(currentIndex *uint64) *PrivateKey
├── Atomic increment currentIndex
├── For each wallet (starting from index):
│   └── If wallet.IsHealthy → return wallet
└── Return nil if no healthy wallets
```

---

## Cleanup Workers

### Expired Cart Quote Cleanup

- Poll every `CEDROS_STORAGE_CLEANUP_INTERVAL` (default: 5m)
- Delete cart quotes where `expires_at < now()`

### Expired Refund Quote Cleanup

- Poll every cleanup interval
- Delete refund quotes where `expires_at < now()` AND `status = 'pending'`

### Expired Admin Nonce Cleanup

- Poll every cleanup interval
- Delete nonces where `expires_at < now()`

### Payment Transaction Archival

- If archival enabled, run every `CEDROS_STORAGE_ARCHIVAL_RUN_INTERVAL` (default: 24h)
- Archive payments older than retention period (default: 90 days)

### Idempotency Cache Cleanup

- Poll every 5 minutes
- Remove expired entries from idempotency cache
- Uses LRU eviction when cache reaches capacity

---

## Worker Lifecycle

All workers follow this lifecycle pattern:

```go
type Worker interface {
    Start() error     // Begin background processing
    Stop() error      // Graceful shutdown
}
```

### Graceful Shutdown

1. Signal context cancellation
2. Wait for in-flight operations (with timeout)
3. Close resources
4. Return error if timeout exceeded

### Resource Manager Integration

Workers register with lifecycle manager:
```go
resourceManager.Register(worker, func() error {
    return worker.Stop()
})
```

Shutdown happens in LIFO order (last registered = first stopped).
