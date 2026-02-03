# Cedros Pay Server - Product & Coupon Repositories

Complete specification for product and coupon management.

---

## Product Model

```go
type Product struct {
    ID            string
    Description   string
    FiatPrice     *money.Money      // Optional Stripe price
    StripePriceID string            // Optional Stripe Price ID
    CryptoPrice   *money.Money      // Optional crypto price
    CryptoAccount string            // Override token account
    MemoTemplate  string            // Transaction memo template
    Metadata      map[string]string
    Active        bool
    Subscription  *SubscriptionConfig
    CreatedAt     time.Time
    UpdatedAt     time.Time
}
```

### SubscriptionConfig

```go
type SubscriptionConfig struct {
    BillingPeriod    string // "day", "week", "month", "year"
    BillingInterval  int    // e.g., 1 for monthly, 3 for quarterly
    TrialDays        int    // Free trial period
    StripePriceID    string // Stripe recurring price ID
    AllowX402        bool   // Allow crypto payments
    GracePeriodHours int    // Hours after expiry before blocking
}
```

### IsSubscription Method

```go
func (p Product) IsSubscription() bool {
    return p.Subscription != nil && p.Subscription.BillingPeriod != ""
}
```

---

## Product Repository Interface

```go
type Repository interface {
    GetProduct(ctx context.Context, id string) (Product, error)
    GetProductByStripePriceID(ctx context.Context, stripePriceID string) (Product, error)
    ListProducts(ctx context.Context) ([]Product, error)
    CreateProduct(ctx context.Context, product Product) error
    UpdateProduct(ctx context.Context, product Product) error
    DeleteProduct(ctx context.Context, id string) error
    Close() error
}
```

---

## Product Backend Implementations

### YAML Repository

Reads products from YAML configuration.

```yaml
paywall:
  resources:
    - resource_id: "article-premium"
      description: "Premium article access"
      fiat_amount_cents: 500
      fiat_currency: "usd"
      stripe_price_id: "price_..."
      crypto_atomic_amount: 5000000
      crypto_token: "USDC"
      memo_template: "Article:{{resource}}"
      subscription:
        billing_period: "month"
        billing_interval: 1
        trial_days: 7
        allow_x402: true
```

### PostgreSQL Repository

**Constructor:**
```go
func NewPostgresRepository(connURL string, poolCfg config.PostgresPool) (*PostgresRepository, error)
func NewPostgresRepositoryWithDB(db *sql.DB) *PostgresRepository
```

**Table Configuration:**
```go
func (r *PostgresRepository) WithTableName(name string) *PostgresRepository
```

### MongoDB Repository

**Constructor:**
```go
func NewMongoDBRepository(url, database, collection string) (*MongoDBRepository, error)
```

### Cached Repository

Wraps underlying repository with TTL-based caching.

```go
func NewCachedRepository(underlying Repository, ttl time.Duration) *CachedRepository
```

**Cache Behavior:**
- Product lookups cached for TTL
- List cached for TTL
- Create/Update/Delete invalidate cache

**Cache Configuration:**

| Setting | Default | Description |
|---------|---------|-------------|
| Product TTL | 5 minutes | How long product data is cached |
| Coupon TTL | 1 minute | How long coupon data is cached |
| Max entries | Unlimited | No LRU eviction |

**Cache Invalidation Policy:**
- **TTL-based only:** Cache entries expire after TTL
- **No event-based invalidation:** Changes in database may take up to TTL to reflect
- **Write-through:** Create/Update/Delete operations invalidate affected cache entries immediately
- **No cascade:** Coupon changes don't invalidate product cache (and vice versa)

**Stale Read Tolerance:**
| Use Case | Tolerance | Recommendation |
|----------|-----------|----------------|
| Pricing display | 5 minutes | Default TTL acceptable |
| Payment verification | 0 | Always uses fresh quote from generation time |
| Coupon validation | 1 minute | Short TTL for usage limits |

**Custom TTL Configuration:**
```yaml
products:
  backend: postgres
  cache_ttl: 5m    # Product cache

coupons:
  backend: yaml
  cache_ttl: 1m    # Coupon cache (shorter for usage limits)
```

**If Real-Time Updates Required:**
- Reduce TTL to 10-30 seconds (increased database load)
- Implement Redis pub/sub for cache invalidation
- Use database triggers to notify cache

