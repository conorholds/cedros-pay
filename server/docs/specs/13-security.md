# Cedros Pay Server - Security Features

Security requirements and implementations.

---

## Payment Replay Protection

- [ ] Global signature ledger (each signature used once)
- [ ] Store signatures with resource ID and wallet
- [ ] Check before granting access
- [ ] Atomic check-and-store operation

### Implementation

```sql
-- Check if signature already used
SELECT EXISTS(SELECT 1 FROM payment_transactions WHERE signature = $1)

-- Record new payment (atomic)
INSERT INTO payment_transactions (signature, resource_id, wallet, amount, created_at)
VALUES ($1, $2, $3, $4, NOW())
ON CONFLICT (signature) DO NOTHING
```

### Key Points

- Transaction signature is globally unique
- A signature used for any resource cannot be reused for any other resource
- Check happens before transaction submission (for gasless) or confirmation (for user-submitted)

---

## Admin Operation Protection

### Nonce-Based Replay Protection

- [ ] One-time nonces with expiration
- [ ] Ed25519 signature verification
- [ ] Timing-safe signature comparison

### Nonce Flow

1. Admin requests nonce via `POST /paywall/v1/nonce`
2. Server generates random nonce with expiration (5 minutes)
3. Admin signs nonce with Ed25519 private key
4. Admin submits operation with nonce + signature
5. Server verifies signature and consumes nonce
6. Nonce cannot be reused

### Signature Verification

```go
type VerificationHeaders struct {
    Signature string // X-Signature header (base64-encoded)
    Message   string // X-Message header (plain text message)
    Signer    string // X-Signer header (base58-encoded public key)
}

func VerifyAdminRequest(r *http.Request, expectedSigner, expectedMessage string) error
func VerifyUserRequest(r *http.Request, allowedSigners []string, expectedMessage string) error
```

### Ed25519 Verification Steps

1. Decode base64 signature
2. Decode base58 public key
3. Verify public key matches expected signer
4. Verify signature over message bytes
5. Use constant-time comparison

---

## Rate Limiting

### Types

| Type | Key | Purpose |
|------|-----|---------|
| Global | (none) | DDoS protection |
| Per-Wallet | Wallet address | Abuse prevention |
| Per-IP | Client IP | Attack prevention |

### Implementation

Token bucket algorithm with:
- Configurable bucket size (limit)
- Configurable refill rate (window)
- Burst support (allow temporary spikes)

**Token Bucket Algorithm Details:**

```
Initial state: bucket = limit (full)

On each request:
1. Calculate tokens to add since last request:
   elapsed = now - lastRequestTime
   tokensToAdd = elapsed / refillInterval
   bucket = min(bucket + tokensToAdd, limit)  // Cap at limit

2. Check if request can proceed:
   if bucket >= 1:
       bucket -= 1
       allow request
   else:
       reject with 429

3. Update lastRequestTime = now
```

**Why Token Bucket (not Fixed Window):**
- Token bucket provides smoother rate limiting than fixed windows
- Prevents "thundering herd" at window boundaries
- Allows genuine burst traffic while maintaining average rate
- No race conditions at window edges

**Window Type Clarification:**
- This is NOT a fixed window (e.g., "100 requests per minute starting at :00")
- This is NOT a sliding window (expensive to compute precisely)
- Token bucket approximates sliding window behavior efficiently

**Burst Behavior:**
- If bucket is full and no requests for a while, user can burst up to `limit` requests
- After burst, rate limited to 1 request per `refillInterval`
- Bursts don't accumulate indefinitely (capped at `limit`)

### API Key Tier Exemptions

| Tier | Global | Per-Wallet | Per-IP |
|------|--------|------------|--------|
| free | ✓ | ✓ | ✓ |
| pro | ✓ | ✓ | ✓ |
| enterprise | ✓ | ✗ | ✗ |
| partner | ✗ | ✗ | ✗ |

### Response Headers

```
HTTP/1.1 429 Too Many Requests
Retry-After: 60
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1701432000
```

---

## Circuit Breaker

Protect against cascading failures from external services.

### Protected Services

| Service | Description |
|---------|-------------|
| Solana RPC | Blockchain queries and submissions |
| Stripe API | Payment processing |
| Webhooks | Callback deliveries |

### States

