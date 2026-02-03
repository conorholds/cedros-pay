-- Add compound index for refund queries
--
-- NOTE: Foreign key constraints are NOT added for the following reasons:
--
-- 1. refund_quotes.original_purchase_id -> payment_transactions.signature
--    - Would require composite PK (tenant_id, signature) on payment_transactions
--    - This is a breaking schema change
--    - Application-level validation already enforces this in paywall/service.rs
--
-- 2. subscriptions.product_id -> products.id
--    - Products can be loaded from file configuration, not just database
--    - FK would break file-based product configurations
--    - This is an architectural constraint, not a schema oversight
--
-- Compound index for refund lookups (used in get_refund_by_original_purchase_id)
CREATE INDEX IF NOT EXISTS idx_refund_quotes_tenant_original
    ON refund_quotes(tenant_id, original_purchase_id);

-- Compound index for subscription product lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant_product_status
    ON subscriptions(tenant_id, product_id, status);
