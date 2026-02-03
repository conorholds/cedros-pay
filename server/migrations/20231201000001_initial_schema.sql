-- Cedros Pay Server - Initial Database Schema
-- This migration creates all tables required for the storage backend

-- Payment transactions (replay protection)
CREATE TABLE IF NOT EXISTS payment_transactions (
    signature TEXT PRIMARY KEY,
    resource_id TEXT NOT NULL,
    wallet TEXT NOT NULL,
    amount BIGINT NOT NULL,
    amount_asset TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_resource ON payment_transactions(resource_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_wallet ON payment_transactions(wallet);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_created ON payment_transactions(created_at);

-- Cart quotes
CREATE TABLE IF NOT EXISTS cart_quotes (
    id TEXT PRIMARY KEY,
    items JSONB NOT NULL DEFAULT '[]',
    total_amount BIGINT NOT NULL,
    total_asset TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    wallet_paid_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_cart_quotes_expires ON cart_quotes(expires_at);

-- Refund quotes
CREATE TABLE IF NOT EXISTS refund_quotes (
    id TEXT PRIMARY KEY,
    original_purchase_id TEXT NOT NULL,
    recipient_wallet TEXT NOT NULL,
    amount BIGINT NOT NULL,
    amount_asset TEXT NOT NULL,
    reason TEXT,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    processed_by TEXT,
    processed_at TIMESTAMPTZ,
    signature TEXT
);

CREATE INDEX IF NOT EXISTS idx_refund_quotes_expires ON refund_quotes(expires_at);
CREATE INDEX IF NOT EXISTS idx_refund_quotes_original ON refund_quotes(original_purchase_id);
CREATE INDEX IF NOT EXISTS idx_refund_quotes_pending ON refund_quotes(processed_at) WHERE processed_at IS NULL;

-- Admin nonces (replay protection for admin operations)
CREATE TABLE IF NOT EXISTS admin_nonces (
    id TEXT PRIMARY KEY,
    purpose TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_admin_nonces_expires ON admin_nonces(expires_at);

-- Webhook queue
CREATE TABLE IF NOT EXISTS webhook_queue (
    id TEXT PRIMARY KEY,
    url TEXT NOT NULL,
    payload JSONB NOT NULL,
    headers JSONB NOT NULL DEFAULT '{}',
    event_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 5,
    last_error TEXT,
    last_attempt_at TIMESTAMPTZ,
    next_attempt_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_webhook_queue_status ON webhook_queue(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_webhook_queue_next_attempt ON webhook_queue(next_attempt_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_webhook_queue_created ON webhook_queue(created_at);

-- Idempotency keys
CREATE TABLE IF NOT EXISTS idempotency_keys (
    key TEXT PRIMARY KEY,
    status_code INTEGER NOT NULL,
    headers JSONB NOT NULL DEFAULT '{}',
    body BYTEA NOT NULL,
    cached_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_idempotency_keys_expires ON idempotency_keys(expires_at);

-- Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    wallet TEXT,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT UNIQUE,
    payment_method TEXT NOT NULL DEFAULT 'stripe',
    billing_period TEXT NOT NULL DEFAULT 'month',
    billing_interval INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'active',
    current_period_start TIMESTAMPTZ NOT NULL,
    current_period_end TIMESTAMPTZ NOT NULL,
    trial_end TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_wallet_product ON subscriptions(wallet, product_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_period_end ON subscriptions(current_period_end);

-- Products (optional, for database-backed product repository)
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL DEFAULT 'default',
    description TEXT,
    fiat_amount BIGINT,
    fiat_currency TEXT,
    stripe_price_id TEXT,
    crypto_amount BIGINT,
    crypto_token TEXT,
    crypto_account TEXT,
    memo_template TEXT,
    metadata JSONB NOT NULL DEFAULT '{}',
    active BOOLEAN NOT NULL DEFAULT TRUE,
    subscription_config JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_tenant ON products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_tenant_active ON products(tenant_id, active);
CREATE INDEX IF NOT EXISTS idx_products_stripe ON products(stripe_price_id);

-- Coupons (optional, for database-backed coupon repository)
CREATE TABLE IF NOT EXISTS coupons (
    code TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL DEFAULT 'default',
    discount_type TEXT NOT NULL,
    discount_value DOUBLE PRECISION NOT NULL,
    currency TEXT,
    scope TEXT NOT NULL DEFAULT 'all',
    product_ids JSONB NOT NULL DEFAULT '[]',
    payment_method TEXT,
    auto_apply BOOLEAN NOT NULL DEFAULT FALSE,
    applies_at TEXT NOT NULL DEFAULT 'subtotal',
    usage_limit INTEGER,
    usage_count INTEGER NOT NULL DEFAULT 0,
    starts_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coupons_tenant ON coupons(tenant_id);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON coupons(active);
CREATE INDEX IF NOT EXISTS idx_coupons_auto_apply ON coupons(auto_apply) WHERE auto_apply = TRUE;
CREATE INDEX IF NOT EXISTS idx_coupons_expires ON coupons(expires_at);
CREATE INDEX IF NOT EXISTS idx_coupons_product_ids ON coupons USING GIN (product_ids);

-- Stripe sessions (for tracking checkout sessions)
CREATE TABLE IF NOT EXISTS stripe_sessions (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL DEFAULT 'default',
    resource_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    amount_cents BIGINT,
    currency TEXT,
    customer_email TEXT,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_stripe_sessions_tenant_resource ON stripe_sessions(tenant_id, resource_id);
CREATE INDEX IF NOT EXISTS idx_stripe_sessions_tenant_status ON stripe_sessions(tenant_id, status);

-- Webhook dead letter queue (DLQ)
CREATE TABLE IF NOT EXISTS webhook_dlq (
    id TEXT PRIMARY KEY,
    original_webhook_id TEXT NOT NULL,
    url TEXT NOT NULL,
    payload JSONB NOT NULL,
    headers JSONB NOT NULL DEFAULT '{}',
    event_type TEXT NOT NULL,
    final_error TEXT NOT NULL,
    total_attempts INTEGER NOT NULL,
    first_attempt_at TIMESTAMPTZ NOT NULL,
    last_attempt_at TIMESTAMPTZ NOT NULL,
    moved_to_dlq_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_dlq_event_type ON webhook_dlq(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_dlq_moved_at ON webhook_dlq(moved_to_dlq_at);
