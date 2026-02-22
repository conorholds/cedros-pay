-- Customer accounts

CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    email TEXT NOT NULL,
    name TEXT,
    phone TEXT,
    addresses JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS customers_tenant_email_idx
    ON customers (tenant_id, email);

CREATE INDEX IF NOT EXISTS customers_tenant_created_idx
    ON customers (tenant_id, created_at DESC);
