# Cedros Pay Server - Overview & Architecture

**Purpose:** Implementation requirements for Cedros Pay Server to ensure feature parity across languages (Rust, TypeScript, Python, etc.)

**Reference Implementation:** Go (this repository)

---

## Summary

| Category | Count |
|----------|-------|
| HTTP Endpoints | 34 registered + 4 optional admin + 1 internal |
| Data Models | 75+ structs/types |
| Database Tables | 9 core tables |
| Configuration Options | 52 env vars + YAML-only settings |
| Error Codes | 47 error codes |
| Middleware Components | 11 (9 global + 2 route-specific) |
| Background Workers | 6 (webhook, monitoring, cleanup, tx queue, wallet health, archival) |
| Storage Backends | 4 (PostgreSQL, MongoDB, File, Memory) |

**Key Features:**
- Unified Stripe + Solana/x402 payment processing
- Multi-item shopping cart with checkout
- Subscription management (Stripe + x402)
- Refund workflow with admin approval
- Gasless (server-paid fee) transactions
- Product catalog with coupon system
- Webhook delivery with retry and DLQ
- Multi-tenancy support
- Rate limiting (global, per-wallet, per-IP)
- Circuit breaker pattern for external services
- Wallet health monitoring with automatic failover
- Transaction queue with rate limiting
- Embedded library pattern for integration

---

## Package Structure

- [ ] **internal/config** - Configuration loading (YAML + env vars)
- [ ] **internal/logger** - Structured JSON logging
- [ ] **internal/metrics** - Prometheus metrics collection
- [ ] **internal/lifecycle** - Graceful shutdown management
- [ ] **internal/dbpool** - Database connection pooling
- [ ] **internal/tenant** - Multi-tenancy context
- [ ] **internal/versioning** - API version negotiation
- [ ] **internal/paywall** - Core pricing & authorization
- [ ] **internal/stripe** - Stripe API integration
- [ ] **internal/subscriptions** - Subscription lifecycle
- [ ] **pkg/x402** - x402 protocol types & constants
- [ ] **pkg/x402/solana** - Solana verification
- [ ] **pkg/cedros** - Embeddable application factory
- [ ] **internal/storage** - Payment persistence
- [ ] **internal/products** - Product catalog
- [ ] **internal/coupons** - Discount codes
- [ ] **internal/money** - Atomic unit handling
- [ ] **internal/httpserver** - HTTP router & handlers
- [ ] **internal/apikey** - API key auth middleware
- [ ] **internal/ratelimit** - Rate limiting
- [ ] **internal/idempotency** - Request deduplication
- [ ] **internal/circuitbreaker** - Circuit breaker pattern
- [ ] **internal/callbacks** - Webhook delivery
- [ ] **internal/auth** - Ed25519 signature verification
- [ ] **internal/solana** - Solana keypair handling
- [ ] **internal/rpcutil** - Solana RPC retry logic
- [ ] **internal/monitoring** - Wallet balance monitoring
- [ ] **internal/observability** - Observability hooks
- [ ] **internal/errors** - Error codes & responses
- [ ] **internal/cacheutil** - Write-through cache utilities
- [ ] **internal/httphandlers** - Admin webhook HTTP handlers
- [ ] **internal/httputil** - HTTP client utilities
- [ ] **internal/schema** - Database schema mapping
- [ ] **pkg/responders** - JSON response helpers

---

## Design Principles

- [ ] Stateless per-request payment verification
- [ ] Multi-tenant database isolation via `tenant_id`
- [ ] Atomic units for all monetary amounts (avoid floats)
- [ ] Modular backends (PostgreSQL, MongoDB, File, Memory)
- [ ] Graceful degradation via circuit breakers
- [ ] Idempotent write operations

---

## Embedded Library Pattern (pkg/cedros)

The server can be embedded as a library in existing Go applications:

**App Struct Fields:**
```
App
├── Config           *config.Config
├── Store            storage.Store
├── Verifier         x402.Verifier
├── Notifier         callbacks.Notifier
├── Paywall          *paywall.Service
├── Stripe           *stripe.Client
├── CartService      *stripe.CartService
├── Coupons          coupons.Repository
├── Subscriptions    *subscriptions.Service
├── IdempotencyStore *idempotency.MemoryStore
└── (private)
    ├── router          chi.Router
    ├── resourceManager *lifecycle.Manager
    └── metricsCollector *metrics.Metrics
```