- **Closed** - Normal operation, requests pass through
- **Open** - Requests fail immediately (service unavailable)
- **Half-Open** - Limited requests to test recovery

### Configuration

| Parameter | Description |
|-----------|-------------|
| ConsecutiveFailures | Failures to trip |
| FailureRatio | Ratio threshold |
| MinRequests | Min requests before ratio check |
| Timeout | Time before half-open |
| MaxRequests | Requests allowed in half-open |

---

## Input Validation

### Configuration Schema Validation

- [ ] Validate all config fields on startup
- [ ] Type checking for durations, URLs, keys
- [ ] Range validation for numeric fields
- [ ] Required field enforcement

### Request Body Validation

- [ ] JSON schema validation
- [ ] Field type checking
- [ ] Required field enforcement
- [ ] String length limits

### Amount Overflow Checks

```go
// Check for overflow before multiplication
if amount > math.MaxInt64/quantity {
    return ErrOverflow
}
```

### Address Format Validation

- [ ] Base58 format for Solana addresses
- [ ] 32-byte length check
- [ ] Valid curve point verification (optional)

### Signature Format Validation

- [ ] Base64 decoding for signatures
- [ ] 64-byte length for Ed25519
- [ ] 88-character base64 string

---

## Multi-Tenancy Isolation

### Database Isolation

- [ ] Tenant ID in all database queries
- [ ] Composite indexes include tenant_id
- [ ] Default tenant for single-tenant mode

### Query Pattern

```sql
-- All queries include tenant filter
SELECT * FROM payment_transactions
WHERE tenant_id = $1 AND signature = $2

-- Indexes support tenant-first queries
CREATE INDEX idx_payments_tenant_sig
ON payment_transactions(tenant_id, signature);
```

### Tenant Extraction

Priority order:
1. JWT claims (`tenant_id`) (only when `CEDROS_JWT_SECRET` is configured)
2. Subdomain extraction
3. Default tenant (`default`)

Note: `X-Tenant-Id` is not used for tenant selection.

---

## Webhook Security

### HMAC Signing (Optional)

If configured, sign webhook payloads:

```go
mac := hmac.New(sha256.New, []byte(secret))
mac.Write(payload)
signature := hex.EncodeToString(mac.Sum(nil))
```

**Header:** `X-Cedros-Signature: sha256={signature}`

### IP Allowlisting

Configure allowed webhook destination IPs/CIDRs.

### TLS Verification

- Verify TLS certificates for webhook destinations
- Configurable to skip in development

---

## Secrets Management

### Environment Variables

- Stripe keys via `CEDROS_STRIPE_SECRET_KEY`
- Server wallet keys via `CEDROS_X402_SERVER_WALLET_*`
- Webhook secrets via `CEDROS_STRIPE_WEBHOOK_SECRET`

### Admin Key Configuration

Admin operations (refunds, webhook management) require Ed25519 signature verification.

**Admin Key Setup:**

1. Generate Ed25519 keypair (or use Solana wallet keypair)
2. Configure admin public key in YAML or environment:

```yaml
admin:
  public_keys:
    - "EdPublicKeyBase58..."  # Primary admin key
    - "EdPublicKeyBase58..."  # Backup admin key (optional)
```

Or via environment:
```bash
CEDROS_ADMIN_PUBLIC_KEY_1="EdPublicKeyBase58..."
CEDROS_ADMIN_PUBLIC_KEY_2="EdPublicKeyBase58..."  # Optional
```

**Key Format:**
- Keys are base58-encoded Ed25519 public keys
- Same format as Solana wallet public keys
- 32 bytes decoded, 43-44 characters base58

**Multiple Admin Keys:**
- Support multiple admin keys for redundancy
- Any configured key can perform admin operations
- No key hierarchy (all keys are equal)

**No Admin Key Configured:**
If no admin keys are configured:
- Admin endpoints return `403 Forbidden`
- Operations requiring admin auth are disabled
- Server logs warning on startup

**Key Rotation:**
1. Add new key to configuration
2. Restart server (or use hot-reload if supported)
3. Verify new key works
4. Remove old key from configuration
5. Restart server

### Key Rotation

- Support multiple server wallets for rotation
- Round-robin selection from healthy wallets

### Logging

- Never log full secrets
- Truncate wallet addresses in logs
- Mask sensitive fields in error messages
