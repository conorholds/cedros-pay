# Cedros Pay Server - Subscription Service

Complete specification for subscription management service.

---

## Service Structure

```go
type Service struct {
    repo             Repository
    gracePeriodHours int
}

func NewService(repo Repository, gracePeriodHours int) *Service
```

---

## Subscription Creation

### CreateStripeSubscription

```go
func (s *Service) CreateStripeSubscription(ctx context.Context, req CreateStripeSubscriptionRequest) (Subscription, error)
```

**Request:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| ProductID | string | Yes | Product identifier |
| StripeCustomerID | string | Yes | Stripe customer ID |
| StripeSubscriptionID | string | Yes | Stripe subscription ID |
| BillingPeriod | BillingPeriod | Yes | day/week/month/year |
| BillingInterval | int | Yes | Number of periods |
| CurrentPeriodEnd | time.Time | No | If empty, calculated from now |
| TrialEnd | *time.Time | No | Trial end date |
| Metadata | map[string]string | No | Custom metadata |

**Behavior:**
1. Generate unique UUID for subscription ID
2. If CurrentPeriodEnd not provided, calculate from now using period/interval
3. Set PaymentMethod to `PaymentMethodStripe`
4. If TrialEnd is in future, set Status to `StatusTrialing`, else `StatusActive`
5. Set CurrentPeriodStart to current time

---

### CreateX402Subscription

```go
func (s *Service) CreateX402Subscription(ctx context.Context, req CreateX402SubscriptionRequest) (Subscription, error)
```

**Request:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| ProductID | string | Yes | Product identifier |
| Wallet | string | Yes | Solana wallet address |
| BillingPeriod | BillingPeriod | Yes | day/week/month/year |
| BillingInterval | int | Yes | Number of periods |
| Metadata | map[string]string | No | Custom metadata |

**Behavior:**
1. Check if wallet already has active subscription for product
2. If exists, call `ExtendX402Subscription` instead
3. Otherwise, create new subscription with Status `StatusActive`

**Idempotency:** Prevents duplicate active subscriptions per wallet-product pair.

---

## x402 Subscription Renewal Flow

Unlike Stripe subscriptions which auto-renew, x402 subscriptions require explicit renewal:

**Renewal Workflow:**
```
1. User's subscription approaching expiration
2. Client calls POST /subscription/quote to get renewal quote
3. User pays via x402 (signs transaction)
4. Client calls POST /subscription/x402/activate with payment
5. Server extends subscription period
```

**Key Differences from Stripe:**

| Aspect | Stripe | x402 |
|--------|--------|------|
| Auto-renewal | Yes (card charged) | No (manual payment) |
| Failed payment handling | past_due status | N/A - no auto-charge |
| Grace period | Stripe-managed | Server-configured |
| Expiration notification | Stripe webhooks | Client must poll/check |
| Renewal timing | Automatic at period end | User-initiated |

**Renewal Before Expiration:**
- If subscription still active: New period starts at current period end (seamless)
- Result: Extended access without gap

**Renewal After Expiration:**
- If subscription expired: New period starts now
- Result: Gap in access between old end and new start

**No Auto-Renewal Implementation:**
- Background job (`ExpireOverdue`) marks expired x402 subscriptions
- Runs daily (configurable)
- Changes status from `active` → `expired`
- Does NOT attempt to charge user

---

### ExtendX402Subscription

```go
func (s *Service) ExtendX402Subscription(ctx context.Context, id string, period BillingPeriod, interval int) (Subscription, error)
```

**Behavior:**
1. Retrieve subscription by ID
2. If currently active: newStart = CurrentPeriodEnd (seamless)
3. If inactive: newStart = now (restart)
4. Calculate newEnd using `CalculatePeriodEnd`
5. Set Status to `StatusActive`

---

## Direct Lookups

### Get

```go
func (s *Service) Get(ctx context.Context, id string) (Subscription, error)
```

Direct subscription lookup by ID.

### GetByWallet

```go
func (s *Service) GetByWallet(ctx context.Context, wallet, productID string) (Subscription, error)
```

Get subscription by wallet address and product ID.

