-- Payment disputes / chargebacks (Phase 7)

CREATE TABLE IF NOT EXISTS disputes (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    source TEXT NOT NULL,
    order_id TEXT,
    payment_intent_id TEXT,
    charge_id TEXT,
    status TEXT NOT NULL,
    reason TEXT,
    amount BIGINT NOT NULL,
    currency TEXT NOT NULL,
    metadata JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ,
    status_updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS disputes_tenant_created_idx
    ON disputes (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS disputes_tenant_status_idx
    ON disputes (tenant_id, status);

CREATE INDEX IF NOT EXISTS disputes_tenant_order_idx
    ON disputes (tenant_id, order_id);