---

## Coupon Model

```go
type Coupon struct {
    Code          string
    DiscountType  DiscountType      // "percentage" or "fixed"
    DiscountValue float64           // Percentage (0-100) or fixed amount
    Currency      string            // For fixed discounts (usd, usdc)
    Scope         Scope             // "all" or "specific"
    ProductIDs    []string          // For scope=specific
    PaymentMethod PaymentMethod     // "", "stripe", or "x402"
    AutoApply     bool              // Automatically apply to matching products
    AppliesAt     AppliesAt         // "catalog" or "checkout"
    UsageLimit    *int              // nil = unlimited
    UsageCount    int               // Current usage
    StartsAt      *time.Time        // When valid
    ExpiresAt     *time.Time        // When expires
    Active        bool
    Metadata      map[string]string
    CreatedAt     time.Time
    UpdatedAt     time.Time
}
```

### Discount Type

| Value | Description |
|-------|-------------|
| `percentage` | Percentage off (0-100) |
| `fixed` | Fixed amount off |

### Scope

| Value | Description |
|-------|-------------|
| `all` | Applies to all products |
| `specific` | Applies to ProductIDs only |

### Payment Method

| Value | Description |
|-------|-------------|
| `""` (empty) | Any payment method |
| `stripe` | Stripe (fiat) only |
| `x402` | x402 (crypto) only |

### AppliesAt

| Value | Description | Constraints |
|-------|-------------|-------------|
| `catalog` | Product-level display | Must be scope=specific |
| `checkout` | Cart/checkout only | Must be scope=all |

---

## Coupon Validation Methods

### IsValid

```go
func (c Coupon) IsValid() error
```

**Checks:**
1. Active == true
2. Now >= StartsAt (if set)
3. Now <= ExpiresAt (if set)
4. UsageCount < UsageLimit (if set)

**Errors:**
- `coupon is inactive`
- `ErrCouponNotStarted`
- `ErrCouponExpired`
- `ErrCouponUsageLimitReached`

### ValidateConfiguration

```go
func (c Coupon) ValidateConfiguration() error
```

**Rules:**
- Catalog coupons must have scope=specific and ProductIDs
- Checkout coupons must have scope=all
- Auto-apply coupons must specify AppliesAt

### AppliesToProduct

```go
func (c Coupon) AppliesToProduct(productID string) bool
```

Returns true if scope=all or productID in ProductIDs.

### AppliesToPaymentMethod

```go
func (c Coupon) AppliesToPaymentMethod(method PaymentMethod) bool
```

Returns true if c.PaymentMethod is empty or matches method.

### ApplyDiscount

```go
func (c Coupon) ApplyDiscount(originalPrice float64) float64
```

**Behavior:**
- Percentage: `price * (1 - discountValue/100)`
- Fixed: `price - discountValue` (min 0)

---

## Coupon Repository Interface

```go
type Repository interface {
    GetCoupon(ctx context.Context, code string) (Coupon, error)
    ListCoupons(ctx context.Context) ([]Coupon, error)
    GetAutoApplyCouponsForPayment(ctx context.Context, productID string, paymentMethod PaymentMethod) ([]Coupon, error)
    GetAllAutoApplyCouponsForPayment(ctx context.Context, paymentMethod PaymentMethod) (map[string][]Coupon, error)
    CreateCoupon(ctx context.Context, coupon Coupon) error
    UpdateCoupon(ctx context.Context, coupon Coupon) error
    IncrementUsage(ctx context.Context, code string) error
    DeleteCoupon(ctx context.Context, code string) error
    Close() error
}
```

---

## Coupon Backend Implementations

### Disabled Repository

No-op implementation when coupons are disabled.

```go
func NewDisabledRepository() Repository
```

All methods return ErrCouponNotFound.

### YAML Repository

Reads coupons from YAML configuration.

```yaml
coupons:
  coupons:
    - code: "SUMMER20"
      discount_type: "percentage"
      discount_value: 20
      scope: "all"
      payment_method: ""
      auto_apply: false
      applies_at: "checkout"
      expires_at: "2025-09-01T00:00:00Z"
      active: true

    - code: "PREMIUM50"
      discount_type: "fixed"
      discount_value: 50
      currency: "usd"
      scope: "specific"
      product_ids: ["premium-tier"]
      payment_method: "stripe"
      auto_apply: true
      applies_at: "catalog"
      usage_limit: 100
      active: true
```