### GetByStripeSubscriptionID

```go
func (s *Service) GetByStripeSubscriptionID(ctx context.Context, stripeSubID string) (Subscription, error)
```

Get subscription by Stripe subscription ID.

---

## Access Control

### HasAccess

```go
func (s *Service) HasAccess(ctx context.Context, wallet, productID string) (bool, *Subscription, error)
```

**Returns:** (hasAccess bool, subscription *Subscription, error)

**Logic:**
1. Get subscription by wallet and product
2. If not found: return (false, nil, nil)
3. If `IsActive()` returns true: return (true, sub, nil)
4. If Status is Active but period ended:
   - Calculate gracePeriodEnd = CurrentPeriodEnd + gracePeriodHours
   - If now < gracePeriodEnd: return (true, sub, nil) - grace period
   - Otherwise: return (false, sub, nil)
5. Other statuses: return (false, sub, nil)

**Grace Period:** Extends access window after period end by configured hours.

**Grace Period Implementation Details:**
1. Grace period only applies when `gracePeriodHours > 0` is configured
2. Grace period only applies to x402 subscriptions (NOT Stripe - Stripe manages its own grace periods)
3. Grace period only applies when `Status == StatusActive` (not trialing, cancelled, etc.)
4. Calculation: `gracePeriodEnd = CurrentPeriodEnd + gracePeriodHours`
5. If `now < gracePeriodEnd`, access is granted even though period has technically ended
6. During grace period, `IsActive()` returns false but `HasAccess()` returns true

**Grace Period Scope:**

| Payment Method | Grace Period Applies | Reason |
|----------------|---------------------|--------|
| x402 | Yes (if configured) | No auto-renewal, user needs time to renew |
| Stripe | No | Stripe has its own retry/dunning process |

**Grace Period Configuration:**
```yaml
subscriptions:
  grace_period_hours: 72   # 3 days grace for x402
```

**Grace Period Status During:**
- Status remains `active` (not changed to `expired` yet)
- `CurrentPeriodEnd` is in the past
- Access is granted based on `gracePeriodEnd` calculation
- After grace period ends: `ExpireOverdue()` job changes status to `expired`

**No Webhook During Grace:**
- No webhook event fired when entering grace period
- Webhook fired when status changes to `expired` (after grace ends)

---

### HasStripeAccess

```go
func (s *Service) HasStripeAccess(ctx context.Context, stripeSubID string) (bool, *Subscription, error)
```

**Behavior:**
- Retrieves by Stripe subscription ID
- Checks `IsActive()` directly
- Does NOT apply grace period (Stripe manages its own)

---

## Cancellation

### Cancel

```go
func (s *Service) Cancel(ctx context.Context, id string, atPeriodEnd bool) error
```

**Behavior:**
- If `atPeriodEnd=true`: Sets CancelAtPeriodEnd=true (future cancellation)
- If `atPeriodEnd=false`: Updates status to `StatusCancelled` immediately

---

## Stripe Webhook Handlers

### HandleStripeRenewal

```go
func (s *Service) HandleStripeRenewal(ctx context.Context, stripeSubID string, periodStart, periodEnd time.Time) error
```

**Trigger:** Stripe `invoice.paid` webhook

**Behavior:**
1. Get subscription by Stripe subscription ID
2. Update CurrentPeriodStart and CurrentPeriodEnd
3. Set Status to `StatusActive`

---

### HandleStripePaymentFailed

```go
func (s *Service) HandleStripePaymentFailed(ctx context.Context, stripeSubID string) error
```

**Trigger:** Stripe `invoice.payment_failed` webhook

**Behavior:** Updates status to `StatusPastDue`

---

### HandleStripeCancelled

```go
func (s *Service) HandleStripeCancelled(ctx context.Context, stripeSubID string) error
```

**Trigger:** Stripe `customer.subscription.deleted` webhook

**Behavior:** Updates status to `StatusCancelled` with timestamp

---

### HandleStripeSubscriptionUpdated

```go
func (s *Service) HandleStripeSubscriptionUpdated(ctx context.Context, stripeSubID string, update StripeSubscriptionUpdate) error
```

