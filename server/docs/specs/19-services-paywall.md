# Cedros Pay Server - Paywall Service

Complete specification for paywall service including quote generation, authorization, and refunds.

---

## Service Structure

```go
type Service struct {
    cfg           *config.Config
    store         storage.Store
    verifier      x402.Verifier
    notifier      callbacks.Notifier
    repository    products.Repository
    coupons       coupons.Repository
    subscriptions SubscriptionChecker
    metrics       *metrics.Metrics
}

func NewService(cfg, store, verifier, notifier, repository, couponRepo, metrics) *Service
func (s *Service) SetSubscriptionChecker(checker SubscriptionChecker)
```

---

## Quote Generation

### GenerateQuote

```go
func (s *Service) GenerateQuote(ctx context.Context, resourceID, couponCode string) (Quote, error)
```

**Process:**

1. **Resource Resolution**
   - Fetch resource definition by ID
   - Return error if not configured

2. **Quote Initialization**
   - Generate quote with expiry from config (QuoteTTL)
   - Interpolate memo template with resource ID and nonce

3. **Coupon Validation**
   - Validate manual coupon if provided
   - Silently ignore invalid coupons (Stripe behavior)

4. **Stripe Pricing** (if FiatAmountCents > 0)
   - Apply ALL applicable coupons via `SelectCouponsForPayment(scope=ScopeAll)`
   - Stack coupons using configured rounding mode
   - Return discounted amount in cents

5. **Crypto Pricing** (if CryptoAtomicAmount > 0)
   - **Phase 1:** Apply catalog-level coupons (product-specific)
   - **Phase 2:** Apply checkout-level coupons (site-wide)
   - Round result up to cents precision
   - Include gasless `feePayer` if enabled

**Response:**
```go
type Quote struct {
    ResourceID string
    ExpiresAt  time.Time
    Stripe     *StripeOption
    Crypto     *CryptoQuote
}
```

---

### GenerateCartQuote

```go
func (s *Service) GenerateCartQuote(ctx context.Context, req CartQuoteRequest) (CartQuoteResponse, error)
```

**Request:**
```go
type CartQuoteRequest struct {
    Items      []CartQuoteItem
    CouponCode string
    Metadata   map[string]string
}

type CartQuoteItem struct {
    ResourceID string
    Quantity   int
    Metadata   map[string]string
}
```

**Validation:**
- At least one item required
- All items must use same token (no mixed currencies)
- Missing quantity defaults to 1
- Each item must have a ResourceID
- Each ResourceID must have CryptoAtomicAmount > 0 configured

**Mixed Token Error:**
```
Error: "mixed tokens in cart (got USDC and SOL)"
```
Cart checkout requires all items use the same cryptocurrency token. This is validated during quote generation, not at payment time.

**Processing:**
1. For each item:
   - Apply catalog-level coupons to unit price (auto-apply only, no manual at item level)
   - Multiply discounted unit price by quantity
   - Add to running total using Money.Add() (int64 arithmetic)
2. Apply checkout-level coupons to cart total (auto-apply + optional manual)
3. Round final total up to cents precision using `RoundUpToCents()`
4. Store cart with locked prices (prices frozen at quote time)

**Response:**
```go
type CartQuoteResponse struct {
    CartID      string
    Quote       *CryptoQuote
    Items       []CartItem
    TotalAmount float64
    Metadata    map[string]string
    ExpiresAt   time.Time
}
```

---

## Coupon Selection

### SelectCouponsForPayment

```go
func SelectCouponsForPayment(
    ctx context.Context,
    couponRepo coupons.Repository,
    productID string,
    paymentMethod coupons.PaymentMethod,
    manualCoupon *coupons.Coupon,
    scope CouponScope,
) []coupons.Coupon
```

**Scope Values:**
| Scope | Filter | Use Case |
|-------|--------|----------|
| ScopeAll | No AppliesAt filter | Stripe (single-step) |
| ScopeCatalog | AppliesAt=catalog | Product-level pricing |
| ScopeCheckout | AppliesAt=checkout, Scope=all | Site-wide discounts |

---

### StackCouponsOnMoney

```go
func StackCouponsOnMoney(
    originalPrice money.Money,
    applicableCoupons []coupons.Coupon,
    roundingMode money.RoundingMode,
) (money.Money, error)
```

**Application Order:**
1. All percentage discounts (multiplicatively stacked, in order encountered)
2. All fixed-amount discounts (summed, then subtracted once at end)

