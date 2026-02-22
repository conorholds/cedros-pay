-- DB-IDX-DUP: Drop redundant full index on subscriptions.payment_signature
-- The partial index (WHERE payment_signature IS NOT NULL) already covers all
-- non-null lookups and is more space-efficient. The full index is redundant.

DROP INDEX IF EXISTS idx_subscriptions_payment_signature;