**Update Fields:**
| Field | Type | Description |
|-------|------|-------------|
| Status | Status | New status (optional) |
| CurrentPeriodStart | time.Time | New period start (optional) |
| CurrentPeriodEnd | time.Time | New period end (optional) |
| CancelAtPeriodEnd | bool | Scheduled for cancellation |
| CancelledAt | *time.Time | Cancellation timestamp |
| NewProductID | string | For plan changes |
| BillingPeriod | BillingPeriod | New billing period |
| BillingInterval | int | New interval |

**Plan Change Handling:**
- If NewProductID differs from current, stores previous in metadata
- Adds `previous_product` and `changed_at` to metadata

---

## Batch Operations

### ListExpiring

```go
func (s *Service) ListExpiring(ctx context.Context, within time.Duration) ([]Subscription, error)
```

Returns subscriptions expiring within the given duration.

---

### ExpireOverdue

```go
func (s *Service) ExpireOverdue(ctx context.Context) (int, error)
```

**Behavior:**
1. Find all subscriptions past their period end
2. **Only process x402 subscriptions** (Stripe managed by webhooks)
3. Update each to `StatusExpired`
4. Return count of expired subscriptions

---

## Plan Changes

### ChangeSubscription

```go
func (s *Service) ChangeSubscription(ctx context.Context, req ChangeSubscriptionRequest) (*ChangeSubscriptionResult, error)
```

**Request:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| SubscriptionID | string | Yes | Subscription to change |
| NewProductID | string | Yes | New product/plan |
| NewPriceID | string | No | Stripe price ID |
| NewBillingPeriod | BillingPeriod | No | New period |
| NewBillingInterval | int | No | New interval |
| ProrationBehavior | string | No | Stripe proration |
| Metadata | map[string]string | No | Additional metadata |

**Result:**
```go
type ChangeSubscriptionResult struct {
    Subscription     Subscription
    PreviousProduct  string
    NewProduct       string
    EffectiveDate    time.Time
    ProrationAmount  int64
}
```

---

### ReactivateSubscription

```go
func (s *Service) ReactivateSubscription(ctx context.Context, id string) (Subscription, error)
```

**Preconditions:**
- CancelAtPeriodEnd must be true
- Current time must be <= CurrentPeriodEnd

**Behavior:**
1. Sets CancelAtPeriodEnd to false
2. Clears CancelledAt
3. Sets Status to `StatusActive`

---

## Data Types

### Status Enum

| Constant | Description |
|----------|-------------|
| StatusActive | Active, grants access |
| StatusTrialing | In trial period, grants access |
| StatusPastDue | Payment failed, still grants access |
| StatusCancelled | User-cancelled, no access |
| StatusExpired | Period ended, no access |

### BillingPeriod Enum

| Constant | Description |
|----------|-------------|
| PeriodDay | Daily billing |
| PeriodWeek | Weekly billing |
| PeriodMonth | Monthly billing |
| PeriodYear | Yearly billing |

### PaymentMethod Enum

| Constant | Description |
|----------|-------------|
| PaymentMethodStripe | Stripe (fiat) |
| PaymentMethodX402 | Solana (crypto) |

---

## Subscription Model

```go
type Subscription struct {
    ID                   string
    ProductID            string
    Wallet               string              // x402 only
    StripeCustomerID     string              // Stripe only
    StripeSubscriptionID string              // Stripe only
    PaymentMethod        PaymentMethod
    BillingPeriod        BillingPeriod
    BillingInterval      int
    Status               Status
    CurrentPeriodStart   time.Time
    CurrentPeriodEnd     time.Time
    TrialEnd             *time.Time
    CancelledAt          *time.Time
    CancelAtPeriodEnd    bool
    Metadata             map[string]string
    CreatedAt            time.Time
    UpdatedAt            time.Time
}
```

### IsActive Method

```go
func (s *Subscription) IsActive() bool
```

Returns true only if:
1. Status is Active, Trialing, or PastDue
2. Current time is within CurrentPeriodStart and CurrentPeriodEnd

**Note:** Does NOT check grace period (handled in Service.HasAccess)

