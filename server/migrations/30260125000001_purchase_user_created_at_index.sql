-- PERF: Cover list_purchases_by_user_id ordering
-- Query pattern:
--   WHERE tenant_id = $1 AND user_id = $2
--   ORDER BY created_at DESC
--   LIMIT/OFFSET ...
-- This index supports the ORDER BY without an additional sort step.
CREATE INDEX IF NOT EXISTS idx_payment_transactions_tenant_user_created_at
    ON payment_transactions(tenant_id, user_id, created_at DESC)
    WHERE user_id IS NOT NULL;
