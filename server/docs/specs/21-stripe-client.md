# Cedros Pay Server - Stripe Client

Complete specification for Stripe integration methods.

---

## Client Structure

```go
type Client struct {
    cfg      config.StripeConfig
    store    storage.Store
    notify   callbacks.Notifier
    coupons  CouponRepository
    metrics  *metrics.Metrics
}

func NewClient(cfg, store, notifier, coupons, metrics) *Client
```

**Initialization:**
- Sets `stripeapi.Key = cfg.SecretKey`
- Uses `NoopNotifier{}` if notifier is nil

---

## Checkout Sessions

### CreateCheckoutSession

```go
func (c *Client) CreateCheckoutSession(ctx context.Context, req CreateSessionRequest) (*stripeapi.CheckoutSession, error)
```

**Request:**
| Field | Type | Maps To Stripe | Description |
|-------|------|----------------|-------------|
| ResourceID | string | Metadata["resource_id"] | Backend resource ID |
| AmountCents | int64 | LineItems[0].PriceData.UnitAmount | Price in cents |
| Currency | string | LineItems[0].PriceData.Currency | ISO 4217 code |
| PriceID | string | LineItems[0].Price | Stripe Price ID |
| CustomerEmail | string | CustomerEmail | Pre-fill email |
| Metadata | map[string]string | Metadata | Custom metadata |
| SuccessURL | string | SuccessURL | Success redirect |
| CancelURL | string | CancelURL | Cancel redirect |
| Description | string | LineItems[0].PriceData.ProductData.Name | Product name |
| CouponCode | string | Metadata["coupon_code"] | Internal tracking |
| OriginalAmount | int64 | Metadata["original_amount_cents"] | Before discount |
| DiscountAmount | int64 | Metadata["discount_amount_cents"] | Discount applied |
| StripeCouponID | string | Discounts[0].PromotionCode | Stripe promo code |

**Stripe Parameters:**
```
Mode:               "payment"
PaymentMethodTypes: ["card"]
LineItems:          [{PriceID or inline PriceData}]
Discounts:          [{PromotionCode}] (if provided)
TaxRates:           [cfg.TaxRateID] (if configured)
```

**Validation:**
- AmountCents > 0 OR PriceID required

---

### lookupPromotionCodeID

```go
func (c *Client) lookupPromotionCodeID(code string) (string, error)
```

**Stripe API:** `promotioncode.List(params)`

Resolves human-readable code (e.g., "SAVE20") to Stripe promo code ID.

---

## Webhook Handling

### ParseWebhook

```go
func (c *Client) ParseWebhook(ctx context.Context, payload []byte, signature string) (WebhookEvent, error)
```

**Stripe API:** `webhook.ConstructEvent(payload, signature, secret)`

**Validation:**
- WebhookSecret must be configured
- HMAC signature validated
- resource_id required in metadata

**Response:**
```go
type WebhookEvent struct {
    Type        string
    SessionID   string
    ResourceID  string
    Customer    string
    Metadata    map[string]string
    AmountTotal int64
    Currency    string
}
```

---

### HandleCompletion

```go
func (c *Client) HandleCompletion(ctx context.Context, event WebhookEvent) error
```

**Side Effects:**
1. Records payment with signature `stripe:{session_id}`
2. Increments coupon usage (if coupon_code in metadata)
3. Triggers `PaymentSucceeded` callback

**Idempotency:** Duplicate webhooks return nil (signature collision detected).

---

## Cart Service

### CreateCartCheckoutSession

```go
func (c *CartService) CreateCartCheckoutSession(ctx context.Context, req CreateCartSessionRequest) (*stripeapi.CheckoutSession, error)
```

**Request:**
```go
type CreateCartSessionRequest struct {
    Items          []CartLineItem
    CustomerEmail  string
    Metadata       map[string]string
    SuccessURL     string
    CancelURL      string
    CouponCode     string
    StripeCouponID string
}

type CartLineItem struct {
    PriceID     string
    Resource    string
    Quantity    int64
    Description string
    Metadata    map[string]string
}
```

**Metadata Encoding:**
```
cart_items:           "3"
total_quantity:       "5"
coupon_code:          "SAVE20"
item_0_price_id:      "price_..."
item_0_resource:      "article-1"
item_0_quantity:      "2"
item_0_description:   "Article access"
item_1_price_id:      "price_..."
...
```