**Example:**
```
Price: $10.00
Coupons: [10% off, 20% off, $1 off, $0.50 off]

Step 1: $10.00 × 0.9 = $9.00
Step 2: $9.00 × 0.8 = $7.20
Step 3: $7.20 - $1.50 = $5.70
Result: $5.70
```

**Critical Implementation Details:**

1. **USD-Pegged Asset Equivalence**: Fixed discounts apply equally to USD, USDC, USDT, PYUSD, and CASH. A "$5 off" coupon works on both Stripe (USD) and x402 (USDC) payments.

2. **Fixed Discount Floor**: If fixed discounts exceed remaining price, result is zero (never negative).

3. **Rounding Modes**:
   - `RoundingStandard` (default): Half-up rounding (0.5 rounds up)
   - `RoundingCeiling`: Always round up to next cent

4. **Percentage Discount Validation**: Values < 0 or > 100 are ignored (return original price). Value of 100 = free.

5. **Invalid Fixed Discounts**: If a fixed discount cannot be parsed (e.g., invalid currency), it is silently skipped.

6. **Duplicate Coupons**: The selection logic uses O(1) map-based deduplication; a coupon code can only appear once in the applied list.

7. **Coupon Selection Order**: When selecting coupons, they are returned in the order:
   - Auto-apply coupons first (from repository, order depends on database/YAML order)
   - Manual coupon last (if provided and not already in auto-apply list)
   - Within stacking, percentage discounts apply before fixed discounts

---

## Authorization

### Authorize

```go
func (s *Service) Authorize(ctx context.Context, resourceID, stripeSessionID, paymentHeader, couponCode string) (AuthorizationResult, error)
```

Delegates to `AuthorizeWithWallet` with empty wallet.

---

### AuthorizeWithWallet

```go
func (s *Service) AuthorizeWithWallet(ctx context.Context, resourceID, stripeSessionID, paymentHeader, couponCode, wallet string) (AuthorizationResult, error)
```

**Authorization Flow:**

1. **Route Detection**
   - If resourceID starts with `cart_`: delegate to `authorizeCart()`
   - If resourceID starts with `refund_`: delegate to `authorizeRefund()`

2. **Subscription Check** (if wallet provided)
   - Call `subscriptions.HasAccess(ctx, wallet, resourceID)`
   - Return success with method="subscription" if access granted

3. **Stripe Session Verification** (if stripeSessionID provided)
   - Lookup payment record by `stripe:{sessionID}`
   - Return success if found and verified
   - Return `ErrStripeSessionPending` if not confirmed

4. **x402 Payment Verification** (if paymentHeader provided)
   - Parse base64-encoded X-PAYMENT header
   - Validate scheme, network, resource
   - Apply coupons (catalog + checkout phases)
   - **Atomic signature claiming** before verification
   - Verify transaction via Solana RPC
   - Enforce EXACT amount matching
   - Record payment and trigger callbacks

5. **Quote Generation** (if no payment)
   - Generate quote for resource
   - Return not-granted with quote

**Result:**
```go
type AuthorizationResult struct {
    Granted      bool
    Method       string  // "stripe", "x402", "x402-cart", "x402-refund", "subscription"
    Wallet       string
    Quote        *Quote
    Settlement   *SettlementResponse
    Subscription *SubscriptionInfo
}
```

---

## Cart Authorization

### authorizeCart

```go
func (s *Service) authorizeCart(ctx context.Context, cartID, paymentHeader, couponCode string) (AuthorizationResult, error)
```

**Process:**
1. Parse and validate X-PAYMENT header
2. Fetch stored cart quote by ID
3. **Check cart expiration:** If `now > cart.ExpiresAt`, return `ErrQuoteExpired`
4. Verify amount matches quoted total (tolerance: 0.000001, i.e., 1e-6)
5. Verify transaction via x402
6. Mark cart as paid
7. Record coupon usage (IncrementUsage for each applied coupon)
8. Fire `PaymentSucceeded` callback

**Cart Quote Expiration:**
- Expiration is checked at payment verification time (step 3), NOT during quote lookup
- Default TTL: 15 minutes from quote creation (configurable via `storage.cart_quote_ttl`)
- If expired: Return `ErrQuoteExpired` - user must request new cart quote
- Expired carts are NOT automatically deleted (kept for audit trails)
- Periodic cleanup via archival worker removes carts older than retention period

**Amount Tolerance Details:**
- Cart payments use a tolerance of `0.000001` (1e-6) for floating-point comparison
- This prevents false rejections due to floating-point precision issues
- Formula: `|paid - required| <= 0.000001`
- Overpayment beyond tolerance is rejected (exact match required)
- Underpayment below tolerance is rejected

