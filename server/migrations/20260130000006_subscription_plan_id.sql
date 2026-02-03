-- Add plan_id column to subscriptions for inventory tracking
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS plan_id TEXT;

-- Index for counting subscriptions by plan
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_id ON subscriptions(plan_id) WHERE plan_id IS NOT NULL;

-- Compound index for tenant + plan queries
CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant_plan ON subscriptions(tenant_id, plan_id) WHERE plan_id IS NOT NULL;
