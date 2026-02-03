# Cedros Pay Server - Storage Layer

Storage interfaces and database schema.

---

## Storage Interface

### Store Interface Methods

#### Cart Quote Operations

| Method | Description |
|--------|-------------|
| `SaveCartQuote(ctx, quote)` | Single quote save |
| `GetCartQuote(ctx, cartID)` | Get by ID |
| `MarkCartPaid(ctx, cartID, wallet)` | Mark as paid |
| `HasCartAccess(ctx, cartID, wallet)` | Check access |
| `SaveCartQuotes(ctx, quotes)` | Batch save (atomic) |
| `GetCartQuotes(ctx, cartIDs)` | Batch get |

#### Refund Quote Operations

| Method | Description |
|--------|-------------|
| `SaveRefundQuote(ctx, quote)` | Save refund request |
| `GetRefundQuote(ctx, refundID)` | Get by ID |
| `GetRefundQuoteByOriginalPurchaseID(ctx, id)` | Get by original tx |
| `ListPendingRefunds(ctx)` | List unprocessed refunds |
| `MarkRefundProcessed(ctx, refundID, processedBy, signature)` | Mark completed |
| `DeleteRefundQuote(ctx, refundID)` | Remove refund |
| `SaveRefundQuotes(ctx, quotes)` | Batch save |

#### Order Operations

| Method | Description |
|--------|-------------|
| `TryStoreOrder(ctx, order)` | Insert order if absent (idempotent) |
| `GetOrder(ctx, orderID)` | Get by ID |
| `ListOrders(ctx, limit, offset)` | List recent orders |
| `ListOrdersFiltered(ctx, status, search, createdBefore, createdAfter)` | Filtered list + total |
| `UpdateOrderStatus(ctx, orderID, status, statusUpdatedAt, updatedAt)` | Update status |
| `AppendOrderHistory(ctx, entry)` | Record status transition |
| `ListOrderHistory(ctx, orderID, limit)` | List history entries |

#### Fulfillment Operations

| Method | Description |
|--------|-------------|
| `CreateFulfillment(ctx, fulfillment)` | Create fulfillment record |
| `ListFulfillments(ctx, orderID, limit)` | List fulfillments |
| `UpdateFulfillmentStatus(ctx, fulfillmentID, status, ...)` | Update status + tracking |

#### Inventory Reservation Operations

| Method | Description |
|--------|-------------|
| `ReserveInventory(ctx, reservation)` | Create reservation |
| `ListActiveReservationsForCart(ctx, cartID)` | List active reservations |
| `ReleaseInventoryReservations(ctx, cartID, releasedAt)` | Release (active → released) |
| `ConvertInventoryReservations(ctx, cartID, convertedAt)` | Convert to sale |
| `CleanupExpiredInventoryReservations(ctx, now)` | Release expired reservations |

#### Payment Transaction Operations (Replay Protection)

| Method | Description |
|--------|-------------|
| `RecordPayment(ctx, tx)` | Record verified payment |
| `HasPaymentBeenProcessed(ctx, signature)` | Check if signature used |
| `GetPayment(ctx, signature)` | Get by signature |
| `RecordPayments(ctx, txs)` | Batch record |
| `ArchiveOldPayments(ctx, olderThan)` | Cleanup old signatures |

#### Admin Nonce Operations (Replay Protection)

| Method | Description |
|--------|-------------|
| `CreateNonce(ctx, nonce)` | Create one-time nonce |
| `ConsumeNonce(ctx, nonceID)` | Mark nonce as used |
| `CleanupExpiredNonces(ctx)` | Delete expired nonces |

#### Webhook Queue Operations

| Method | Description |
|--------|-------------|
| `EnqueueWebhook(ctx, webhook)` | Add to queue |
| `DequeueWebhooks(ctx, limit)` | Get ready webhooks |
| `MarkWebhookProcessing(ctx, webhookID)` | Mark in-progress |
| `MarkWebhookSuccess(ctx, webhookID)` | Mark delivered |
| `MarkWebhookFailed(ctx, webhookID, errorMsg, nextAttemptAt)` | Record failure |
| `GetWebhook(ctx, webhookID)` | Get by ID |
| `ListWebhooks(ctx, status, limit)` | List with filter |
| `RetryWebhook(ctx, webhookID)` | Reset for manual retry |
| `DeleteWebhook(ctx, webhookID)` | Remove from queue |