**Difference from Single Product x402:**
| Context | Tolerance | Overpayment | Behavior |
|---------|-----------|-------------|----------|
| Single product x402 | 1e-9 | Allowed (tips) | `paid >= required - tolerance` |
| Cart x402 | 1e-6 | Rejected | `|paid - required| <= tolerance` |

Cart requires exact matching because:
1. Cart total is a computed sum - no reason for overpayment
2. Prevents user confusion about what they paid
3. Simplifies refund calculations if needed

---

## Amount Tolerance Reference

All tolerance comparisons in one place for consistency:

| Operation | Tolerance | Formula | Overpayment | Reason |
|-----------|-----------|---------|-------------|--------|
| Single product x402 | 1e-9 | `paid >= required - 1e-9` | Allowed | Tips/rounding |
| Cart x402 | 1e-6 | `\|paid - required\| <= 1e-6` | Rejected | Exact cart total |
| Refund | 0 (exact) | `paid == required` | Rejected | Prevent fraud |
| Stripe | N/A | Stripe validates | N/A | Stripe handles |

**Implementation Notes:**
1. All comparisons use `float64` display units (not atomic)
2. Convert atomic → float64 before comparison
3. Tolerances account for floating-point precision only
4. 1e-9 ≈ 0.000000001 (sub-cent precision for 6-decimal tokens)
5. 1e-6 ≈ 0.000001 (cart aggregation precision)

**Comparison Functions:**
```go
// Single product: allows overpayment
func amountSufficient(paid, required float64) bool {
    return paid >= required - 1e-9
}

// Cart: exact match only
func amountMatches(paid, required float64) bool {
    return math.Abs(paid - required) <= 1e-6
}

// Refund: exact match
func amountExact(paid, required float64) bool {
    return paid == required
}
```

---

## Refund Processing

### CreateRefundRequest

```go
func (s *Service) CreateRefundRequest(ctx context.Context, req RefundQuoteRequest) (storage.RefundQuote, error)
```

**Request:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| OriginalPurchaseID | string | Yes | Original tx signature |
| RecipientWallet | string | Yes | Customer wallet |
| Amount | float64 | Yes | Refund amount (> 0) |
| Token | string | Yes | Token symbol |
| Reason | string | No | Refund reason |
| Metadata | map[string]string | No | Custom metadata |

**Validation:**
- One refund per original signature (prevents duplicates)
- Valid Solana wallet address

**Behavior:**
- Stores refund as pending
- Does NOT generate x402 quote yet (admin must approve first)

---

### RegenerateRefundQuote

```go
func (s *Service) RegenerateRefundQuote(ctx context.Context, refundID string) (RefundQuoteResponse, error)
```

Called by admin after approving refund:
1. Fetch existing refund request
2. Validate not already processed
3. Update expiry to fresh TTL (15 minutes)
4. Generate x402 quote with PayTo = customer wallet

---

## Complete Refund Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                        REFUND LIFECYCLE                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. POST /refunds/request                                       │
│     └─> Creates RefundQuote with status=pending (no x402 quote) │
│                                                                 │
│  2. Admin reviews via POST /refunds/pending                     │
│     └─> Returns list of pending refunds                         │
│                                                                 │
│  3a. POST /refunds/approve (with nonce + signature)             │
│      └─> Generates x402 quote (15 min TTL)                      │
│      └─> Returns quote for execution                            │
│                                                                 │
│  3b. POST /refunds/deny (alternative path)                      │
│      └─> Deletes refund request                                 │
│                                                                 │
│  4. Admin executes refund:                                      │
│     - Build transaction paying customer wallet                  │
│     - Sign with server wallet                                   │
│     - POST /verify with X-PAYMENT header                        │
│     └─> Verifies and marks refund as processed                  │
│                                                                 │
│  EXPIRATION HANDLING:                                           │
│  - If quote expires before step 4: Admin must call              │
│    /refunds/approve again to get fresh quote                    │
│  - Original refund request persists (not deleted)               │
│  - Can regenerate quote unlimited times until processed         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Quote Expiration Rules:**
- Quote TTL: 15 minutes (configurable via `storage.refund_quote_ttl`)
- Expiration checked at verification time (step 4)
- If expired: Return `ErrQuoteExpired`, admin must re-approve
- Re-approval generates new quote with fresh expiry

