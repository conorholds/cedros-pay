-- RS-HIGH-6: Add pg_trgm GIN indexes for ILIKE search on orders
-- These indexes speed up pattern matching queries used in order search/filtering.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_orders_customer_email_trgm
    ON orders USING gin (customer_email gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_orders_purchase_id_trgm
    ON orders USING gin (purchase_id gin_trgm_ops);