#### Idempotency Operations (Optional)

| Method | Description |
|--------|-------------|
| `SaveIdempotencyKey(ctx, key, response, ttl)` | Store response for idempotency key |
| `GetIdempotencyKey(ctx, key)` | Get cached response if exists |
| `DeleteIdempotencyKey(ctx, key)` | Remove idempotency key |
| `CleanupExpiredIdempotencyKeys(ctx)` | Delete keys older than TTL |

#### Lifecycle

| Method | Description |
|--------|-------------|
| `Close()` | Close connections and cleanup |

## Product Repository Interface

| Method | Description |
|--------|-------------|
| `GetProduct(ctx, id)` | Get product by ID |
| `GetProductByStripePriceID(ctx, stripePriceID)` | Get by Stripe Price ID |
| `ListProducts(ctx)` | List all active products |
| `CreateProduct(ctx, product)` | Create new product |
| `UpdateProduct(ctx, product)` | Update existing product |
| `DeleteProduct(ctx, id)` | Soft-delete (sets active=false) |
| `Close()` | Close connections |

---

## Coupon Repository Interface

| Method | Description |
|--------|-------------|
| `GetCoupon(ctx, code)` | Get coupon by code |
| `ListCoupons(ctx)` | List all active coupons |
| `GetAutoApplyCouponsForPayment(ctx, productID, paymentMethod)` | Get auto-apply coupons for product |
| `GetAllAutoApplyCouponsForPayment(ctx, paymentMethod)` | Map of productID → coupons |
| `CreateCoupon(ctx, coupon)` | Create new coupon |
| `UpdateCoupon(ctx, coupon)` | Update existing coupon |
| `IncrementUsage(ctx, code)` | Atomically increment usage count |
| `DeleteCoupon(ctx, code)` | Soft-delete (sets active=false) |
| `Close()` | Close connections |

---

## Subscription Repository Interface

| Method | Description |
|--------|-------------|
| `Create(ctx, sub)` | Create new subscription |
| `Get(ctx, id)` | Get by ID |
| `Update(ctx, sub)` | Update subscription |
| `Delete(ctx, id)` | Soft delete (set status=cancelled) |
| `GetByWallet(ctx, wallet, productID)` | Get active subscription for wallet/product |
| `GetByStripeSubscriptionID(ctx, stripeSubID)` | Get by Stripe sub ID |
| `GetByStripeCustomerID(ctx, customerID)` | Get all subs for Stripe customer |
| `ListByProduct(ctx, productID)` | List all subs for product |
| `ListActive(ctx, productID)` | List active subs (optionally filter by product) |
| `ListExpiring(ctx, before)` | List subs expiring before time |
| `UpdateStatus(ctx, id, status)` | Update status only |
| `ExtendPeriod(ctx, id, newStart, newEnd)` | Update period dates |
| `Close()` | Close connections |

---

## Database Schema

### stripe_sessions

```sql
CREATE TABLE stripe_sessions (
    id TEXT PRIMARY KEY,
    tenant_id TEXT DEFAULT 'default',
    resource_id TEXT,
    status TEXT,  -- pending, completed, expired
    amount_cents BIGINT,
    currency TEXT,
    customer_email TEXT,
    metadata JSONB,
    created_at TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE INDEX idx_stripe_sessions_tenant_resource ON stripe_sessions(tenant_id, resource_id);
CREATE INDEX idx_stripe_sessions_tenant_status ON stripe_sessions(tenant_id, status);
```

### payment_transactions

```sql
CREATE TABLE payment_transactions (
    signature TEXT PRIMARY KEY,
    tenant_id TEXT,
    resource_id TEXT,
    wallet TEXT,
    amount BIGINT,
    amount_asset TEXT,
    created_at TIMESTAMP,
    metadata JSONB
);

CREATE INDEX idx_payment_transactions_tenant ON payment_transactions(tenant_id);
CREATE INDEX idx_payment_transactions_tenant_resource ON payment_transactions(tenant_id, resource_id);
CREATE INDEX idx_payment_transactions_tenant_wallet ON payment_transactions(tenant_id, wallet);
CREATE INDEX idx_payment_transactions_tenant_created ON payment_transactions(tenant_id, created_at);
```

