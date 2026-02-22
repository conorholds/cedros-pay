-- PERF-006: Trigram indexes for order search
-- Query pattern: WHERE tenant_id = $1 AND (id ILIKE $3 OR purchase_id ILIKE $3 OR customer_email ILIKE $3)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS orders_id_trgm_idx
    ON orders USING GIN (id gin_trgm_ops);

CREATE INDEX IF NOT EXISTS orders_purchase_id_trgm_idx
    ON orders USING GIN (purchase_id gin_trgm_ops);

CREATE INDEX IF NOT EXISTS orders_customer_email_trgm_idx
    ON orders USING GIN (customer_email gin_trgm_ops);
