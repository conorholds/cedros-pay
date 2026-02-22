-- Product display/catalog fields for ecommerce templates
-- Kept optional/defaulted to preserve backwards compatibility.

ALTER TABLE products ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS short_description TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS slug TEXT;

ALTER TABLE products ADD COLUMN IF NOT EXISTS tags JSONB NOT NULL DEFAULT '[]';
ALTER TABLE products ADD COLUMN IF NOT EXISTS category_ids JSONB NOT NULL DEFAULT '[]';
ALTER TABLE products ADD COLUMN IF NOT EXISTS images JSONB NOT NULL DEFAULT '[]';

ALTER TABLE products ADD COLUMN IF NOT EXISTS featured BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS sort_order INTEGER;

ALTER TABLE products ADD COLUMN IF NOT EXISTS compare_at_fiat_amount_atomic BIGINT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS compare_at_fiat_currency TEXT;

ALTER TABLE products ADD COLUMN IF NOT EXISTS inventory_status TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS variants JSONB NOT NULL DEFAULT '[]';

-- Optional indexes to support common catalogue queries
CREATE INDEX IF NOT EXISTS idx_products_tenant_sort_order ON products(tenant_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_products_tenant_featured ON products(tenant_id, featured);
CREATE INDEX IF NOT EXISTS idx_products_tenant_slug ON products(tenant_id, slug);
