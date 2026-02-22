-- Returns (Phase 5)

CREATE TABLE IF NOT EXISTS returns (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    order_id TEXT NOT NULL,
    status TEXT NOT NULL,
    items JSONB NOT NULL,
    reason TEXT,
    metadata JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ,
    status_updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS returns_tenant_created_idx
    ON returns (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS returns_tenant_status_idx
    ON returns (tenant_id, status);

CREATE INDEX IF NOT EXISTS returns_tenant_order_idx
    ON returns (tenant_id, order_id);
