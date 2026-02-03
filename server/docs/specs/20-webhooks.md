# Cedros Pay Server - Webhook System

Complete specification for callback/webhook delivery system.

---

## Architecture Overview

Two delivery mechanisms available:

1. **RetryableClient**: In-memory async delivery (lost on restart)
2. **PersistentCallbackClient**: Database-backed with worker loop

Both implement the `Notifier` interface.

---

## Notifier Interface

```go
type Notifier interface {
    PaymentSucceeded(ctx context.Context, event PaymentEvent)
    RefundSucceeded(ctx context.Context, event RefundEvent)
}
```

**Implementations:**
- `NoopNotifier`: Discards all events (when callbacks disabled)
- `RetryableClient`: Async with in-memory retries
- `PersistentCallbackClient`: Database-backed persistent delivery

### SendOnce Utility

```go
func SendOnce(ctx context.Context, cfg config.CallbacksConfig, event PaymentEvent) error
```

One-shot webhook sender for CLI tools, migrations, and testing. Sends immediately without retries.

---

## Event Types

### PaymentEvent

```go
type PaymentEvent struct {
    EventID            string            `json:"eventId"`
    EventType          string            `json:"eventType"`
    EventTimestamp     time.Time         `json:"eventTimestamp"`
    ResourceID         string            `json:"resource"`
    Method             string            `json:"method"`
    StripeSessionID    string            `json:"stripeSessionId,omitempty"`
    StripeCustomer     string            `json:"stripeCustomer,omitempty"`
    FiatAmountCents    int64             `json:"fiatAmountCents,omitempty"`
    FiatCurrency       string            `json:"fiatCurrency,omitempty"`
    CryptoAtomicAmount int64             `json:"cryptoAtomicAmount,omitempty"`
    CryptoToken        string            `json:"cryptoToken,omitempty"`
    Wallet             string            `json:"wallet,omitempty"`
    ProofSignature     string            `json:"proofSignature,omitempty"`
    Metadata           map[string]string `json:"metadata,omitempty"`
    PaidAt             time.Time         `json:"paidAt"`
}
```

### RefundEvent

```go
type RefundEvent struct {
    EventID            string            `json:"eventId"`
    EventType          string            `json:"eventType"`
    EventTimestamp     time.Time         `json:"eventTimestamp"`
    RefundID           string            `json:"refundId"`
    OriginalPurchaseID string            `json:"originalPurchaseId"`
    RecipientWallet    string            `json:"recipientWallet"`
    AtomicAmount       int64             `json:"atomicAmount"`
    Token              string            `json:"token"`
    ProcessedBy        string            `json:"processedBy"`
    Signature          string            `json:"signature"`
    Reason             string            `json:"reason,omitempty"`
    Metadata           map[string]string `json:"metadata,omitempty"`
    RefundedAt         time.Time         `json:"refundedAt"`
}
```

---

## Event ID Generation

```go
func generateEventID() string {
    randomBytes := make([]byte, 12)
    if _, err := rand.Read(randomBytes); err != nil {
        return fmt.Sprintf("evt_%d", time.Now().UnixNano())
    }
    return "evt_" + hex.EncodeToString(randomBytes)
}
```

**Format:** `evt_` + 24 hex characters (12 random bytes)

**Fallback:** `evt_` + Unix nanoseconds (if crypto/rand fails)

---

## Event Preparation

### PreparePaymentEvent

```go
func PreparePaymentEvent(event *PaymentEvent) {
    if event.EventID == "" {
        event.EventID = generateEventID()
    }
    if event.EventType == "" {
        event.EventType = "payment.succeeded"
    }
    if event.EventTimestamp.IsZero() {
        event.EventTimestamp = time.Now().UTC()
    }
    if event.PaidAt.IsZero() {
        event.PaidAt = time.Now().UTC()
    }
}
```

**Critical:** Calling multiple times preserves EventID (idempotency key).

---

## Retry Configuration

```go
type RetryConfig struct {
    MaxAttempts     int           // Default: 5
    InitialInterval time.Duration // Default: 1s
    MaxInterval     time.Duration // Default: 5m
    Multiplier      float64       // Default: 2.0
    Timeout         time.Duration // Default: 10s
}
```

### Exponential Backoff Algorithm

