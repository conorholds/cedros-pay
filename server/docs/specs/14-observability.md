# Cedros Pay Server - Observability

Logging, metrics, and health check specifications.

---

## Structured Logging

### Requirements

- [ ] JSON output format
- [ ] Configurable log levels
- [ ] Request ID propagation
- [ ] Wallet address inclusion
- [ ] Timing information
- [ ] Error details

### Log Levels

| Level | Description |
|-------|-------------|
| debug | Detailed debugging information |
| info | Normal operational messages |
| warn | Warning conditions |
| error | Error conditions |

### Standard Fields

| Field | Description |
|-------|-------------|
| `timestamp` | ISO 8601 timestamp |
| `level` | Log level |
| `message` | Log message |
| `request_id` | Request correlation ID |
| `method` | HTTP method |
| `path` | Request path |
| `status` | Response status code |
| `duration_ms` | Request duration |
| `wallet` | User wallet (truncated) |
| `error` | Error message (if present) |

### Wallet Truncation

```go
func TruncateAddress(addr string) string {
    if len(addr) <= 8 {
        return addr
    }
    return addr[:4] + "..." + addr[len(addr)-4:]
}
// "7cVfgArCheMR6Cs4t6vz5rfnqd3CUjpT" → "7cVf...jpT"
```

---

## Prometheus Metrics

### HTTP Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `http_requests_total` | Counter | method, path, status | Total requests |
| `http_request_duration_seconds` | Histogram | method, path | Request latency |
| `http_requests_in_flight` | Gauge | - | Active requests |

### Payment Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `payments_total` | Counter | method, resource, success | Payment attempts |
| `payment_amount_cents` | Histogram | method, currency | Payment amounts |
| `payment_duration_seconds` | Histogram | method | Processing time |

### Stripe Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `stripe_api_calls_total` | Counter | operation, status | API calls |
| `stripe_api_duration_seconds` | Histogram | operation | API latency |
| `stripe_errors_total` | Counter | operation, error_type | Error counts |

### Solana Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `solana_rpc_calls_total` | Counter | method, status | RPC calls |
| `solana_rpc_duration_seconds` | Histogram | method | RPC latency |
| `solana_tx_confirmations_total` | Counter | status | Confirmation results |
| `solana_wallet_balance_sol` | Gauge | wallet | Wallet balances |

### Webhook Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `webhooks_total` | Counter | event_type, status | Webhook attempts |
| `webhook_duration_seconds` | Histogram | event_type | Delivery latency |
| `webhook_queue_size` | Gauge | status | Queue sizes |
| `webhook_dlq_size` | Gauge | - | DLQ size |

### Rate Limit Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `rate_limit_rejections_total` | Counter | type, tier | Rejections |

### Circuit Breaker Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `circuit_breaker_state` | Gauge | service | 0=closed, 1=half-open, 2=open |
| `circuit_breaker_failures_total` | Counter | service | Failure counts |

---

## Health Checks

### Endpoint

`GET /cedros-health`

### Component Checks

| Component | Check | Description |
|-----------|-------|-------------|
| Solana RPC | `getHealth` | RPC connectivity |
| Server Wallets | Balance check | SOL balance ≥ threshold |
| Database | Ping | Connection health |
| Stripe | API call | API connectivity |

### Response Structure

```json
{
  "status": "ok",
  "uptime": 3600,
  "rpcHealthy": true,
  "network": "mainnet-beta",
  "features": {
    "stripe": true,
    "x402": true,
    "gasless": true,
    "subscriptions": true
  },
  "walletHealth": {
    "wallet1": {
      "address": "7cVf...jpT",
      "balance": 0.5,
      "status": "healthy"
    }
  }
}
```

### Status Values

| Status | Description |
|--------|-------------|
| `ok` | All components healthy |
| `degraded` | Some components unhealthy |
| `error` | Critical components down |

### Wallet Health Status

| Status | Condition |
|--------|-----------|
| `healthy` | Balance ≥ MinHealthyBalance |
| `low` | Balance < MinHealthyBalance |
| `critical` | Balance ≤ CriticalBalance |

---

## Observability Hooks

### Hook Interface

```go
type PaymentHook interface {
    OnPaymentStarted(ctx context.Context, event PaymentStartedEvent)
    OnPaymentCompleted(ctx context.Context, event PaymentCompletedEvent)
    OnPaymentSettled(ctx context.Context, event PaymentSettledEvent)
}

type WebhookHook interface {
    OnWebhookQueued(ctx context.Context, event WebhookQueuedEvent)
    OnWebhookDelivered(ctx context.Context, event WebhookDeliveredEvent)
    OnWebhookFailed(ctx context.Context, event WebhookFailedEvent)
    OnWebhookRetried(ctx context.Context, event WebhookRetriedEvent)
}

type RefundHook interface {
    OnRefundRequested(ctx context.Context, event RefundRequestedEvent)
    OnRefundApproved(ctx context.Context, event RefundApprovedEvent)
    OnRefundProcessed(ctx context.Context, event RefundProcessedEvent)
}

type CartHook interface {
    OnCartCreated(ctx context.Context, event CartCreatedEvent)
    OnCartPaid(ctx context.Context, event CartPaidEvent)
}

type RPCHook interface {
    OnRPCCall(ctx context.Context, event RPCCallEvent)
}

type DatabaseHook interface {
    OnDatabaseQuery(ctx context.Context, event DatabaseQueryEvent)
}
```

### Built-in Hooks

- **PrometheusHook** - Records all metrics to Prometheus
- **LoggingHook** - Logs all events at appropriate levels

### Hook Registry

```go
registry := observability.NewRegistry()
registry.RegisterPaymentHook(prometheusHook)
registry.RegisterPaymentHook(loggingHook)
```

---

## Event Types

### Payment Events

| Event | Fields |
|-------|--------|
| PaymentStarted | ResourceID, Method, Wallet, Amount |
| PaymentCompleted | ResourceID, Method, Wallet, Amount, Duration, Success |
| PaymentSettled | ResourceID, Method, Wallet, TxHash |

### Webhook Events

| Event | Fields |
|-------|--------|
| WebhookQueued | ID, URL, EventType |
| WebhookDelivered | ID, URL, EventType, Duration |
| WebhookFailed | ID, URL, EventType, Error, Attempt |
| WebhookRetried | ID, URL, EventType, Attempt, NextAttempt |

### RPC Events

| Event | Fields |
|-------|--------|
| RPCCall | Method, Duration, Success, Error |

---

## Database Instrumentation

### Query Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `db_queries_total` | Counter | operation, table | Query counts |
| `db_query_duration_seconds` | Histogram | operation, table | Query latency |
| `db_errors_total` | Counter | operation, table, error | Error counts |
| `db_connections_open` | Gauge | - | Open connections |
| `db_connections_idle` | Gauge | - | Idle connections |

### Instrumented Operations

- SELECT, INSERT, UPDATE, DELETE
- Transaction begin/commit/rollback
- Connection acquire/release