**Validation:**
- At least one item required
- All items must have PriceID

---

## Subscription Methods

### CreateSubscriptionCheckout

```go
func (c *Client) CreateSubscriptionCheckout(ctx context.Context, req CreateSubscriptionRequest) (*stripeapi.CheckoutSession, error)
```

**Request:**
| Field | Type | Description |
|-------|------|-------------|
| ProductID | string | Resource/plan identifier |
| PriceID | string | Stripe recurring price (required) |
| CustomerEmail | string | Pre-fill email |
| Metadata | map[string]string | Custom metadata |
| SuccessURL | string | Success redirect |
| CancelURL | string | Cancel redirect |
| TrialDays | int | Free trial period |

**Stripe Parameters:**
```
Mode:               "subscription"
PaymentMethodTypes: ["card"]
LineItems:          [{Price: PriceID, Quantity: 1}]
SubscriptionData:   {TrialPeriodDays: TrialDays}
Metadata:           {subscription: "true", ...}
```

---

### CancelSubscription

```go
func (c *Client) CancelSubscription(ctx context.Context, stripeSubID string, atPeriodEnd bool) error
```

**Stripe API:**
- `atPeriodEnd=true`: `stripesub.Update(id, {CancelAtPeriodEnd: true})`
- `atPeriodEnd=false`: `stripesub.Cancel(id, nil)`

---

### GetSubscription

```go
func (c *Client) GetSubscription(ctx context.Context, stripeSubID string) (*stripeapi.Subscription, error)
```

**Stripe API:** `stripesub.Get(id, nil)`

Returns full subscription object with status, period dates, items.

---

### UpdateSubscription

```go
func (c *Client) UpdateSubscription(ctx context.Context, req UpdateSubscriptionRequest) (*UpdateSubscriptionResult, error)
```

**Request:**
| Field | Type | Description |
|-------|------|-------------|
| SubscriptionID | string | Stripe subscription ID |
| NewPriceID | string | New plan price |
| ProrationBehavior | string | "create_prorations", "none", "always_invoice" |
| Metadata | map[string]string | Update metadata |

**Stripe API:**
1. `stripesub.Get(id)` - Get current items
2. `stripesub.Update(id, params)` - Update with new price

**Result:**
```go
type UpdateSubscriptionResult struct {
    Subscription    *stripeapi.Subscription
    ProrationAmount int64
    EffectiveDate   int64
}
```

---

### ReactivateSubscription

```go
func (c *Client) ReactivateSubscription(ctx context.Context, stripeSubID string) (*stripeapi.Subscription, error)
```

**Stripe API:** `stripesub.Update(id, {CancelAtPeriodEnd: false})`

Removes cancellation scheduling.

---

### CreateBillingPortalSession

```go
func (c *Client) CreateBillingPortalSession(ctx context.Context, customerID, returnURL string) (*stripeapi.BillingPortalSession, error)
```

**Stripe API:** `portalsession.New(params)`

Returns URL for self-service billing management.

---

### PreviewProration

```go
func (c *Client) PreviewProration(ctx context.Context, stripeSubID, newPriceID string) (*ProrationPreview, error)
```

**Purpose:** Preview what a plan change would cost before executing it.

**Stripe API:** `invoice.GetNext(params)` with `SubscriptionProrationBehavior: "create_prorations"`

**Response:**
```go
type ProrationPreview struct {
    AmountDue       int64     // Total amount due at next invoice
    ProrationAmount int64     // Just the proration charges
    Currency        string    // Currency code
    NextPaymentDate time.Time // When next invoice occurs
    Lines           []ProrationLine // Itemized breakdown
}

type ProrationLine struct {
    Description string
    Amount      int64
    Period      struct {
        Start time.Time
        End   time.Time
    }
}
```

**Use Case:** Display plan change cost to user before they confirm upgrade/downgrade.

---

## Subscription Webhooks

### ParseSubscriptionWebhook

```go
func (c *Client) ParseSubscriptionWebhook(payload []byte, eventType string) (*SubscriptionWebhookEvent, error)
```