```
Attempt 1: Immediate
Attempt 2: Wait InitialInterval
Attempt 3: Wait InitialInterval × Multiplier
Attempt 4: Wait InitialInterval × Multiplier² (capped at MaxInterval)
...
```

**Example (default config):**
- Attempt 1: 0s (immediate)
- Attempt 2: 1s delay
- Attempt 3: 2s delay
- Attempt 4: 4s delay
- Attempt 5: 8s delay

---

## YAML Configuration

```yaml
callbacks:
  payment_success_url: "https://api.example.com/webhooks/payment"
  headers:
    Authorization: "Bearer secret_token"
    X-Custom-Header: "value"
  timeout: 10s
  retry:
    enabled: true
    max_attempts: 5
    initial_interval: 1s
    max_interval: 5m
    multiplier: 2.0
  dlq_enabled: true
  dlq_path: "./data/webhook-dlq.json"
```

---

## RetryableClient (In-Memory)

### Constructor

```go
func NewRetryableClient(cfg config.CallbacksConfig, opts ...RetryOption) Notifier
```

**Options:**
```go
WithRetryLogger(logger zerolog.Logger)
WithDLQStore(store DLQStore)
WithRetryConfig(cfg RetryConfig)
WithMetrics(metrics *metrics.Metrics)
```

### PaymentSucceeded Method

```go
func (c *RetryableClient) PaymentSucceeded(ctx context.Context, event PaymentEvent) {
    PreparePaymentEvent(&event)  // Prepare idempotency fields
    go func() {                   // Async goroutine
        payload := c.serialize(event)
        if err := c.sendWithRetry(ctx, payload); err != nil {
            c.saveToDLQ(ctx, payload, "payment", err)
        }
    }()
}
```

### HTTP Delivery

```go
func (c *RetryableClient) sendHTTP(ctx context.Context, payload []byte) error
```

**Behavior:**
- Status < 400 = success
- Status >= 400 = retry
- Network error = retry
- Content-Type: application/json (default)

---

## PersistentCallbackClient (Database-Backed)

### Constructor

```go
func NewPersistentCallbackClient(opts PersistentCallbackOptions) *PersistentCallbackClient
```

**Options:**
```go
type PersistentCallbackOptions struct {
    Store       storage.Store
    Config      config.CallbacksConfig
    RetryConfig RetryConfig
    Logger      zerolog.Logger
    Metrics     *metrics.Metrics
}
```

### Lifecycle Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `Start` | `func (c *PersistentCallbackClient) Start()` | Begin background worker |
| `Close` | `func (c *PersistentCallbackClient) Close()` | Graceful shutdown |

### Behavior

- Enqueues webhooks to database
- Worker polls every 5 seconds
- Processes up to 10 webhooks per cycle
- Survives server restarts
- **Must call `Close()` on shutdown** to stop the worker goroutine cleanly

---

## Webhook Queue Worker

### Structure

```go
type WebhookQueueWorker struct {
    store        storage.Store
    pollInterval time.Duration  // Default: 5s
    // ...
}
```

### Public Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `Start` | `func (w *WebhookQueueWorker) Start()` | Begin background processing loop |
| `Stop` | `func (w *WebhookQueueWorker) Stop()` | Graceful shutdown |
| `EnqueuePaymentWebhook` | `func (w *WebhookQueueWorker) EnqueuePaymentWebhook(ctx context.Context, event PaymentEvent) error` | Add payment webhook to queue |
| `EnqueueRefundWebhook` | `func (w *WebhookQueueWorker) EnqueueRefundWebhook(ctx context.Context, event RefundEvent) error` | Add refund webhook to queue |

### Worker Loop

```go
func (w *WebhookQueueWorker) run(ctx context.Context) {
    ticker := time.NewTicker(w.pollInterval)
    for {
        select {
        case <-w.stopChan:
            return
        case <-ticker.C:
            w.processQueue(ctx)
        }
    }
}
```

### Processing Flow

1. Poll every 5 seconds
2. Dequeue up to 10 pending webhooks
3. For each webhook:
   - Mark as processing
   - Increment attempt counter
   - Send HTTP request
   - On success: Remove from queue
   - On failure: Calculate backoff, schedule retry

---

## Pending Webhook Model

