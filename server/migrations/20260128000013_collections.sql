-- Collections / categories (Phase 9)

CREATE TABLE IF NOT EXISTS collections (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    product_ids JSONB NOT NULL,
    active BOOLEAN NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS collections_tenant_created_idx
    ON collections (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS collections_tenant_active_idx
    ON collections (tenant_id, active);
