-- Phase 1: order history, fulfillments, inventory reservations

ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ;

UPDATE orders
SET updated_at = COALESCE(updated_at, created_at),
    status_updated_at = COALESCE(status_updated_at, created_at)
WHERE updated_at IS NULL OR status_updated_at IS NULL;

CREATE TABLE IF NOT EXISTS order_history (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    order_id TEXT NOT NULL,
    from_status TEXT NOT NULL,
    to_status TEXT NOT NULL,
    note TEXT,
    actor TEXT,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS order_history_tenant_order_idx
    ON order_history (tenant_id, order_id, created_at DESC);

CREATE TABLE IF NOT EXISTS fulfillments (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    order_id TEXT NOT NULL,
    status TEXT NOT NULL,
    carrier TEXT,
    tracking_number TEXT,
    tracking_url TEXT,
    items JSONB NOT NULL,
    shipped_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS fulfillments_tenant_order_idx
    ON fulfillments (tenant_id, order_id, created_at DESC);

CREATE TABLE IF NOT EXISTS inventory_reservations (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    cart_id TEXT,
    status TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS inventory_reservations_tenant_product_idx
    ON inventory_reservations (tenant_id, product_id, created_at DESC);

CREATE INDEX IF NOT EXISTS inventory_reservations_tenant_cart_idx
    ON inventory_reservations (tenant_id, cart_id, created_at DESC);