**Supported Events:**
| Event | Description |
|-------|-------------|
| customer.subscription.created | New subscription |
| customer.subscription.updated | Plan change, cancellation |
| customer.subscription.deleted | Subscription cancelled |
| checkout.session.completed | Subscription checkout done |
| invoice.paid | Recurring payment success |
| invoice.payment_failed | Recurring payment failed |

**Response:**
```go
type SubscriptionWebhookEvent struct {
    Type                 string
    StripeSubscriptionID string
    StripeCustomerID     string
    ProductID            string
    Status               string
    CurrentPeriodStart   time.Time
    CurrentPeriodEnd     time.Time
    CancelAtPeriodEnd    bool
    CancelledAt          *time.Time
    Metadata             map[string]string
    PriceID              string
    BillingPeriod        string
    BillingInterval      int
}
```

---

### HandleSubscriptionWebhook

```go
func (c *Client) HandleSubscriptionWebhook(ctx context.Context, event *SubscriptionWebhookEvent, subRepo SubscriptionRepository) error
```

**Event Processing:**

| Event | Actions |
|-------|---------|
| checkout.session.completed | Create subscription record |
| customer.subscription.updated | Update status, track plan changes |
| customer.subscription.deleted | Set status to cancelled |
| invoice.paid | Extend period dates |
| invoice.payment_failed | Set status to past_due |

---

## Status Mapping

### Stripe Status → Local Status

| Stripe | Local | Meaning |
|--------|-------|---------|
| active | StatusActive | Active subscription |
| trialing | StatusTrialing | In trial |
| past_due | StatusPastDue | Payment failed |
| canceled | StatusCancelled | Cancelled |
| unpaid | StatusExpired | Failed setup |
| incomplete | StatusExpired | Failed setup |

### Stripe Interval → Billing Period

| Stripe | Local |
|--------|-------|
| day | PeriodDay |
| week | PeriodWeek |
| month | PeriodMonth |
| year | PeriodYear |

---

## Money Adapter

### ToStripeAmount

```go
func (a *StripeAdapter) ToStripeAmount(m Money) (currency string, amount int64, err error)
```

Converts Money to Stripe format:
- `Money{USD, 1050}` → `("usd", 1050)`

### FromStripeAmount

```go
func (a *StripeAdapter) FromStripeAmount(currency string, amount int64) (Money, error)
```

Converts Stripe response to Money:
- `("usd", 1050)` → `Money{USD, 1050}`

### ValidateStripeAmount

```go
func (a *StripeAdapter) ValidateStripeAmount(m Money) error
```

**Validation:**
- Must be fiat currency
- Amount ≥ 0
- Amount ≤ 99,999,999 cents ($999,999.99)

---

## Configuration

### StripeConfig

```go
type StripeConfig struct {
    SecretKey     string  // STRIPE_SECRET_KEY
    WebhookSecret string  // STRIPE_WEBHOOK_SECRET
    SuccessURL    string  // Default success redirect
    CancelURL     string  // Default cancel redirect
    TaxRateID     string  // Optional tax rate
}
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| STRIPE_SECRET_KEY | Yes | API secret key |
| STRIPE_WEBHOOK_SECRET | Yes | Webhook signing secret |
| STRIPE_SUCCESS_URL | No | Default success URL |
| STRIPE_CANCEL_URL | No | Default cancel URL |
| STRIPE_TAX_RATE_ID | No | Tax rate for items |

---

## Error Codes

| Code | Condition |
|------|-----------|
| ErrCodeStripeError | Stripe API error |
| ErrCodeInvalidSignature | Webhook signature invalid |
| ErrCodeSessionNotFound | Session not verified |
| ErrCodeCouponWrongPaymentMethod | Coupon not for Stripe |
| ErrCodeCouponNotApplicable | Coupon doesn't apply |

---

## Idempotency

**Payment Deduplication:**
- Signature format: `stripe:{session_id}`
- Stripe session IDs are globally unique
- Duplicate webhook → returns nil (success)

---

## Security

1. **Webhook Signature Validation**
   - HMAC SHA256 required
   - Tampering → error returned

2. **Resource Access Control**
   - `resource_id` required in metadata
   - Missing → webhook rejected

3. **Coupon Validation**
   - Server-side before Stripe
   - Must apply to product AND method

