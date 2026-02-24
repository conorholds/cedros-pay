-- F-002: Enforce idempotency for x402 subscription creation.
-- Ensure a payment signature can only map to one subscription per tenant.

DROP INDEX IF EXISTS idx_subscriptions_payment_signature_not_null;

CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_payment_signature_not_null
ON subscriptions (tenant_id, payment_signature)
WHERE payment_signature IS NOT NULL;
