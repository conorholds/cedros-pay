# Cedros Pay Server - Specification Documents

**Purpose:** These specification documents provide comprehensive requirements for implementing Cedros Pay Server in any language (Rust, TypeScript, Python, etc.) with full feature parity to the Go reference implementation.

**Reference Implementation:** Go (this repository)

---

## Document Index

| # | Document | Description | Lines |
|---|----------|-------------|-------|
| 01 | [01-overview.md](./01-overview.md) | Architecture, package structure, embedded library pattern, startup sequence | ~200 |
| 02 | [02-http-endpoints.md](./02-http-endpoints.md) | Core HTTP endpoints (health, paywall, stripe, gasless) | ~455 |
| 03 | [03-http-endpoints-subscriptions.md](./03-http-endpoints-subscriptions.md) | Subscription, admin, and webhook endpoints | ~245 |
| 04 | [04-http-endpoints-refunds.md](./04-http-endpoints-refunds.md) | Refund processing and product catalog endpoints | ~200 |
| 05 | [05-data-models.md](./05-data-models.md) | Core data models (config, payment, x402, product, coupon, money) | ~360 |
| 06 | [06-data-models-storage.md](./06-data-models-storage.md) | Storage, callback, Stripe, and Solana integration models | ~360 |
| 07 | [07-payment-processing.md](./07-payment-processing.md) | x402 and Stripe payment flows, verification steps, subscription management | ~275 |
| 08 | [08-storage.md](./08-storage.md) | Storage interfaces, 50+ methods, database schema for 9 tables | ~380 |
| 09 | [09-configuration.md](./09-configuration.md) | 52 env vars + YAML-only settings with complete examples | ~280 |
| 10 | [10-middleware.md](./10-middleware.md) | 11 middleware components, chain order, security headers | ~200 |
| 11 | [11-background-workers.md](./11-background-workers.md) | 6 background workers: webhook, monitoring, cleanup, tx queue, wallet health, archival | ~210 |
| 12 | [12-integrations.md](./12-integrations.md) | Stripe client (14 methods), Solana RPC, circuit breaker pattern | ~265 |
| 13 | [13-security.md](./13-security.md) | Replay protection, rate limiting, Ed25519 signatures, multi-tenancy | ~255 |
| 14 | [14-observability.md](./14-observability.md) | Structured logging, Prometheus metrics, health checks, hooks | ~270 |
| 15 | [15-errors.md](./15-errors.md) | 47 error codes, user-friendly messages, smart error detection | ~235 |
| 16 | [16-formats.md](./16-formats.md) | ID generation, JSON conventions, date/amount formats | ~250 |
| 17 | [17-validation.md](./17-validation.md) | Complete input validation rules for all endpoints | ~225 |
| 18 | [18-services-subscriptions.md](./18-services-subscriptions.md) | Subscription service: 18 methods, status transitions, grace periods | ~340 |
| 19 | [19-services-paywall.md](./19-services-paywall.md) | Paywall service: quote generation, authorization, coupon stacking, Money type | ~360 |
| 20 | [20-webhooks.md](./20-webhooks.md) | Webhook system: event types, retry logic, DLQ, persistent queue worker | ~320 |
| 21 | [21-stripe-client.md](./21-stripe-client.md) | Stripe client: checkout, subscriptions, webhooks, cart service | ~280 |
| 22 | [22-x402-verifier.md](./22-x402-verifier.md) | x402 verifier: SolanaVerifier, TransactionQueue, WalletHealthChecker, gasless | ~400 |
| 23 | [23-repositories.md](./23-repositories.md) | Product & coupon repositories: models, backends, caching, selection logic | ~350 |
| 24 | [24-orders-fulfillment.md](./24-orders-fulfillment.md) | Orders, fulfillment, inventory reservations (Phase 1 plan) | ~230 |

---

## Quick Stats

| Category | Count |
|----------|-------|
| HTTP Endpoints | 33 registered + 4 optional admin + 2 internal |
| Data Models | 75+ structs/types |
| Database Tables | 9 core tables |
| Configuration Options | 52 env vars + YAML-only settings |
| Error Codes | 49 error codes (47 exported + 3 internal) |
| Middleware Components | 11 (9 global + 2 route-specific) |
| Background Workers | 6 |
| Storage Backends | 4 (PostgreSQL, MongoDB, File, Memory) |

---

## Implementation Priority

For a minimum viable implementation, focus on these documents in order:

1. **[01-overview.md](./01-overview.md)** - Understand architecture
2. **[09-configuration.md](./09-configuration.md)** - Setup configuration loading
3. **[05-data-models.md](./05-data-models.md)** - Define core types
4. **[08-storage.md](./08-storage.md)** - Implement storage layer
5. **[19-services-paywall.md](./19-services-paywall.md)** - Paywall service (quote, authorize, coupons)
6. **[21-stripe-client.md](./21-stripe-client.md)** - Stripe integration
7. **[07-payment-processing.md](./07-payment-processing.md)** - Payment flows
8. **[02-http-endpoints.md](./02-http-endpoints.md)** - HTTP handlers
9. **[15-errors.md](./15-errors.md)** - Error handling
10. **[10-middleware.md](./10-middleware.md)** - Add middleware
11. **[18-services-subscriptions.md](./18-services-subscriptions.md)** - Subscription service
12. **[20-webhooks.md](./20-webhooks.md)** - Webhook delivery system
13. **[12-integrations.md](./12-integrations.md)** - External services
14. **[13-security.md](./13-security.md)** - Security features
15. **[11-background-workers.md](./11-background-workers.md)** - Background jobs
16. **[14-observability.md](./14-observability.md)** - Monitoring

---

## Key Implementation Notes

### JSON Field Names

All JSON field names use **camelCase** and must match exactly for UI compatibility:
- `resourceId` not `resource_id`
- `customerEmail` not `customer_email`
- `stripePriceId` not `stripe_price_id`

**Optional fields handling:**
- Fields marked "Optional" can be omitted; the server provides defaults
- Some optional fields use `omitempty` - they are omitted when empty/zero rather than set to null

### Atomic Units

All monetary amounts are stored as **int64 atomic units**:
- USD: 2 decimals ($10.50 = 1050 cents)
- USDC/USDT: 6 decimals (1.5 USDC = 1,500,000 atomic)
- SOL: 9 decimals (0.5 SOL = 500,000,000 lamports)

Never use float64 for money internally - only at API boundaries.

### Replay Protection

Transaction signatures are **globally unique**. A signature used for any resource cannot be reused for any other resource.

### Resource Types

The `resourceType` field in x402 payloads determines routing:
- `"regular"` → single product
- `"cart"` → multi-item cart
- `"refund"` → refund execution

---

## Version History