```go
type PendingWebhook struct {
    ID            string
    URL           string
    Payload       json.RawMessage
    Headers       map[string]string
    EventType     string
    Status        WebhookStatus
    Attempts      int
    MaxAttempts   int
    LastError     string
    LastAttemptAt time.Time
    NextAttemptAt time.Time
    CreatedAt     time.Time
    CompletedAt   *time.Time
}

type WebhookStatus string
const (
    WebhookStatusPending    = "pending"
    WebhookStatusProcessing = "processing"
    WebhookStatusFailed     = "failed"
    WebhookStatusSuccess    = "success"
)
```

---

## Storage Interface

```go
// Core operations
EnqueueWebhook(ctx, webhook) (string, error)
DequeueWebhooks(ctx, limit int) ([]PendingWebhook, error)
MarkWebhookProcessing(ctx, webhookID string) error
MarkWebhookSuccess(ctx, webhookID string) error
MarkWebhookFailed(ctx, webhookID, errorMsg string, nextAttemptAt time.Time) error

// Admin operations
GetWebhook(ctx, webhookID string) (PendingWebhook, error)
ListWebhooks(ctx, status WebhookStatus, limit int) ([]PendingWebhook, error)
RetryWebhook(ctx, webhookID string) error
DeleteWebhook(ctx, webhookID string) error
```

---

## Database Schema

```sql
CREATE TABLE webhook_queue (
    id                VARCHAR PRIMARY KEY,
    url               VARCHAR NOT NULL,
    payload           JSONB NOT NULL,
    headers           JSONB NOT NULL,
    event_type        VARCHAR NOT NULL,
    status            VARCHAR NOT NULL,
    attempts          INTEGER NOT NULL DEFAULT 0,
    max_attempts      INTEGER NOT NULL DEFAULT 5,
    last_error        TEXT,
    last_attempt_at   TIMESTAMP,
    next_attempt_at   TIMESTAMP NOT NULL,
    created_at        TIMESTAMP NOT NULL,
    completed_at      TIMESTAMP
);

CREATE INDEX idx_webhook_queue_status_next_attempt
    ON webhook_queue(status, next_attempt_at);
CREATE INDEX idx_webhook_queue_created_at
    ON webhook_queue(created_at DESC);
```

---

## Dead Letter Queue (DLQ)

### DLQStore Interface

```go
type DLQStore interface {
    SaveFailedWebhook(ctx context.Context, webhook FailedWebhook) error
    ListFailedWebhooks(ctx context.Context, limit int) ([]FailedWebhook, error)
    DeleteFailedWebhook(ctx context.Context, id string) error
}
```

### FailedWebhook Model

```go
type FailedWebhook struct {
    ID          string
    URL         string
    Payload     json.RawMessage
    Headers     map[string]string
    EventType   string
    Attempts    int
    LastError   string
    LastAttempt time.Time
    CreatedAt   time.Time
}
```

### Implementations

| Implementation | Persistence | Use Case |
|----------------|-------------|----------|
| NoopDLQStore | None | DLQ disabled |
| MemoryDLQStore | In-memory | Testing |
| FileDLQStore | JSON file | Simple deployments |

---

## Admin Endpoints

### List Webhooks

```
GET /admin/webhooks?status=pending&limit=100
```

**Response:**
```json
{
    "webhooks": [...],
    "count": 42
}
```

### Get Webhook

```
GET /admin/webhooks/{id}
```

### Retry Webhook

```
POST /admin/webhooks/{id}/retry
```

Resets status to pending with immediate next_attempt_at.

### Delete Webhook

```
DELETE /admin/webhooks/{id}
```

---

## Webhook Consumer Requirements

Consumers MUST:

1. Accept POST requests with `Content-Type: application/json`
2. Parse JSON payload
3. **Check EventID for idempotency**
4. If EventID seen: Return 200 OK immediately
5. If EventID new: Process, store EventID, return 200 OK
6. Respond within timeout (default: 10 seconds)
7. Return status < 400 on success
8. Return status >= 400 to trigger retry

**Response Requirements:**

| Status Code | Meaning | Cedros Behavior |
|-------------|---------|-----------------|
| 200-299 | Success | Stop retrying |
| 300-399 | Redirect | Treat as failure, retry |
| 400-499 | Client error | Retry (may be transient) |
| 500-599 | Server error | Retry |
| No response | Timeout | Retry |

