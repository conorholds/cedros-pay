# Cedros Pay Server - Data Models

All data structures and types for implementation.

---

## Configuration Structures

```
Config
├── ServerConfig          # HTTP server settings
├── LoggingConfig         # Logger configuration
├── StripeConfig          # Stripe credentials
├── X402Config            # Solana/x402 settings
├── PaywallConfig         # Product/pricing config
├── StorageConfig         # Database backend
├── CouponConfig          # Coupon system
├── SubscriptionsConfig   # Subscription management
├── CallbacksConfig       # Webhook callbacks
├── MonitoringConfig      # Balance monitoring
├── RateLimitConfig       # Rate limiting
├── APIKeyConfig          # API key auth
└── CircuitBreakerConfig  # Circuit breaker
```

---

## Payment Models

### AuthorizationResult

Access authorization result.

| Field | Type | Description |
|-------|------|-------------|
| Granted | bool | Whether access is granted |
| Method | string | "stripe" or "x402" |
| Wallet | string | User wallet address |
| Quote | *Quote | Pricing information |
| Settlement | *SettlementResponse | Transaction result |
| Subscription | *SubscriptionInfo | Active subscription if any |

### Quote

Pricing information.

| Field | Type | Description |
|-------|------|-------------|
| ResourceID | string | Product ID |
| ExpiresAt | time.Time | Quote expiration |
| Stripe | *StripeOption | Stripe checkout metadata |
| Crypto | *CryptoQuote | x402 quote |

### StripeOption

Stripe checkout metadata.

| Field | Type | Description |
|-------|------|-------------|
| PriceID | string | Stripe Price ID |
| AmountCents | int64 | Amount in cents |
| Currency | string | Currency code (usd) |
| Description | string | Product description |
| Metadata | map[string]string | Custom metadata |

### CryptoQuote

x402 quote (follows spec).

| Field | Type | Description |
|-------|------|-------------|
| Scheme | string | "solana-spl-transfer" |
| Network | string | "mainnet-beta" or "devnet" |
| MaxAmountRequired | string | Atomic units as string |
| Resource | string | Resource ID |
| Description | string | Product/payment description |
| MimeType | string | Response MIME type ("application/json") |
| PayTo | string | Recipient token account |
| MaxTimeoutSeconds | uint64 | Optional timeout in seconds |
| Asset | string | Token mint address |
| Extra | SolanaExtra | Solana-specific extensions |

### SettlementResponse

Transaction settlement.

| Field | Type | Description |
|-------|------|-------------|
| Success | bool | Whether payment succeeded |
| Error | *string | Error message if failed (null if success) |
| TxHash | *string | Transaction signature (null if failed) |
| NetworkID | *string | Solana network (null if failed) |

### SubscriptionInfo

Subscription info in authorization result.

| Field | Type | Description |
|-------|------|-------------|
| ID | string | Subscription ID |
| Status | string | Current status |
| CurrentPeriodEnd | time.Time | Period end date |

---

## x402 Protocol Models

### PaymentPayload

X-PAYMENT header structure.

| Field | Type | JSON | Description |
|-------|------|------|-------------|
| X402Version | int | `x402Version` | Protocol version (must be 0) |
| Scheme | string | `scheme` | "solana-spl-transfer" |
| Network | string | `network` | Solana network |
| Payload | interface{} | `payload` | Scheme-dependent payload |

### SolanaPayload

Solana-specific payload.

| Field | Type | JSON | Description |
|-------|------|------|-------------|
| Signature | string | `signature` | Transaction signature |
| Transaction | string | `transaction` | Base64-encoded tx |
| Resource | string | `resource` | Resource ID |
| ResourceType | string | `resourceType` | "regular", "cart", or "refund" |
| FeePayer | string | `feePayer` | Server wallet for gasless |
| Memo | string | `memo` | Transaction memo |
| RecipientTokenAccount | string | `recipientTokenAccount` | Destination |
| Metadata | map[string]string | `metadata` | Custom key-value pairs |

**resourceType Validation:**

| Value | Description | Resource Format |
|-------|-------------|-----------------|
| `"regular"` | Single product payment (default) | Product ID (e.g., "premium-access") |
| `"cart"` | Multi-item cart payment | Cart ID (e.g., "cart_abc123...") |
| `"refund"` | Refund execution | Refund ID (e.g., "refund_abc123...") |

**Validation Rules:**
- If `resourceType` is empty, defaults to `"regular"`
- Invalid values return HTTP 400 with `invalid_resource_type` error
- `resourceType` determines which handler processes the payment:
  - `"regular"` → `authorizeRegular()`
  - `"cart"` → `authorizeCart()`
  - `"refund"` → `authorizeRefund()`
- Resource ID format must match resourceType (cart_ prefix for cart, refund_ for refund)

### PaymentProof

Parsed payment proof.

