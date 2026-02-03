-- Add missing columns and indices per spec (06-data-models-storage.md, 08-storage.md)

-- ─────────────────────────────────────────────────────────────────────────────
-- RefundQuotes: Add token columns per spec (06-data-models-storage.md lines 226-231)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE refund_quotes ADD COLUMN IF NOT EXISTS token TEXT;
ALTER TABLE refund_quotes ADD COLUMN IF NOT EXISTS token_mint TEXT;
ALTER TABLE refund_quotes ADD COLUMN IF NOT EXISTS token_decimals SMALLINT;

-- ─────────────────────────────────────────────────────────────────────────────
-- Missing indices per spec (08-storage.md)
-- ─────────────────────────────────────────────────────────────────────────────

-- Payment transactions: additional tenant-based indices
CREATE INDEX IF NOT EXISTS idx_payment_transactions_tenant_wallet ON payment_transactions(tenant_id, wallet);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_tenant_created ON payment_transactions(tenant_id, created_at);

-- Cart quotes: tenant + expires compound index
CREATE INDEX IF NOT EXISTS idx_cart_quotes_tenant_expires ON cart_quotes(tenant_id, expires_at);

-- Refund quotes: tenant + expires compound index and tenant + original compound index
CREATE INDEX IF NOT EXISTS idx_refund_quotes_tenant_expires ON refund_quotes(tenant_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_refund_quotes_tenant_original ON refund_quotes(tenant_id, original_purchase_id);

-- Admin nonces: tenant + expires compound index
CREATE INDEX IF NOT EXISTS idx_admin_nonces_tenant_expires ON admin_nonces(tenant_id, expires_at);

-- Webhook queue: completed_at index for cleanup
CREATE INDEX IF NOT EXISTS idx_webhook_queue_completed ON webhook_queue(completed_at);

-- Products: tenant + stripe_price_id compound index
CREATE INDEX IF NOT EXISTS idx_products_tenant_stripe ON products(tenant_id, stripe_price_id);