**Timeout Behavior:**
- Default timeout: 10 seconds (configurable via `callbacks.timeout`)
- Connection timeout: 5 seconds
- If endpoint doesn't respond within timeout: Treat as failure, retry

**Required Headers in Request:**
```
Content-Type: application/json
X-Cedros-Event-Type: payment.succeeded
X-Cedros-Delivery-ID: unique-delivery-id
X-Cedros-Signature: sha256={hex-encoded-signature} (if configured)
X-Cedros-Timestamp: Unix timestamp of request
```

---

## Webhook Signature Verification

If `callbacks.hmac_secret` is configured, all webhooks are signed.

### Signature Format

Header: `X-Cedros-Signature: sha256=abc123def456...`

The signature is HMAC-SHA256 of the request body, hex-encoded.

### Verification Algorithm

```go
// Pseudo-code for consumer verification
func verifySignature(body []byte, signatureHeader, secret string) bool {
    // 1. Parse signature header
    parts := strings.SplitN(signatureHeader, "=", 2)
    if len(parts) != 2 || parts[0] != "sha256" {
        return false
    }
    receivedSig := parts[1]

    // 2. Compute expected signature
    mac := hmac.New(sha256.New, []byte(secret))
    mac.Write(body)
    expectedSig := hex.EncodeToString(mac.Sum(nil))

    // 3. Constant-time comparison
    return hmac.Equal([]byte(receivedSig), []byte(expectedSig))
}
```

### Timestamp Validation (Optional)

The `X-Cedros-Timestamp` header contains Unix seconds when the webhook was generated.

```go
// Reject webhooks older than 5 minutes
timestamp := parseTimestamp(headers["X-Cedros-Timestamp"])
if time.Now().Unix() - timestamp > 300 {
    return errors.New("webhook too old")
}
```

### Configuration

```yaml
callbacks:
  hmac_secret: "your-secret-key-here"  # If set, signatures enabled
```

**Security Notes:**
- Keep HMAC secret secure (never commit to repo)
- Minimum secret length: 32 characters recommended
- Rotate secret periodically
- Always verify signature before processing webhook

**Idempotency Example:**
```go
func handleWebhook(w http.ResponseWriter, r *http.Request) {
    var event PaymentEvent
    json.NewDecoder(r.Body).Decode(&event)

    if isSeen(event.EventID) {
        w.WriteHeader(200)
        return
    }

    processPayment(event)
    markSeen(event.EventID)
    w.WriteHeader(200)
}
```

**Idempotency Storage:**
- Store EventID with TTL of at least 7 days
- EventID format: `evt_` + 24 hex characters
- Use database or Redis for durability

---

## Failure Scenarios

### Webhook Endpoint Down

**RetryableClient:**
1. Retries with backoff (1s, 2s, 4s, 8s, 16s...)
2. After max attempts: Saves to DLQ
3. **Data lost on server restart**

**PersistentCallbackClient:**
1. Retries with backoff
2. After max attempts: Status=failed in DB
3. **Data survives restarts**
4. Admin can manually retry

### Server Restart

| Client | Behavior |
|--------|----------|
| RetryableClient | In-flight webhooks lost |
| PersistentCallbackClient | Resumes from database |

---

## Metrics Tracked

```go
ObserveWebhook(eventType, status, duration, attempt, dlqFlag)
```

| Field | Values |
|-------|--------|
| eventType | "payment", "refund" |
| status | "success", "failed", "dlq" |
| duration | Time from first to last attempt |
| attempt | Which attempt succeeded |
| dlqFlag | Whether saved to DLQ |

---

## Recommended Configuration

### High-Volume (100+ webhooks/min)

```yaml
callbacks:
  backend: postgres
  retry:
    max_attempts: 7
    initial_interval: 500ms
    max_interval: 2m
    multiplier: 1.5
  poll_interval: 2s
```

### Low-Volume (< 10 webhooks/min)

```yaml
callbacks:
  backend: memory
  retry:
    max_attempts: 5
    initial_interval: 1s
  dlq_enabled: true
```

### Production with SLA

```yaml
callbacks:
  backend: postgres
  dlq_enabled: true
  retry:
    max_attempts: 7
    initial_interval: 250ms
    max_interval: 10m
  poll_interval: 1s
```

