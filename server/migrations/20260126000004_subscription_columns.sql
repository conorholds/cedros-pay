-- Add individual subscription columns (code expects these instead of JSONB subscription_config)

ALTER TABLE products ADD COLUMN IF NOT EXISTS subscription_billing_period TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS subscription_billing_interval INTEGER;
ALTER TABLE products ADD COLUMN IF NOT EXISTS subscription_trial_days INTEGER;
ALTER TABLE products ADD COLUMN IF NOT EXISTS subscription_stripe_price_id TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS subscription_allow_x402 BOOLEAN;
ALTER TABLE products ADD COLUMN IF NOT EXISTS subscription_grace_period_hours INTEGER;

-- Migrate data from subscription_config JSONB to individual columns (if any data exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'products' AND column_name = 'subscription_config'
    ) THEN
        UPDATE products SET
            subscription_billing_period = subscription_config->>'billing_period',
            subscription_billing_interval = CASE
                WHEN subscription_config->>'billing_interval' IS NOT NULL
                THEN (subscription_config->>'billing_interval')::INTEGER
                ELSE NULL
            END,
            subscription_trial_days = CASE
                WHEN subscription_config->>'trial_days' IS NOT NULL
                THEN (subscription_config->>'trial_days')::INTEGER
                ELSE NULL
            END,
            subscription_stripe_price_id = subscription_config->>'stripe_price_id',
            subscription_allow_x402 = CASE
                WHEN subscription_config->>'allow_x402' IS NOT NULL
                THEN (subscription_config->>'allow_x402')::BOOLEAN
                ELSE NULL
            END,
            subscription_grace_period_hours = CASE
                WHEN subscription_config->>'grace_period_hours' IS NOT NULL
                THEN (subscription_config->>'grace_period_hours')::INTEGER
                ELSE NULL
            END
        WHERE subscription_config IS NOT NULL;
    END IF;
END $$;

-- Drop the old JSONB column
ALTER TABLE products DROP COLUMN IF EXISTS subscription_config;