| Version | Date | Summary |
|---------|------|---------|
| 1.0 | 2025-12-01 | Initial requirements document |
| 1.1-1.4 | 2025-12-01 | Multiple audits adding endpoints, models, interfaces |
| 1.5 | 2025-12-01 | Comprehensive audit with wallet health, tx queue, helpers |
| 2.0 | 2025-12-01 | Split into modular spec documents |
| 2.1 | 2025-12-01 | Renumbered to clean sequential 01-15, fixed cross-references |
| 2.2 | 2025-12-01 | Comprehensive codebase audit: verified 34 endpoints, 47 error codes, 52 env vars |
| 2.3 | 2025-12-01 | Added ID formats, JSON conventions, validation rules, Stripe webhook events |
| 2.4 | 2025-12-01 | Added service method specs: subscription (18 methods), paywall (43 methods), webhook system, Stripe client |
| 2.5 | 2025-12-01 | Audit fixes: x402 verifier spec (22), repositories spec (23), corrected HTTP response formats, YAML config examples |
| 2.6 | 2025-12-01 | Final verification: confirmed all service methods, enum values, data models documented |
| 2.7 | 2025-12-01 | Comprehensive audit: fixed 33 endpoint count, health response format, subscription quote fields, added paywall helper methods, TransactionQueue API, webhook worker methods, admin nonce Purpose field, subscription getter methods, RefundQuote model alignment |
| 2.8 | 2025-12-01 | Clarified ambiguous logic: coupon stacking order, USD-pegged asset equivalence, fixed discount floor at zero, amount tolerance (1e-9 for x402, 1e-6 for cart), RoundUpToCents behavior, grace period x402-only, cart mixed-token validation |
| 2.9 | 2025-12-01 | Comprehensive code audit: verified 33 endpoints, 50+ service methods, 49 error codes, all storage interfaces, x402 verifier components. Fixed nonce_ttl documentation (hardcoded 5m). 98% spec compliance confirmed. |
| 2.10 | 2025-12-01 | Fixed x402 verifier constants to match pkg/x402/constants.go: BlockhashValidityWindow=90s, RPCPollInterval=2s, DefaultConfirmationTimeout=2min, DefaultAccessTTL=45min, AmountTolerance=1e-9. Clarified WebSocket subscription is primary, RPC polling is fallback only. |
| 2.11 | 2025-12-02 | Documented BlockhashValidityWindow design tradeoff: time-based (90s) vs slot-based (`lastValidBlockHeight`). Go uses time-based to reduce RPC calls; implementers may choose slot-based for accuracy. |
| 2.12 | 2025-12-02 | Clarified ambiguous implementation details: coupon usage increment timing (after payment, non-fatal), cart vs single-product amount tolerance differences, idempotency store implementation, cart quote expiration behavior, server wallet selection algorithm, partial failure handling policy. |
| 2.13 | 2025-12-02 | Comprehensive audit fixes: corrected /refunds/deny response format, fixed /nonce expiresAt to Unix timestamp, added PreviewProration() method, PersistentCallbackClient Close() method, corrected return types (ResourceDefinition, GetPayment), clarified RefundQuote status inference, documented internal error codes (server_insufficient_funds, send_failed, send_failed_after_account_creation). |
| 2.14 | 2025-12-02 | **Cross-language implementation support:** Added Solana transaction format spec (bincode, instruction order, signer arrangement, TransferChecked parsing), amount conversion algorithms (FromMajor/ToMajor with ceiling rounding), ATA derivation with validation rules, memo interpolation edge cases (max length, truncation), subscription period calculation examples (month-end handling), nonce purpose enforcement rules, Stripe webhook timestamp validation (5-min tolerance), idempotency store interface. These additions enable complete Rust/TypeScript/Python implementations without consulting Go source. |
| 2.15 | 2025-12-02 | **Complete implementation spec (final):** Cart quote expiration behavior (checked at verification, not lookup), coupon usage increment race condition handling (post-payment, non-fatal), server wallet selection algorithm (round-robin with health awareness, fallback behavior), transaction retry policy (by error type with backoffs), amount tolerance semantics (1e-9 single, 1e-6 cart, exact refund), x402 subscription renewal workflow (manual, no auto-renewal), grace period scope (x402 only), webhook consumer requirements (timeout, idempotency), cart metadata structure (exact format), commitment level behavior (processed/confirmed/finalized), cache invalidation policy (TTL-based only), Stripe cart coupon application rules, rate limit algorithm (token bucket with pseudocode), RPC error message parsing (string patterns, SPL error codes, JSON-RPC format), admin key configuration. All gaps from comprehensive audit addressed. |
| 2.16 | 2025-12-02 | **Comprehensive audit v2:** Health response format (features array clarification, wallet truncation, summary structure), Stripe webhook event types and handler documentation, success/cancel redirect behavior, gasless transaction structure and client flow, resourceType validation rules and routing, subscription status state machine with transition rules, new error codes (subscription_not_found, nonce_not_found, mixed_tokens_in_cart, invalid_resource_type, nonce_expired, nonce_already_used, invalid_nonce_purpose), refund quote full x402 format, nonce purpose enum values, metrics API key authentication, webhook HMAC signature verification algorithm. 52 gaps from audit systematically addressed. |

---

## Testing Requirements

### Unit Tests

- [ ] Configuration parsing and validation
- [ ] Money/atomic unit conversions
- [ ] x402 payload parsing
- [ ] Signature verification
- [ ] Coupon discount calculations
- [ ] Subscription status logic
- [ ] Rate limit window calculations

### Integration Tests

- [ ] Stripe checkout flow (test mode)
- [ ] Solana transaction verification (devnet)
- [ ] Database operations (all backends)
- [ ] Webhook delivery and retry
- [ ] Cart checkout flow
- [ ] Refund flow
- [ ] Subscription lifecycle

### End-to-End Tests

- [ ] Full payment flow (Stripe)
- [ ] Full payment flow (x402)
- [ ] Gasless transaction flow
- [ ] Multi-item cart flow
- [ ] Subscription upgrade/downgrade

---

## Deployment Checklist

- [ ] Docker container support
- [ ] Docker Compose for local development
- [ ] Environment variable documentation
- [ ] Database migration scripts
- [ ] Health check endpoint
- [ ] Graceful shutdown handling
- [ ] Log aggregation support
- [ ] Metrics scraping support

---

## Critical Implementation Details

1. **Atomic Units**: All monetary amounts stored internally as atomic units (int64). Display amounts use float64 only at API boundaries.
2. **Replay Protection**: Transaction signatures are globally unique - a signature used for any resource cannot be reused for any other resource.
3. **Idempotency**: Endpoints marked with idempotency middleware deduplicate requests using the `Idempotency-Key` header (24-hour window).
4. **Resource Types**: The `resourceType` field in x402 payloads determines routing: "regular" → single product, "cart" → multi-item cart, "refund" → refund execution.
5. **Coupon Stacking**: Catalog-level coupons apply to individual items, checkout-level coupons apply to cart total. Both can stack.