### PostgreSQL Repository

**Constructor:**
```go
func NewPostgresRepository(connURL string, poolCfg config.PostgresPool) (*PostgresRepository, error)
func NewPostgresRepositoryWithDB(db *sql.DB) *PostgresRepository
```

**Table Configuration:**
```go
func (r *PostgresRepository) WithTableName(name string) *PostgresRepository
```

### MongoDB Repository

**Constructor:**
```go
func NewMongoDBRepository(url, database, collection string) (*MongoDBRepository, error)
```

### Cached Repository

```go
func NewCachedRepository(underlying Repository, ttl time.Duration) *CachedRepository
```

**Cache Strategy:**
- GetCoupon: Cache individual codes
- ListCoupons: Cache full list
- GetAutoApply*: Cache by productID+paymentMethod
- IncrementUsage: Invalidates code cache
- Create/Update/Delete: Invalidate all caches

---

## Repository Factory Functions

### Product Repository

```go
func NewRepository(cfg config.PaywallConfig) (Repository, error)
func NewRepositoryWithDB(cfg config.PaywallConfig, sharedDB *sql.DB) (Repository, error)
```

**Configuration:**
| Config Path | Values | Description |
|-------------|--------|-------------|
| `paywall.product_source` | yaml, postgres, mongodb | Backend type |
| `paywall.product_cache_ttl` | Duration | Cache TTL (0 = no cache) |
| `paywall.postgres_url` | URL | PostgreSQL connection |
| `paywall.postgres_table_name` | string | Custom table name |
| `paywall.mongodb_url` | URL | MongoDB connection |
| `paywall.mongodb_database` | string | MongoDB database |
| `paywall.mongodb_collection` | string | MongoDB collection |

### Coupon Repository

```go
func NewRepository(cfg config.CouponConfig) (Repository, error)
func NewRepositoryWithDB(cfg config.CouponConfig, sharedDB *sql.DB) (Repository, error)
```

**Configuration:**
| Config Path | Values | Description |
|-------------|--------|-------------|
| `coupons.coupon_source` | yaml, postgres, mongodb, disabled | Backend type |
| `coupons.cache_ttl` | Duration | Cache TTL (0 = no cache) |
| `coupons.postgres_url` | URL | PostgreSQL connection |
| `coupons.postgres_table_name` | string | Custom table name |
| `coupons.mongodb_url` | URL | MongoDB connection |
| `coupons.mongodb_database` | string | MongoDB database |
| `coupons.mongodb_collection` | string | MongoDB collection |

---

## Coupon Selection Logic

### SelectCouponsForPayment

Used by paywall service to select applicable coupons.

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

**Selection Process:**
1. Get auto-apply coupons for product and payment method
2. Add manual coupon if provided and valid
3. Filter by scope
4. Return combined list (no duplicates)

---

## Coupon Stacking

### StackCouponsOnMoney

```go
func StackCouponsOnMoney(
    originalPrice money.Money,
    applicableCoupons []coupons.Coupon,
    roundingMode money.RoundingMode,
) (money.Money, error)
```

**Application Order:**
1. All percentage discounts (multiplicatively)
2. All fixed discounts (summed, then subtracted)

**Example:**
```
Price: $10.00
Coupons: [10% off, 20% off, $1 off, $0.50 off]

Step 1: $10.00 × 0.9 = $9.00
Step 2: $9.00 × 0.8 = $7.20
Step 3: $7.20 - $1.50 = $5.70
```

---

## Error Codes

### Product Errors

| Error | Description |
|-------|-------------|
| `ErrProductNotFound` | Product ID not found |

### Coupon Errors

| Error | Description |
|-------|-------------|
| `ErrCouponNotFound` | Coupon code not found |
| `ErrCouponExpired` | Coupon past expiry date |
| `ErrCouponUsageLimitReached` | Usage count >= limit |
| `ErrCouponNotStarted` | Before starts_at date |

---

## Database Schemas

See [08-storage.md](./08-storage.md) for complete PostgreSQL schemas for `products` and `coupons` tables.

