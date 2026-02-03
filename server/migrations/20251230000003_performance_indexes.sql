-- PERF-001: Add created_at to payment access check index
-- Query pattern: WHERE tenant_id = $1 AND resource_id = $2 AND wallet = $3 AND created_at > ...
-- The existing idx_payment_transactions_tenant_resource_wallet is good but
-- adding created_at DESC allows efficient time-filtered access checks.
CREATE INDEX IF NOT EXISTS idx_payment_transactions_access_check
    ON payment_transactions(tenant_id, resource_id, wallet, created_at DESC);

-- PERF-002: Optimized subscription lookup by wallet + product
-- Query pattern: WHERE tenant_id = $1 AND wallet = $2 AND product_id = $3 AND status IN (...)
-- This compound index covers the GET_BY_WALLET_PRODUCT query efficiently.
CREATE INDEX IF NOT EXISTS idx_subscriptions_wallet_product_status
    ON subscriptions(tenant_id, wallet, product_id, status)
    WHERE status IN ('active', 'trialing', 'past_due');

-- Note: In dev/test we run migrations in a transaction via sqlx.
-- Avoid CONCURRENTLY so migrations are runnable everywhere.
