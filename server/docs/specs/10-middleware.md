# Cedros Pay Server - Middleware Components

All middleware specifications.

---

## Global Middleware (All Routes)

### CORS

Configurable allowed origins.

| Setting | Value |
|---------|-------|
| Allowed methods | GET, POST, DELETE, OPTIONS |
| Allowed headers | * (all) |
| Exposed headers | Location |
| Max age | 300 seconds |
| Credentials | disabled |

### Security Headers

Applied to ALL responses:

| Header | Value | Purpose |
|--------|-------|---------|
| `X-Content-Type-Options` | `nosniff` | Prevents MIME-type sniffing |
| `X-Frame-Options` | `DENY` | Prevents clickjacking |
| `X-XSS-Protection` | `1; mode=block` | Enables browser XSS filtering |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Controls referrer leakage |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | HSTS (HTTPS only) |

### Request Logging

Structured logging with request ID.

**Logged Fields:**
- Request ID
- Method
- Path
- Status code
- Duration
- Remote IP
- User agent
- Wallet (if present)

### Request ID

Generate or propagate X-Request-ID header.

**Behavior:**
1. Check for existing `X-Request-ID` header
2. If not present, generate UUID
3. Store in context for logging
4. Include in response headers

### Real IP

Extract client IP from proxy headers.

**Priority:**
1. `X-Forwarded-For` (rightmost non-trusted hop)
2. `X-Real-IP`
3. `RemoteAddr` (fallback)

**Trusted proxy behavior:**
- Proxy headers are only trusted when the immediate peer IP is a trusted proxy.
- Trusted proxies are configured via `server.trusted_proxy_cidrs` / `CEDROS_TRUSTED_PROXY_CIDRS`.
- If no allowlist is configured, the server falls back to trusting private/loopback peers only.

### Panic Recovery

Recover from panics and return 500.

**Behavior:**
1. Catch panic
2. Log stack trace
3. Return HTTP 500 with generic error
4. Continue serving other requests

### API Version

Parse Accept header for version negotiation.

**Supported Formats:**
- `Accept: application/vnd.cedros.v1+json`
- `Accept: application/json; version=1`
- `X-API-Version: 1`

**Response Headers:**
- `X-API-Version` - Version used
- `Vary: Accept, X-API-Version`
- `Deprecation` - If version deprecated (RFC 8594)
- `Sunset` - Sunset date if applicable

### API Key Auth

Extract X-API-Key header and store tier in context.

**Behavior:**
1. Extract `X-API-Key` header
2. Validate against configured keys
3. Store tier in context
4. Apply tier-specific rate limits

### Rate Limiting

Global, per-wallet, per-IP limits with burst support.

**Rate Limit Types:**

| Type | Key | Purpose |
|------|-----|---------|
| Global | (none) | DDoS protection |
| Per-Wallet | Wallet address | Abuse prevention |
| Per-IP | Client IP | Attack prevention |

**Response Headers (on limit):**
- `Retry-After` - Seconds until reset
- `X-RateLimit-Limit` - Request limit
- `X-RateLimit-Remaining` - Requests left
- `X-RateLimit-Reset` - Unix timestamp when next token is available

**Tier Exemptions:**
- `enterprise` - Bypass wallet/IP limits
- `partner` - Bypass ALL limits

---

## Route-Specific Middleware

### Timeout

Different timeouts per route type.

| Route Type | Timeout |
|------------|---------|
| Health/Discovery | 5 seconds |
| Payments | 60 seconds |

### Idempotency

For POST endpoints that create resources.

**Protected Endpoints:**
- Stripe session creation
- Cart checkout
- Subscription operations

**Behavior:**
1. Check `Idempotency-Key` header
2. If key exists in cache, return cached response
3. Process request
4. Cache response (24-hour TTL)
5. Return with `X-Idempotency-Replay: true` if cached

**Cache Key Format:**
```
{tenant_id}:{METHOD}:{PATH}:{idempotency_key}
```

**Body mismatch behavior:**
- If the same `Idempotency-Key` is reused with a different request body, return `409 Conflict`.

**Notes:**
- Only caches 2xx responses
- 24-hour cache duration
- Uses LRU eviction (max 10,000 entries by default)

### Idempotency Store Implementation

The `MemoryStore` implementation:

```go
type Store interface {
    Get(ctx context.Context, key string) (*Response, bool)
    Set(ctx context.Context, key string, response *Response, ttl time.Duration) error
    Delete(ctx context.Context, key string) error
}
```

**Memory Store Specifics:**
- Max 10,000 entries (configurable via `NewMemoryStoreWithSize`)
- LRU eviction when at capacity (evicts before adding, not after)
- Background cleanup every 5 minutes removes expired entries
- Thread-safe with RWMutex
- Must call `Stop()` on shutdown to clean up goroutine

**Response Structure:**
```go
type Response struct {
    StatusCode int
    Headers    map[string]string
    Body       []byte
    CachedAt   time.Time
}
```

**Lost on Restart:** The memory store does not persist. All idempotency keys are lost on server restart. For production deployments requiring durability, implement a Redis-backed store.

---

## Middleware Chain Order

The order of middleware execution is critical:

```
1. Panic Recovery (outermost - catches all panics)
2. Request ID (generate early for logging)
3. Real IP (before rate limiting)
4. Request Logging (before processing)
5. CORS (before auth)
6. Security Headers (before response)
7. API Version (before routing)
8. API Key Auth (before rate limiting)
9. Rate Limiting (before processing)
10. Timeout (per-route)
11. Idempotency (per-route, for POST)
12. Handler (innermost)
```

---

## Tenant Middleware

Multi-tenancy context extraction.

**Tenant ID format:**
- Allowed: `a-zA-Z0-9` and `-`
- Length: 1-64

**Extraction Priority:**
1. JWT claims (`tenant_id`) (only when `CEDROS_JWT_SECRET` is configured)
2. Subdomain extraction
3. Default tenant (`default`)

**Note:** `X-Tenant-Id` is not used for tenant selection (it may be emitted in responses for debugging).

**Context Storage:**
- Tenant ID stored in request context
- All database queries include tenant filter