**Refund Amount Matching:**
- Refund verification uses EXACT amount matching (no tolerance)
- Amount in transaction MUST equal amount in RefundQuote
- Prevents partial refunds or overpayment

---

### authorizeRefund

```go
func (s *Service) authorizeRefund(ctx context.Context, refundID, paymentHeader string) (AuthorizationResult, error)
```

**Process:**
1. Parse X-PAYMENT header
2. Fetch refund quote
3. Validate not expired or processed
4. Verify exact amount matching
5. **Validate payer is server wallet** (only server can refund)
6. Mark refund as processed
7. Fire `RefundSucceeded` callback

---

### ListPendingRefunds

```go
func (s *Service) ListPendingRefunds(ctx context.Context) ([]storage.RefundQuote, error)
```

Returns all unprocessed refund requests for admin review.

---

### DenyRefund

```go
func (s *Service) DenyRefund(ctx context.Context, refundID string) error
```

Deletes the refund quote (denies request).

---

## Money Type

### Structure

```go
type Money struct {
    Asset  Asset   // Currency metadata
    Atomic int64   // Amount in smallest unit
}
```

### Decimal Examples

| Asset | Decimals | Example |
|-------|----------|---------|
| USD | 2 | $10.50 = 1050 |
| USDC | 6 | 1.5 USDC = 1500000 |
| SOL | 9 | 0.5 SOL = 500000000 |

### Key Methods

```go
New(asset, atomic int64) Money
Zero(asset) Money
FromMajor(asset, "10.50") (Money, error)
ToMajor() string
Mul(quantity int64) Money
Add(other Money) (Money, error)
ApplyPercentageDiscountWithRounding(percent, mode) (Money, error)
ApplyFixedDiscount(discount Money) (Money, error)
RoundUpToCents() Money
IsZero() bool
```

---

## Replay Attack Prevention

**Non-gasless transactions:**
1. Record placeholder payment BEFORE verification
2. If signature exists, reject as replay
3. Failed verification leaves signature recorded (intentional)

