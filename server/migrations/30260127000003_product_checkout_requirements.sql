-- Ecommerce checkout requirements per product

ALTER TABLE products ADD COLUMN IF NOT EXISTS shipping_profile TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS checkout_requirements JSONB;
ALTER TABLE products ADD COLUMN IF NOT EXISTS fulfillment JSONB;
