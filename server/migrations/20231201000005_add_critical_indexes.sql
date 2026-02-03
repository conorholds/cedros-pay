-- Add missing critical indexes for production performance
-- These indexes address N+1 and slow query patterns identified in audit

-- Subscriptions: Compound index for LIST_BY_PRODUCT query
-- Query pattern: WHERE tenant_id = $1 AND product_id = $2
CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant_product
    ON subscriptions(tenant_id, product_id);

-- Subscriptions: Compound index for LIST_EXPIRING query
-- Query pattern: WHERE tenant_id = $1 AND current_period_end <= $2 AND status IN (...)
CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant_status_period_end
    ON subscriptions(tenant_id, status, current_period_end)
    WHERE status IN ('active', 'trialing', 'past_due');

-- Cart quotes: Compound index for tenant-isolated lookups
-- Query pattern: WHERE id = $1 AND tenant_id = $2
CREATE INDEX IF NOT EXISTS idx_cart_quotes_tenant
    ON cart_quotes(tenant_id);

-- Refund quotes: Compound index for tenant-isolated lookups
-- Query pattern: WHERE id = $1 AND tenant_id = $2
CREATE INDEX IF NOT EXISTS idx_refund_quotes_tenant
    ON refund_quotes(tenant_id);

-- Payment transactions: Compound index for HAS_ACCESS query
-- Query pattern: WHERE tenant_id = $1 AND resource_id = $2 AND wallet = $3 AND created_at > ...
CREATE INDEX IF NOT EXISTS idx_payment_transactions_tenant_resource_wallet
    ON payment_transactions(tenant_id, resource_id, wallet);

-- Payment transactions: Tenant isolation index
CREATE INDEX IF NOT EXISTS idx_payment_transactions_tenant
    ON payment_transactions(tenant_id);

-- Admin nonces: Tenant isolation index
CREATE INDEX IF NOT EXISTS idx_admin_nonces_tenant
    ON admin_nonces(tenant_id);

-- Webhook queue: Tenant isolation index
CREATE INDEX IF NOT EXISTS idx_webhook_queue_tenant
    ON webhook_queue(tenant_id);

-- Webhook DLQ: Tenant isolation index
CREATE INDEX IF NOT EXISTS idx_webhook_dlq_tenant
    ON webhook_dlq(tenant_id);

-- Subscriptions: Index for wallet-only lookups (GET_BY_WALLET)
-- The existing compound index (wallet, product_id) doesn't help wallet-only queries
CREATE INDEX IF NOT EXISTS idx_subscriptions_wallet
    ON subscriptions(wallet) WHERE wallet IS NOT NULL;

-- Coupons: Compound index for tenant + scope + active queries
CREATE INDEX IF NOT EXISTS idx_coupons_tenant_scope_active
    ON coupons(tenant_id, scope, active)
    WHERE active = TRUE;
