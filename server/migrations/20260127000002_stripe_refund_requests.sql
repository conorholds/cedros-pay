-- Stripe refund request tracking
-- Stores customer-initiated refund requests that an admin can process,
-- which creates a Stripe refund via POST /v1/refunds.

CREATE TABLE IF NOT EXISTS stripe_refund_requests (
    id TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    original_purchase_id TEXT NOT NULL,
    stripe_payment_intent_id TEXT NOT NULL,
    stripe_refund_id TEXT,
    stripe_charge_id TEXT,
    amount BIGINT NOT NULL,
    currency TEXT NOT NULL,
    status TEXT NOT NULL,
    reason TEXT,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_by TEXT,
    processed_at TIMESTAMPTZ,
    last_error TEXT,
    PRIMARY KEY (tenant_id, id)
);

CREATE INDEX IF NOT EXISTS idx_stripe_refund_requests_tenant_processed_at
    ON stripe_refund_requests(tenant_id, processed_at);
CREATE INDEX IF NOT EXISTS idx_stripe_refund_requests_tenant_created_at
    ON stripe_refund_requests(tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_stripe_refund_requests_original_purchase
    ON stripe_refund_requests(tenant_id, original_purchase_id);
