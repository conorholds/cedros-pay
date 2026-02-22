-- PERF-003: Add subscription stripe price index for product lookup
-- Query pattern: WHERE tenant_id = $2 AND subscription_stripe_price_id = $1
CREATE INDEX IF NOT EXISTS idx_products_tenant_subscription_stripe_price
    ON products(tenant_id, subscription_stripe_price_id);
