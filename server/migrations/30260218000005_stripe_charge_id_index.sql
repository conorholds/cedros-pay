-- DB-IDX-CHARGE: Add missing index on stripe_refund_requests.stripe_charge_id
-- Enables efficient lookup of refund requests by Stripe charge ID.

CREATE INDEX IF NOT EXISTS idx_stripe_refund_requests_charge_id
    ON stripe_refund_requests (tenant_id, stripe_charge_id);