### cart_quotes

```sql
CREATE TABLE cart_quotes (
    id TEXT PRIMARY KEY,
    tenant_id TEXT,
    items JSONB,
    total_amount BIGINT,
    total_asset TEXT,
    metadata JSONB,
    created_at TIMESTAMP,
    expires_at TIMESTAMP,
    wallet_paid_by TEXT
);

CREATE INDEX idx_cart_quotes_tenant ON cart_quotes(tenant_id);
CREATE INDEX idx_cart_quotes_tenant_expires ON cart_quotes(tenant_id, expires_at);
```

### refund_quotes

```sql
CREATE TABLE refund_quotes (
    id TEXT PRIMARY KEY,
    tenant_id TEXT,
    original_purchase_id TEXT,
    recipient_wallet TEXT,
    amount BIGINT,
    amount_asset TEXT,
    token TEXT,
    token_mint TEXT,
    token_decimals SMALLINT,
    status TEXT,  -- pending, approved, denied, processed
    processed_by TEXT,
    processed_at TIMESTAMP,
    signature TEXT,
    reason TEXT,
    metadata JSONB,
    created_at TIMESTAMP,
    expires_at TIMESTAMP
);

CREATE INDEX idx_refund_quotes_tenant ON refund_quotes(tenant_id);
CREATE INDEX idx_refund_quotes_tenant_expires ON refund_quotes(tenant_id, expires_at);
CREATE INDEX idx_refund_quotes_tenant_original ON refund_quotes(tenant_id, original_purchase_id);
```

### orders

```sql
CREATE TABLE orders (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    source TEXT NOT NULL,
    purchase_id TEXT NOT NULL,
    resource_id TEXT NOT NULL,
    user_id TEXT,
    customer TEXT,
    status TEXT NOT NULL,
    items JSONB NOT NULL,
    amount BIGINT NOT NULL,
    amount_asset TEXT NOT NULL,
    customer_email TEXT,
    shipping JSONB,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ,
    status_updated_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX orders_tenant_source_purchase_uidx
    ON orders (tenant_id, source, purchase_id);

CREATE INDEX orders_tenant_created_at_idx
    ON orders (tenant_id, created_at DESC);
```

### order_history

```sql
CREATE TABLE order_history (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    order_id TEXT NOT NULL,
    from_status TEXT NOT NULL,
    to_status TEXT NOT NULL,
    note TEXT,
    actor TEXT,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX order_history_tenant_order_idx
    ON order_history (tenant_id, order_id, created_at DESC);
```

### fulfillments

```sql
CREATE TABLE fulfillments (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    order_id TEXT NOT NULL,
    status TEXT NOT NULL,
    carrier TEXT,
    tracking_number TEXT,
    tracking_url TEXT,
    items JSONB NOT NULL,
    shipped_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ
);

CREATE INDEX fulfillments_tenant_order_idx
    ON fulfillments (tenant_id, order_id, created_at DESC);
```

### inventory_reservations

```sql
CREATE TABLE inventory_reservations (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    cart_id TEXT,
    status TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX inventory_reservations_tenant_product_idx
    ON inventory_reservations (tenant_id, product_id, created_at DESC);
CREATE INDEX inventory_reservations_tenant_cart_idx
    ON inventory_reservations (tenant_id, cart_id, created_at DESC);
```

### admin_nonces

```sql
CREATE TABLE admin_nonces (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL DEFAULT 'default',
    purpose TEXT NOT NULL,        -- Action type (e.g., "list-pending-refunds", "approve-refund")
    created_at TIMESTAMP NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    consumed_at TIMESTAMP
);

CREATE INDEX idx_admin_nonces_tenant ON admin_nonces(tenant_id);
CREATE INDEX idx_admin_nonces_tenant_expires ON admin_nonces(tenant_id, expires_at);
```

**Note:** The `purpose` field stores the intended action for the nonce (e.g., "list-pending-refunds", "approve-refund"). This prevents nonce reuse across different operations.

