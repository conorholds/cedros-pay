-- Add inventory policy to products (deny|allow_backorder)

ALTER TABLE products
    ADD COLUMN IF NOT EXISTS inventory_policy TEXT;