| Field | Type | Description |
|-------|------|-------------|
| X402Version | int | Protocol version |
| Scheme | string | Payment scheme |
| Network | string | Solana network |
| Signature | string | Transaction signature |
| Payer | string | Payer wallet |
| Transaction | []byte | Decoded transaction |
| Resource | string | Resource ID |
| ResourceType | string | Resource type |
| FeePayer | string | Fee payer wallet |

### Requirement

Verification constraints.

| Field | Type | Description |
|-------|------|-------------|
| ResourceID | string | Expected resource ID |
| RecipientOwner | string | Recipient wallet owner |
| RecipientTokenAccount | string | Recipient token account |
| TokenMint | string | Expected token mint |
| Amount | float64 | Required amount (display units) |
| Network | string | Expected network |
| TokenDecimals | uint8 | Token decimals |
| AllowedTokens | []string | Allowed token symbols |
| QuoteTTL | time.Duration | Quote validity period |
| SkipPreflight | bool | Skip transaction preflight checks |
| Commitment | string | Solana commitment level |

### VerificationResult

Verification outcome.

| Field | Type | Description |
|-------|------|-------------|
| Wallet | string | Payer wallet address |
| Amount | int64 | Verified amount (atomic) |
| Signature | string | Transaction signature |
| ExpiresAt | time.Time | Access expiration |

---

## Product Models

### Product

| Field | Type | JSON | Description |
|-------|------|------|-------------|
| ID | string | `id` | Product identifier |
| Description | string | `description` | Product description |
| FiatPrice | *Money | - | Fiat price |
| StripePriceID | string | `stripePriceId` | Stripe Price ID |
| CryptoPrice | *Money | - | Crypto price |
| CryptoAccount | string | `cryptoAccount` | Recipient token account |
| MemoTemplate | string | `memoTemplate` | Memo format template |
| Metadata | map[string]string | `metadata` | Custom metadata |
| Active | bool | `active` | Is product active |
| Subscription | *SubscriptionConfig | `subscription` | Subscription config |
| CreatedAt | time.Time | `createdAt` | Creation timestamp |
| UpdatedAt | time.Time | `updatedAt` | Last update |

### SubscriptionConfig

| Field | Type | JSON | Description |
|-------|------|------|-------------|
| BillingPeriod | string | `billingPeriod` | "day", "week", "month", "year" |
| BillingInterval | int | `billingInterval` | Number of periods |
| TrialDays | int | `trialDays` | Trial period in days |
| StripePriceID | string | `stripePriceId` | Stripe subscription Price ID |
| AllowX402 | bool | `allowX402` | Allow x402 payments |
| GracePeriodHours | int | `gracePeriodHours` | Grace period after expiry |

---

## Coupon Models

### Coupon

| Field | Type | JSON | Description |
|-------|------|------|-------------|
| Code | string | `code` | Coupon code |
| DiscountType | string | `discountType` | "percentage" or "fixed" |
| DiscountValue | float64 | `discountValue` | Discount amount |
| Currency | string | `currency` | For fixed discounts |
| Scope | string | `scope` | "all" or "specific" |
| ProductIDs | []string | `productIds` | For scope="specific" |
| PaymentMethod | string | `paymentMethod` | "stripe", "x402", or "" |
| AutoApply | bool | `autoApply` | Auto-apply coupon |
| AppliesAt | string | `appliesAt` | "catalog" or "checkout" |
| UsageLimit | *int | `usageLimit` | Max uses (null = unlimited) |
| UsageCount | int | `usageCount` | Current usage count |
| StartsAt | *time.Time | `startsAt` | Start date |
| ExpiresAt | *time.Time | `expiresAt` | Expiration date |
| Active | bool | `active` | Is coupon active |
| Metadata | map[string]string | `metadata` | Custom metadata |
| CreatedAt | time.Time | `createdAt` | Creation timestamp |
| UpdatedAt | time.Time | `updatedAt` | Last update |

---

## Money Models

### Money

Atomic unit representation.

| Field | Type | Description |
|-------|------|-------------|
| Asset | Asset | Currency/token definition |
| Atomic | int64 | Amount in atomic units |

**Creation Methods:**
- `New(asset, atomic int64) Money` - Create from atomic units
- `FromFloat(asset, float64) Money` - Convert display to atomic (alias: FromMajor)
- `FromAtomic(asset, atomic int64) Money` - Create from atomic units
- `Zero(asset) Money` - Create zero amount

**Conversion Methods:**
- `ToFloat() float64` - Convert to display amount (alias: ToMajor)
- `ToAtomic() int64` - Get atomic value

**Arithmetic Methods:**
- `Add(Money) Money` - Add amounts (must be same asset)
- `Sub(Money) Money` - Subtract amounts
- `Mul(int64) Money` - Multiply by integer quantity
- `Div(int64) Money` - Divide by integer
- `MultiplyByFloat(float64) Money` - Multiply by float
- `MulBasisPoints(bps int64) Money` - Multiply by basis points (100 bps = 1%)
- `MulBasisPointsWithRounding(bps int64, mode RoundingMode) Money` - With rounding control
- `MulPercent(percent float64) Money` - Multiply by percentage

