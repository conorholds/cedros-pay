-- Add composite primary keys for products and coupons
-- Ensures multi-tenant isolation and prevents cross-tenant collisions

-- Products
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_pkey;
ALTER TABLE products ADD PRIMARY KEY (tenant_id, id);

-- Coupons
ALTER TABLE coupons DROP CONSTRAINT IF EXISTS coupons_pkey;
ALTER TABLE coupons ADD PRIMARY KEY (tenant_id, code);
