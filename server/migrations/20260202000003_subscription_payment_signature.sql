-- Migration: Add payment_signature column to subscriptions table
-- SECURITY (H-004): Enables idempotency for subscription creation via x402/credits payments
-- Prevents duplicate subscriptions for the same payment signature

-- Add the payment_signature column
ALTER TABLE subscriptions ADD COLUMN payment_signature TEXT;

-- Create index for efficient lookup by payment signature (tenant isolated)
CREATE INDEX idx_subscriptions_payment_signature ON subscriptions (tenant_id, payment_signature);

-- Add partial index to only index non-null values (saves space, faster lookups)
CREATE INDEX idx_subscriptions_payment_signature_not_null ON subscriptions (tenant_id, payment_signature) WHERE payment_signature IS NOT NULL;

-- Add comment documenting the security purpose
COMMENT ON COLUMN subscriptions.payment_signature IS 'Payment signature for x402/credits payments. Used for idempotency (H-004) - prevents duplicate subscriptions for the same payment.';