### webhook_queue

```sql
CREATE TABLE webhook_queue (
    id TEXT PRIMARY KEY,
    url TEXT,
    payload JSONB,
    headers JSONB,
    event_type TEXT,
    status TEXT,  -- pending, processing, success, failed
    attempts INTEGER,
    max_attempts INTEGER,
    last_error TEXT,
    last_attempt_at TIMESTAMP,
    next_attempt_at TIMESTAMP,
    created_at TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE INDEX idx_webhook_queue_status ON webhook_queue(status) WHERE status = 'pending';
CREATE INDEX idx_webhook_queue_created ON webhook_queue(created_at);
CREATE INDEX idx_webhook_queue_completed ON webhook_queue(completed_at);
```

### products

```sql
CREATE TABLE products (
    id TEXT PRIMARY KEY,
    tenant_id TEXT,
    description TEXT,
    fiat_amount BIGINT,
    fiat_currency TEXT,
    stripe_price_id TEXT,
    crypto_amount BIGINT,
    crypto_token TEXT,
    crypto_account TEXT,
    memo_template TEXT,
    metadata JSONB,
    active BOOLEAN,
    subscription_config JSONB,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE INDEX idx_products_tenant ON products(tenant_id);
CREATE INDEX idx_products_tenant_active ON products(tenant_id, active);
CREATE INDEX idx_products_tenant_stripe ON products(tenant_id, stripe_price_id);
```

### coupons

```sql
CREATE TABLE coupons (
    code TEXT PRIMARY KEY,
    tenant_id TEXT,
    discount_type TEXT,
    discount_value DOUBLE PRECISION,
    currency TEXT,
    scope TEXT,
    product_ids JSONB,
    payment_method TEXT,
    auto_apply BOOLEAN,
    applies_at TEXT,
    usage_limit INTEGER,
    usage_count INTEGER,
    starts_at TIMESTAMP,
    expires_at TIMESTAMP,
    active BOOLEAN,
    metadata JSONB,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE INDEX idx_coupons_active ON coupons(active);
CREATE INDEX idx_coupons_auto_apply ON coupons(auto_apply) WHERE auto_apply = true;
CREATE INDEX idx_coupons_expires ON coupons(expires_at);
CREATE INDEX idx_coupons_product_ids ON coupons USING GIN (product_ids);
```

### subscriptions

```sql
CREATE TABLE subscriptions (
    id TEXT PRIMARY KEY,
    product_id TEXT,
    wallet TEXT,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT UNIQUE,
    payment_method TEXT,
    billing_period TEXT,
    billing_interval INTEGER,
    status TEXT,
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    trial_end TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN,
    metadata JSONB,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);

CREATE INDEX idx_subscriptions_wallet_product ON subscriptions(wallet, product_id);
CREATE INDEX idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_period_end ON subscriptions(current_period_end);
```

---

## Schema Mapping Configuration

Custom table/collection names can be configured:

| Config Path | Default | Description |
|-------------|---------|-------------|
| `storage.schema_mapping.payments.table_name` | `payment_transactions` | Payment ledger |
| `storage.schema_mapping.sessions.table_name` | `stripe_sessions` | Stripe sessions |
| `storage.schema_mapping.products.table_name` | `products` | Products |
| `storage.schema_mapping.coupons.table_name` | `coupons` | Coupons |
| `storage.schema_mapping.cart_quotes.table_name` | `cart_quotes` | Cart quotes |
| `storage.schema_mapping.refund_quotes.table_name` | `refund_quotes` | Refund quotes |
| `storage.schema_mapping.admin_nonces.table_name` | `admin_nonces` | Admin nonces |
| `storage.schema_mapping.webhook_queue.table_name` | `webhook_queue` | Webhook queue |

---

## Archival Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `CEDROS_STORAGE_ARCHIVAL_ENABLED` | `false` | Enable automatic archival |
| `CEDROS_STORAGE_ARCHIVAL_RETENTION_PERIOD` | `2160h` | Keep signatures (90 days) |
| `CEDROS_STORAGE_ARCHIVAL_RUN_INTERVAL` | `24h` | Archival cleanup frequency |
