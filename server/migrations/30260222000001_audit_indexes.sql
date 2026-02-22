-- Audit remediation: missing indexes and constraints
-- DB-03a: Partial index on inventory_reservations for SUM_ACTIVE_BY_PRODUCT
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_active_product
    ON inventory_reservations (tenant_id, product_id, expires_at)
    WHERE status = 'active';

-- DB-03b: Compound index on refund_quotes for lookups by original_purchase_id
CREATE INDEX IF NOT EXISTS idx_refund_quotes_tenant_original_purchase
    ON refund_quotes (tenant_id, original_purchase_id);

-- DB-03c: Compound index on stripe_refund_requests for lookups by original_purchase_id
CREATE INDEX IF NOT EXISTS idx_stripe_refund_requests_tenant_original_purchase
    ON stripe_refund_requests (tenant_id, original_purchase_id);

-- DB-03f: Unique constraint on customers(tenant_id, email)
-- Uses a partial unique index to allow NULL emails (NULL != NULL in SQL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_tenant_email_unique
    ON customers (tenant_id, email)
    WHERE email IS NOT NULL;