**Gasless transactions:**
1. Skip optimistic recording (signature doesn't exist yet)
2. After server co-signs and submits, same detection applies

---

## Coupon Stacking Behavior

### Single Product Quote
- Applies ALL coupons (catalog + checkout)
- Phase 1: Catalog coupons
- Phase 2: Checkout coupons

### Cart Quote
- Phase 1: Catalog coupons per item
- Phase 2: Checkout coupons on cart total
- Items show individual applied coupons

### When is Coupon Usage Incremented?

**Critical:** `IncrementUsage()` is called ONLY after successful payment verification, not at quote generation time.

**For Single Product:**
- Usage incremented after `Verify()` succeeds and payment is recorded

**For Cart:**
- Usage incremented for ALL applied coupons (stored in `cart.Metadata["coupon_codes"]`) after `authorizeCart()` succeeds
- If increment fails, payment still succeeds (logged as warning, not fatal)

**Code Pattern:**
```go
// After successful payment verification
if storedCouponCodes != "" && s.coupons != nil {
    codes := strings.Split(storedCouponCodes, ",")
    for _, code := range codes {
        if err := s.coupons.IncrementUsage(ctx, code); err != nil {
            log.Warn().Err(err).Str("coupon_code", code).Msg("coupon_increment_failed")
            // Payment still succeeds - usage tracking is best-effort
        }
    }
}
```

**Race Condition Handling:**

| Scenario | Behavior |
|----------|----------|
| Two concurrent payments, usage at 99/100 | Both may succeed (limit exceeded by 1) |
| Increment fails mid-batch | Earlier increments persist, later skipped |
| Same payment retried | No duplicate increment (payment signature check first) |

**Why This Design:**
1. Incrementing BEFORE payment risks orphaned counts if payment fails
2. Database-level constraint can enforce strict limits if needed
3. At-most-once per payment guaranteed by signature idempotency
4. Slight over-limit acceptable for most use cases (marketing coupons)

**Strict Limit Enforcement (Optional):**
```sql
-- Add CHECK constraint if strict limits required
ALTER TABLE coupons ADD CONSTRAINT check_usage
  CHECK (usage_count <= max_uses OR max_uses IS NULL);
```

### Metadata in Response

| Key | Type | Description |
|-----|------|-------------|
| `coupon_codes` | string | All applied codes, comma-separated |
| `catalog_coupons` | string | Product-level codes, comma-separated |
| `checkout_coupons` | string | Checkout-level codes, comma-separated |
| `original_amount` | string | Price before discounts (atomic units) |
| `discounted_amount` | string | Final price (atomic units) |

**Cart Metadata Structure (Exact Format):**

```json
{
  "coupon_codes": "SAVE10,CHECKOUT5",
  "catalog_coupons": "SAVE10",
  "checkout_coupons": "CHECKOUT5",
  "original_amount": "1500000",
  "discounted_amount": "1275000",
  "item_count": "3",
  "total_quantity": "5"
}
```

**Metadata Key Rules:**
1. All keys use `snake_case` (internal storage format)
2. All values are strings (JSON metadata limitation)
3. Empty values: Omit key entirely (not empty string)
4. Multiple codes: Comma-separated, no spaces
5. Amounts: Atomic units as string (e.g., "1500000" for 1.5 USDC)

---

## Middleware

### Paywall Middleware

```go
func (s *Service) Middleware(resolver ResourceResolver) func(http.Handler) http.Handler
```

**Headers Read:**
- `X-Stripe-Session`: Stripe session ID
- `X-PAYMENT`: x402 proof header
- `X-Wallet`: Wallet address (for subscriptions)
- Query param `couponCode`: Manual coupon

**Behavior:**
- Not Granted → 402 Payment Required with x402 quote
- Granted → Adds context values, calls next handler
- Error → 403 Forbidden or 400 Bad Request

### Context Functions

```go
AuthorizationFromContext(ctx) (AuthorizationResult, bool)
ResourceIDFromContext(ctx) (string, bool)
```

---

## Helper Methods

These methods provide direct access to underlying functionality:

### Resource Lookup

```go
func (s *Service) ResourceDefinition(ctx context.Context, resourceID string) (config.PaywallResource, error)
func (s *Service) ResourceDefinitionByStripePriceID(ctx context.Context, stripePriceID string) (config.PaywallResource, error)
```

**Note:** Returns value, not pointer. Returns `ErrResourceNotConfigured` if not found.

### Product Management

```go
func (s *Service) ListProducts(ctx context.Context) ([]products.Product, error)
func (s *Service) GetProduct(ctx context.Context, id string) (products.Product, error)
```

### Payment Verification

```go
func (s *Service) HasPaymentBeenProcessed(ctx context.Context, signature string) (bool, error)
func (s *Service) GetPayment(ctx context.Context, signature string) (storage.PaymentTransaction, error)
```

**Note:** `GetPayment` returns value, not pointer. Returns error if not found.

### Admin Nonce Management

```go
func (s *Service) CreateNonce(ctx context.Context, purpose string) (storage.AdminNonce, error)
func (s *Service) ConsumeNonce(ctx context.Context, nonceID string) error
```

**Nonce Purposes:** Used for admin operations requiring replay protection (e.g., "list-pending-refunds", "approve-refund").

### Cart Lookup

```go
func (s *Service) GetCartQuote(ctx context.Context, cartID string) (*storage.CartQuote, error)
```

---

## Utility Functions

| Function | Purpose |
|----------|---------|
| InterpolateMemo(template, resourceID) | Replace `{{resource}}` and `{{nonce}}` |
| deriveTokenAccountSafe(owner, mint) | Derive ATA, return empty on error |
| hashResourceID(resourceID) | SHA256 hash for logging |
| formatCouponCodes(codes) | Join with commas |
| mergeMetadata(maps...) | Combine metadata maps |

---

## Error Handling

| Error | Condition |
|-------|-----------|
| ErrResourceNotConfigured | Resource ID empty or not found |
| ErrStripeSessionPending | Session not yet confirmed |
| ErrAmountMismatch | Payment amount != quoted amount |
| ErrReplayAttack | Signature already used |
| ErrRefundAlreadyProcessed | Refund already executed |
| ErrInvalidPayer | Refund payer not server wallet |

---

## Callbacks Triggered

### PaymentSucceeded
- After x402/Stripe payment verified
- Includes: ResourceID, wallet, signature, coupon codes, amounts

### RefundSucceeded
- After refund transaction confirmed
- Includes: RefundID, original purchase, recipient, admin wallet

---

## Configuration Dependencies

| Config Path | Purpose |
|-------------|---------|
| Paywall.QuoteTTL | Quote expiration |
| Paywall.RoundingMode | Coupon discount rounding |
| X402.PaymentAddress | Default recipient |
| X402.TokenMint | Token for payments |
| X402.GaslessEnabled | Server pays fees |
| Storage.CartQuoteTTL | Cart expiration |
| Storage.RefundQuoteTTL | Refund quote expiration |

