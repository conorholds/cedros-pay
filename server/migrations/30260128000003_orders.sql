-- Orders: persisted purchase records for fulfillment/inventory

CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    source TEXT NOT NULL,
    purchase_id TEXT NOT NULL,
    resource_id TEXT NOT NULL,
    user_id TEXT,
    customer TEXT,
    status TEXT NOT NULL,
    items JSONB NOT NULL,
    amount BIGINT NOT NULL,
    amount_asset TEXT NOT NULL,
    customer_email TEXT,
    shipping JSONB,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS orders_tenant_source_purchase_uidx
    ON orders (tenant_id, source, purchase_id);

CREATE INDEX IF NOT EXISTS orders_tenant_created_at_idx
    ON orders (tenant_id, created_at DESC);
