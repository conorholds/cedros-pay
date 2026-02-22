-- Add advanced coupon fields for enhanced promotion capabilities

-- Minimum purchase amount (in cents) for coupon to apply
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS minimum_amount_cents BIGINT;

-- Category-level restrictions (JSON array of category IDs)
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS category_ids JSONB NOT NULL DEFAULT '[]';

-- Per-customer usage limit (e.g., "once per customer")
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS usage_limit_per_customer INTEGER;

-- First-time purchaser only flag
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS first_purchase_only BOOLEAN NOT NULL DEFAULT FALSE;

-- Index for category_ids GIN lookup
CREATE INDEX IF NOT EXISTS idx_coupons_category_ids ON coupons USING GIN (category_ids);

-- Table for tracking per-customer coupon usage
CREATE TABLE IF NOT EXISTS coupon_customer_usage (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    coupon_code TEXT NOT NULL,
    customer_id TEXT NOT NULL,
    usage_count INTEGER NOT NULL DEFAULT 1,
    first_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique constraint: one row per tenant+coupon+customer
CREATE UNIQUE INDEX IF NOT EXISTS idx_coupon_customer_usage_unique
    ON coupon_customer_usage(tenant_id, UPPER(coupon_code), customer_id);

-- Lookup by customer for first-purchase checks
CREATE INDEX IF NOT EXISTS idx_coupon_customer_usage_customer
    ON coupon_customer_usage(tenant_id, customer_id);
