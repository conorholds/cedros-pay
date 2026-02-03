# Cedros Pay Server - Configuration

52 environment variables + YAML-only settings.

---

## Configuration Loading

- [ ] YAML file loading (configs/*.yaml)
- [ ] Environment variable overrides (mixed prefix - see notes below)
- [ ] Nested key support (CEDROS_SERVER_ADDRESS)
- [ ] Default values for all optional fields
- [ ] Validation on startup

**Important:** Environment variables use mixed naming conventions:
- Most use `CEDROS_` prefix (Server, Stripe, X402, API Key, Paywall)
- Some use no prefix (Storage, Coupons, Callbacks, Monitoring)
- Server wallets use `X402_SERVER_WALLET_*` (no CEDROS prefix)
- Dynamic variables use `*` suffix patterns (e.g., `CALLBACK_HEADER_*`)

**Configuration Hierarchy (lowest to highest priority):**
1. YAML config file (loaded first)
2. Environment variables (override YAML values)
3. Defaults (applied if neither YAML nor env var provided)

---

## Server Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `CEDROS_SERVER_ADDRESS` | `:8080` | HTTP listen address |
| `CEDROS_SERVER_PUBLIC_URL` | `` | Public base URL for discovery responses |
| `CEDROS_ROUTE_PREFIX` | `` | API route prefix (auto-normalized with leading /) |
| `CEDROS_ADMIN_METRICS_API_KEY` | `` | Metrics endpoint auth key |
| `CORS_ALLOWED_ORIGINS` | `` | CORS origins (comma-separated) |

**Metrics API Key Authentication:**
If `CEDROS_ADMIN_METRICS_API_KEY` is set:
- The `/metrics` endpoint requires authentication
- Client must send `X-API-Key` header with the configured key
- Invalid or missing key returns HTTP 401 Unauthorized
- If not set, `/metrics` is publicly accessible

**Note:** ReadTimeout, WriteTimeout, IdleTimeout are YAML-only (no env override).

---

## Stripe Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `CEDROS_STRIPE_SECRET_KEY` | `` | Stripe API secret |
| `CEDROS_STRIPE_WEBHOOK_SECRET` | `` | Webhook signature key |
| `CEDROS_STRIPE_PUBLISHABLE_KEY` | `` | Public key |
| `CEDROS_STRIPE_SUCCESS_URL` | `` | Checkout success redirect |
| `CEDROS_STRIPE_CANCEL_URL` | `` | Checkout cancel redirect |
| `CEDROS_STRIPE_TAX_RATE_ID` | `` | Tax rate ID |
| `CEDROS_STRIPE_MODE` | `test` | "test" or "live" |

---

## x402 / Solana Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `CEDROS_X402_PAYMENT_ADDRESS` | `` | Receiving wallet |
| `CEDROS_X402_TOKEN_MINT` | `` | Token contract |
| `CEDROS_X402_NETWORK` | `mainnet-beta` | Solana network |
| `CEDROS_X402_RPC_URL` | `` | RPC endpoint |
| `CEDROS_X402_WS_URL` | `` | WebSocket endpoint (auto-derived from RPC if not set) |
| `CEDROS_X402_MEMO_PREFIX` | `cedros` | Transaction memo prefix |
| `CEDROS_X402_SKIP_PREFLIGHT` | `false` | Skip preflight checks |
| `CEDROS_X402_COMMITMENT` | `confirmed` | Confirmation level |
| `CEDROS_X402_GASLESS_ENABLED` | `false` | Enable gasless txs |
| `CEDROS_X402_AUTO_CREATE_TOKEN_ACCOUNT` | `false` | Auto-create accounts |
| `X402_SERVER_WALLET_1` | `` | Server wallet private key (base58) |
| `X402_SERVER_WALLET_2` | `` | Additional server wallet |
| `X402_SERVER_WALLET_N` | `` | Up to 100 wallets supported |

**Note:** Server wallet keys use `X402_SERVER_WALLET_*` without CEDROS prefix. Keys are loaded sequentially until a gap is found.

### YAML-only x402 Settings

```yaml
x402:
  token_decimals: 6               # Token decimal places
  allowed_tokens: ["USDC"]        # Accepted token symbols
  tx_queue_min_time_between: "100ms"   # Rate limit between sends
  tx_queue_max_in_flight: 10      # Max concurrent tx waiting confirmation
  compute_unit_limit: 200000      # Compute units per tx
  compute_unit_price_micro_lamports: 1  # Priority fee
  rounding_mode: "standard"       # "standard" or "ceiling"
```

---

## Storage Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `POSTGRES_URL` | `` | PostgreSQL connection URL |
| `MONGODB_URL` | `` | MongoDB connection URL |
| `MONGODB_DATABASE` | `` | MongoDB database name |

**Note:** Storage backend is inferred from which URL is set. Pool settings, TTLs, and cleanup intervals are YAML-only.

### YAML-only Storage Settings

```yaml
storage:
  backend: "postgres"           # "memory", "postgres", "mongodb", "file"
  postgres_pool:
    max_open_conns: 25          # Max open connections
    max_idle_conns: 5           # Max idle connections
    conn_max_lifetime: "5m"     # Connection max lifetime
  cart_quote_ttl: "15m"         # Cart quote expiry
  refund_quote_ttl: "15m"       # Refund quote expiry
  # Note: nonce_ttl is HARDCODED to 5 minutes (not configurable)
  schema_mapping:               # Custom table/collection names
    payments:
      table_name: "payment_transactions"
    products:
      table_name: "products"
    coupons:
      table_name: "coupons"
```

---

## Rate Limiting Configuration

**Note:** Rate limiting is YAML-only (no environment variable overrides).

YAML structure:
```yaml
rate_limit:
  global:
    enabled: true
    limit: 1000
    window: "1m"
  per_wallet:
    enabled: true
    limit: 60
    window: "1m"
  per_ip:
    enabled: true
    limit: 120
    window: "1m"
```

---

## Callback Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `CALLBACK_PAYMENT_SUCCESS_URL` | `` | Payment webhook URL |
| `CALLBACK_TIMEOUT` | `3s` | HTTP request timeout |
| `CALLBACK_HEADER_*` | `` | Custom headers (e.g., `CALLBACK_HEADER_AUTHORIZATION`) |

### YAML-only Callback Settings

```yaml
callbacks:
  payment_success_url: "https://api.example.com/webhooks/payment"
  headers:
    Authorization: "Bearer secret_token"
  timeout: "10s"
  retry:
    enabled: true
    max_attempts: 5
    initial_interval: "1s"
    max_interval: "5m"
    multiplier: 2.0
  dlq_enabled: true
  dlq_path: "./data/webhook-dlq.json"
```

---

## Paywall Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `CEDROS_PAYWALL_QUOTE_TTL` | `5m` | Quote validity period |
| `CEDROS_PAYWALL_PRODUCT_SOURCE` | (from storage.backend) | "yaml", "postgres", "mongodb" |
| `CEDROS_PAYWALL_PRODUCT_CACHE_TTL` | `5m` | Product cache duration |
| `CEDROS_PAYWALL_POSTGRES_URL` | (from storage) | PostgreSQL connection |
| `CEDROS_PAYWALL_MONGODB_URL` | (from storage) | MongoDB connection |
| `CEDROS_PAYWALL_MONGODB_DATABASE` | (from storage) | MongoDB database |
| `CEDROS_PAYWALL_MONGODB_COLLECTION` | `products` | MongoDB collection |

---

## Coupon Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `COUPON_SOURCE` | (from storage) | "yaml", "postgres", "mongodb", "disabled" |
| `COUPON_CACHE_TTL` | `1m` | Coupon cache duration |
| `COUPON_POSTGRES_URL` | (from storage) | PostgreSQL connection |
| `COUPON_MONGODB_URL` | (from storage) | MongoDB connection |
| `COUPON_MONGODB_DATABASE` | (from storage) | MongoDB database |
| `COUPON_MONGODB_COLLECTION` | `coupons` | MongoDB collection |

---

## Subscription Configuration

**Note:** Subscription settings are YAML-only (no environment variable overrides).

YAML structure:
```yaml
subscriptions:
  enabled: false
  backend: "memory"  # or "postgres"
  postgres_url: ""   # from storage if not set
  grace_period_hours: 0
```

---

## API Key Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `CEDROS_API_KEY_ENABLED` | `false` | Enable API key auth |
| `CEDROS_API_KEY_*` | `` | API keys with tier (env parsing supports `TIER:key` only; tenant allowlist is YAML-only) |

### API Key Tiers

| Tier | Description |
|------|-------------|
| `free` | Standard rate limits |
| `pro` | Standard limits (higher limits planned) |
| `enterprise` | Bypass wallet/IP limits, respects global |
| `partner` | Bypass per-IP and per-wallet limits; global limit still applies |

### Tenant Allowlist (YAML-only)

API keys can be bound to one or more tenants via YAML to prevent cross-tenant access.

Example:
```yaml
api_key:
  enabled: true
  keys:
    - key: "my-key"
      tier: "partner"
      allowed_tenants: ["tenant-a", "tenant-b"]
```

---

## Monitoring Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `MONITORING_LOW_BALANCE_ALERT_URL` | `` | Alert webhook URL |
| `MONITORING_LOW_BALANCE_THRESHOLD` | `0.01` | SOL threshold |
| `MONITORING_CHECK_INTERVAL` | `15m` | Check frequency |
| `MONITORING_TIMEOUT` | `5s` | Alert HTTP timeout |
| `MONITORING_HEADER_*` | `` | Custom headers (e.g., `MONITORING_HEADER_AUTHORIZATION`) |

---

## Circuit Breaker Configuration

**Note:** Circuit breaker settings are YAML-only (no environment variable overrides).

YAML structure:
```yaml
circuit_breaker:
  enabled: true
  solana_rpc:
    max_requests: 3           # Half-open max requests
    interval: "60s"           # Stats reset interval
    timeout: "30s"            # Open state timeout
    consecutive_failures: 5   # Failures to trip
    failure_ratio: 0.5        # Ratio to trip
    min_requests: 10          # Min before checking ratio
  stripe_api:
    # Same structure
  webhook:
    # Same structure
```

---

## Logging Configuration

**Note:** Logging settings are YAML-only (no environment variable overrides).

YAML structure:
```yaml
logging:
  level: "info"        # "debug", "info", "warn", "error"
  format: "json"       # "json" or "console"
  environment: "production"  # Affects log output
```

---

## Storage Archival Configuration

**Note:** Archival settings are YAML-only (no environment variable overrides).

YAML structure:
```yaml
storage:
  archival:
    enabled: false
    retention_period: "2160h"  # 90 days
    run_interval: "24h"
```
