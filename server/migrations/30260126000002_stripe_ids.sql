-- Add Stripe ID columns for syncing products and coupons with Stripe
-- Enables update/archive operations on Stripe resources

-- Add stripe_product_id to products (tracks the Stripe Product for updates/archiving)
ALTER TABLE products ADD COLUMN IF NOT EXISTS stripe_product_id TEXT;

-- Add Stripe IDs to coupons (tracks Stripe Coupon and Promotion Code)
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS stripe_coupon_id TEXT;
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS stripe_promotion_code_id TEXT;
