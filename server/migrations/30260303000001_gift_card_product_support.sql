-- Gift card product support: adds gift_card_config to products,
-- redemption tracking, and tenant Token-22 mint configuration.

ALTER TABLE products ADD COLUMN IF NOT EXISTS gift_card_config JSONB;

CREATE TABLE IF NOT EXISTS gift_card_redemptions (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    order_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    buyer_user_id TEXT NOT NULL,
    recipient_user_id TEXT NOT NULL,
    face_value_cents BIGINT NOT NULL,
    currency TEXT NOT NULL,
    credits_issued BIGINT NOT NULL,
    token_minted BOOLEAN NOT NULL DEFAULT FALSE,
    token_mint_signature TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_gc_redemptions_tenant ON gift_card_redemptions (tenant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS tenant_token22_mints (
    tenant_id TEXT PRIMARY KEY,
    mint_address TEXT NOT NULL,
    mint_authority TEXT NOT NULL,
    transfer_fee_bps INTEGER NOT NULL DEFAULT 0,
    max_transfer_fee BIGINT NOT NULL DEFAULT 0,
    treasury_address TEXT NOT NULL,
    token_symbol TEXT NOT NULL DEFAULT 'storeUSD',
    token_decimals SMALLINT NOT NULL DEFAULT 2,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
