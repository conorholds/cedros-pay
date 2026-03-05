-- Asset tokenization framework: collections as asset classes, multi-mint, asset redemptions.

-- 1. Add tokenization_config JSONB to collections (makes a collection an "asset class").
ALTER TABLE collections ADD COLUMN IF NOT EXISTS tokenization_config JSONB;

-- 2. Add tokenized_asset_config JSONB to products.
ALTER TABLE products ADD COLUMN IF NOT EXISTS tokenized_asset_config JSONB;

-- 3. Add collection_id to tenant_token22_mints for per-collection mints.
--    Drop the existing tenant_id-only primary key and recreate as composite.
--    Gift card mints keep collection_id NULL (backwards-compatible).
ALTER TABLE tenant_token22_mints ADD COLUMN IF NOT EXISTS collection_id TEXT;

-- Replace PK: (tenant_id) → (tenant_id, collection_id) using a unique index.
-- We use a unique index with COALESCE because NULL != NULL in SQL unique constraints.
ALTER TABLE tenant_token22_mints DROP CONSTRAINT IF EXISTS tenant_token22_mints_pkey;
CREATE UNIQUE INDEX IF NOT EXISTS tenant_token22_mints_tenant_collection_idx
    ON tenant_token22_mints (tenant_id, COALESCE(collection_id, '__gift_card__'));

-- 4. Create asset_redemptions table.
CREATE TABLE IF NOT EXISTS asset_redemptions (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    order_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    collection_id TEXT NOT NULL,
    user_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending_info',
    form_data JSONB NOT NULL DEFAULT '{}',
    admin_notes TEXT,
    token_mint_signature TEXT,
    token_burn_signature TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_asset_redemptions_tenant
    ON asset_redemptions (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_asset_redemptions_status
    ON asset_redemptions (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_asset_redemptions_collection
    ON asset_redemptions (tenant_id, collection_id);
