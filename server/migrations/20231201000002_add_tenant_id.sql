-- Add tenant_id column to all tables for multi-tenant isolation
-- Per spec (10-middleware.md): All database queries must include tenant filter

-- Payment transactions
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default';
CREATE INDEX IF NOT EXISTS idx_payment_transactions_tenant ON payment_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_tenant_resource ON payment_transactions(tenant_id, resource_id);

-- Cart quotes
ALTER TABLE cart_quotes ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default';
CREATE INDEX IF NOT EXISTS idx_cart_quotes_tenant ON cart_quotes(tenant_id);

-- Refund quotes
ALTER TABLE refund_quotes ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default';
CREATE INDEX IF NOT EXISTS idx_refund_quotes_tenant ON refund_quotes(tenant_id);

-- Admin nonces
ALTER TABLE admin_nonces ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default';
CREATE INDEX IF NOT EXISTS idx_admin_nonces_tenant ON admin_nonces(tenant_id);

-- Webhook queue
ALTER TABLE webhook_queue ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default';
CREATE INDEX IF NOT EXISTS idx_webhook_queue_tenant ON webhook_queue(tenant_id);

-- Subscriptions
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default';
CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant ON subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant_wallet ON subscriptions(tenant_id, wallet);
CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant_product ON subscriptions(tenant_id, product_id);

-- Webhook DLQ
ALTER TABLE webhook_dlq ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default';
CREATE INDEX IF NOT EXISTS idx_webhook_dlq_tenant ON webhook_dlq(tenant_id);

-- Products
ALTER TABLE products ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default';
CREATE INDEX IF NOT EXISTS idx_products_tenant ON products(tenant_id);

-- Coupons
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default';
CREATE INDEX IF NOT EXISTS idx_coupons_tenant ON coupons(tenant_id);