---

## Helper Functions

### CalculatePeriodEnd

```go
func CalculatePeriodEnd(start time.Time, period BillingPeriod, interval int) time.Time
```

| Period | Calculation |
|--------|-------------|
| Day | start.AddDate(0, 0, interval) |
| Week | start.AddDate(0, 0, interval*7) |
| Month | start.AddDate(0, interval, 0) |
| Year | start.AddDate(interval, 0, 0) |

**Period Calculation Examples:**

| Start Date | Period | Interval | End Date | Notes |
|------------|--------|----------|----------|-------|
| 2025-12-15 10:30:00 | Day | 1 | 2025-12-16 10:30:00 | Next day, same time |
| 2025-12-15 10:30:00 | Day | 7 | 2025-12-22 10:30:00 | 7 days later |
| 2025-12-15 10:30:00 | Week | 2 | 2025-12-29 10:30:00 | 14 days later |
| 2025-01-31 10:30:00 | Month | 1 | 2025-02-28 10:30:00 | Feb has no 31st |
| 2025-01-31 10:30:00 | Month | 3 | 2025-04-30 10:30:00 | Apr has no 31st |
| 2024-02-29 10:30:00 | Year | 1 | 2025-02-28 10:30:00 | Non-leap year |

**Month-End Handling:**
- Go's `AddDate` automatically adjusts for shorter months
- January 31 + 1 month = February 28 (or 29 in leap year)
- All dates stay valid calendar dates
- Time of day is preserved exactly

**Timezone Handling:**
- All times stored in UTC
- Period calculations performed in UTC
- Display formatting is client responsibility

---

## Repository Interface

```go
type Repository interface {
    Create(ctx context.Context, sub Subscription) error
    Get(ctx context.Context, id string) (Subscription, error)
    Update(ctx context.Context, sub Subscription) error
    Delete(ctx context.Context, id string) error
    GetByWallet(ctx context.Context, wallet, productID string) (Subscription, error)
    GetByStripeSubscriptionID(ctx context.Context, stripeSubID string) (Subscription, error)
    GetByStripeCustomerID(ctx context.Context, customerID string) ([]Subscription, error)
    ListByProduct(ctx context.Context, productID string) ([]Subscription, error)
    ListActive(ctx context.Context, productID string) ([]Subscription, error)
    ListExpiring(ctx context.Context, before time.Time) ([]Subscription, error)
    UpdateStatus(ctx context.Context, id string, status Status) error
    ExtendPeriod(ctx context.Context, id string, newStart, newEnd time.Time) error
    Close() error
}
```

---

## Database Schema

```sql
CREATE TABLE subscriptions (
    id                     VARCHAR PRIMARY KEY,
    product_id             VARCHAR NOT NULL,
    wallet                 VARCHAR,
    stripe_customer_id     VARCHAR,
    stripe_subscription_id VARCHAR UNIQUE,
    payment_method         VARCHAR NOT NULL,
    billing_period         VARCHAR NOT NULL,
    billing_interval       INTEGER NOT NULL,
    status                 VARCHAR NOT NULL,
    current_period_start   TIMESTAMP NOT NULL,
    current_period_end     TIMESTAMP NOT NULL,
    trial_end              TIMESTAMP,
    cancelled_at           TIMESTAMP,
    cancel_at_period_end   BOOLEAN DEFAULT FALSE,
    metadata               JSONB,
    created_at             TIMESTAMP NOT NULL,
    updated_at             TIMESTAMP NOT NULL
);

CREATE INDEX idx_subscriptions_wallet_product
    ON subscriptions(wallet, product_id) WHERE wallet IS NOT NULL;
CREATE INDEX idx_subscriptions_stripe_customer
    ON subscriptions(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_period_end ON subscriptions(current_period_end);
```

---

## Access Checking Summary

| Status | IsActive() | HasAccess (in period) | HasAccess (grace period) |
|--------|-----------|----------------------|--------------------------|
| Active | true | true | true |
| Trialing | true | true | false |
| PastDue | true | true | true |
| Cancelled | false | false | false |
| Expired | false | false | false |

