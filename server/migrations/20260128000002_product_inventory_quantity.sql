-- Add optional tracked inventory quantity to products

ALTER TABLE products
    ADD COLUMN IF NOT EXISTS inventory_quantity INTEGER;

-- Drop constraint if exists (idempotent) and add it fresh
ALTER TABLE products
    DROP CONSTRAINT IF EXISTS products_inventory_quantity_nonnegative;

ALTER TABLE products
    ADD CONSTRAINT products_inventory_quantity_nonnegative
    CHECK (inventory_quantity IS NULL OR inventory_quantity >= 0);