**Functional Options:**
- `WithStore(store)` - Inject custom storage backend
- `WithNotifier(notifier)` - Inject custom webhook notifier
- `WithVerifier(verifier)` - Inject custom x402 verifier
- `WithRouter(router)` - Use existing chi.Router

**App Methods:**
- `NewApp(cfg, opts...) (*App, error)` - Create fully wired application
- `Router() chi.Router` - Get router with Cedros routes
- `Handler() http.Handler` - Get HTTP handler
- `Close() error` - Release all resources (LIFO order)

**Standalone Functions:**
- `RegisterRoutes(router, app)` - Register routes on existing router
- `NewHandler(cfg, opts...) (http.Handler, shutdownFunc, error)` - Quick setup
- `LoadConfig(path) (*Config, error)` - Load YAML configuration

---

## Server Initialization Sequence

The following sequence MUST be followed for proper startup:

```
1. Load environment (.env via godotenv)
2. Parse command line flags (-config, -version)
3. Load configuration (YAML + env overrides)
4. Initialize structured logger
5. Create signal context (SIGINT, SIGTERM)
6. Create lifecycle resource manager

7. Database Setup:
   a. Create shared PostgreSQL pool (if multiple components need it)
   b. Initialize storage backend with shared pool

8. Payment Infrastructure:
   a. Create SolanaVerifier (RPC + WebSocket clients)
   b. Setup transaction queue (if rate limiting configured)
   c. Parse server wallet keys (if gasless or auto-create enabled)
   d. Configure server wallets on verifier
   e. Enable gasless mode (if configured)
   f. Enable auto-create token accounts (if configured)
   g. Start balance monitoring (if alert URL configured)

9. Catalog Setup:
   a. Initialize base product repository
   b. Wrap with caching layer (5 minute TTL)
   c. Initialize coupon repository

10. Metrics & Callbacks:
    a. Initialize Prometheus metrics collector
    b. Initialize DLQ store (if enabled)
    c. Create callback notifier (persistent or retryable)

11. Services:
    a. Create paywall service
    b. Create Stripe client
    c. Create cart service
    d. Create idempotency store
    e. Create subscriptions service (if enabled)
    f. Wire subscription checker into paywall

12. HTTP Server:
    a. Create HTTP server with all dependencies
    b. Start listening

13. Shutdown Handling:
    a. Wait for context cancellation or error
    b. Create shutdown context (15s timeout)
    c. Shutdown HTTP server gracefully
    d. Close resource manager (LIFO order)
```

**Build-Time Variables:**
- `Version` - Set via ldflags: `-X main.Version=...`
- `BuildTime` - Set via ldflags: `-X main.BuildTime=...`

---

## Specification Documents

| Document | Description |
|----------|-------------|
| [01-overview.md](./01-overview.md) | This document - architecture and summary |
| [02-http-endpoints.md](./02-http-endpoints.md) | Core HTTP endpoints (health, paywall, stripe, gasless) |
| [03-http-endpoints-subscriptions.md](./03-http-endpoints-subscriptions.md) | Subscription, admin, and webhook endpoints |
| [04-http-endpoints-refunds.md](./04-http-endpoints-refunds.md) | Refund and product catalog endpoints |
| [05-data-models.md](./05-data-models.md) | Core data models (payment, x402, product, coupon, money) |
| [06-data-models-storage.md](./06-data-models-storage.md) | Storage, callback, Stripe, and Solana integration models |
| [07-payment-processing.md](./07-payment-processing.md) | x402 and Stripe payment flows |
| [08-storage.md](./08-storage.md) | Storage interfaces and database schema |
| [09-configuration.md](./09-configuration.md) | All configuration options |
| [10-middleware.md](./10-middleware.md) | Middleware components |
| [11-background-workers.md](./11-background-workers.md) | Background worker specifications |
| [12-integrations.md](./12-integrations.md) | Stripe and Solana integration details |
| [13-security.md](./13-security.md) | Security features and requirements |
| [14-observability.md](./14-observability.md) | Logging, metrics, and health checks |
| [15-errors.md](./15-errors.md) | Error codes and handling |
| [16-formats.md](./16-formats.md) | ID generation, JSON conventions, date/amount formats |
| [17-validation.md](./17-validation.md) | Complete input validation rules |
