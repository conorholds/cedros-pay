-- Add user_id column to payment_transactions and subscriptions
-- Links purchases to cedros-login user accounts

-- Add user_id to payment_transactions (nullable for guest/anonymous purchases)
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS user_id TEXT;

-- Add user_id to subscriptions (nullable for wallet-only subscriptions)
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS user_id TEXT;

-- Index for querying purchases by user
CREATE INDEX IF NOT EXISTS idx_payment_transactions_tenant_user
    ON payment_transactions(tenant_id, user_id) WHERE user_id IS NOT NULL;

-- Index for querying subscriptions by user
CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant_user
    ON subscriptions(tenant_id, user_id) WHERE user_id IS NOT NULL;