**Comparison Methods:**
- `IsZero() bool` - Check if zero
- `IsPositive() bool` - Check if > 0
- `IsNegative() bool` - Check if < 0
- `LessThan(Money) bool` - Compare amounts
- `GreaterThan(Money) bool` - Compare amounts
- `Equal(Money) bool` - Check equality

**Discount Methods:**
- `ApplyPercentageDiscount(percent float64, mode RoundingMode) Money` - Apply % discount
- `ApplyFixedDiscount(discount Money) Money` - Apply fixed discount
- `Negate() Money` - Return negated amount
- `Abs() Money` - Return absolute value

**Utility Methods:**
- `RoundUpToCents() Money` - Round to 2 decimals
- `String() string` - Format for display

**Aggregation Functions:**
- `SumMoney(amounts []Money) (Money, error)` - Sum multiple amounts

**Money Errors:**
- `ErrOverflow` - Arithmetic overflow
- `ErrAssetMismatch` - Different assets in operation
- `ErrNegativeAmount` - Negative amount where not allowed
- `ErrInvalidFormat` - Invalid money format
- `ErrDivisionByZero` - Division by zero

### Asset

Currency/token definition.

| Field | Type | Description |
|-------|------|-------------|
| Code | string | "USD", "USDC", "SOL", etc. |
| Decimals | uint8 | Decimal places (2, 6, 9) |
| Type | AssetType | Fiat or SPL |
| Metadata | AssetMetadata | Additional info |

### AssetType

```
AssetTypeFiat - Traditional currency (USD, EUR)
AssetTypeSPL  - Solana SPL tokens (USDC, USDT)
```

### AssetMetadata

| Field | Type | Description |
|-------|------|-------------|
| StripeCurrency | string | For fiat assets |
| SolanaMint | string | Token mint address for SPL |

**Asset Methods:**
- `GetAsset(code string) (Asset, error)` - Lookup from registry
- `MustGetAsset(code string) Asset` - Lookup (panics if not found)
- `RegisterAsset(Asset) error` - Register custom asset
- `ListAssets() []Asset` - List all registered assets
- `IsStripeCurrency() bool` - Check if fiat currency
- `IsSPLToken() bool` - Check if Solana SPL token
- `GetStripeCurrency() (string, error)` - Get Stripe currency code
- `GetSolanaMint() (string, error)` - Get Solana mint address

### Pre-Registered Assets

| Code | Decimals | Type | Metadata |
|------|----------|------|----------|
| USD | 2 | Fiat | Stripe: "usd" |
| EUR | 2 | Fiat | Stripe: "eur" |
| USDC | 6 | SPL | Mint: EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v |
| USDT | 6 | SPL | Mint: Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB |
| SOL | 9 | SPL | Mint: So11111111111111111111111111111111111111112 |
| PYUSD | 6 | SPL | Mint: 2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo |

### Atomic Unit Conversions

| Asset | Decimals | Example |
|-------|----------|---------|
| USD | 2 | $10.50 = 1050 cents |
| USDC/USDT | 6 | 1.5 USDC = 1,500,000 atomic |
| SOL | 9 | 0.5 SOL = 500,000,000 lamports |

### Rounding Modes

| Mode | Description |
|------|-------------|
| RoundingStandard | Half-up rounding (0.5 rounds up): $0.025 → $0.03, $0.024 → $0.02 |
| RoundingCeiling | Always round up: $0.024 → $0.03, $0.001 → $0.01 |

Configure via `x402.rounding_mode` setting (values: "standard", "ceiling").

### RoundUpToCents Behavior

The `RoundUpToCents()` method rounds amounts to 2 decimal places (cent precision).

**For positive amounts:** Rounds up (ceiling)
```
$0.184 → $0.19
$1.001 → $1.01
```

**For negative amounts (refunds):** Rounds towards zero
```
-$0.184 → -$0.18
-$1.009 → -$1.00
```

**Only affects assets with > 2 decimals:**
- USDC (6 decimals): `1840001 → 1850000` (0.184001 → 0.19)
- USD (2 decimals): No change (already at cent precision)

### USD-Pegged Asset Equivalence

For fixed discount calculations, the following assets are treated as equivalent (1:1 value):
- `USD` (Stripe fiat)
- `USDC` (Circle stablecoin)
- `USDT` (Tether)
- `PYUSD` (PayPal USD)
- `CASH` (CASH stablecoin)

This allows a "$5 off" fixed coupon to work on both Stripe (USD) and x402 (USDC) payments.

---

**See Also:** [06-data-models-storage.md](./06-data-models-storage.md) for subscription, storage, callback, and integration models.
