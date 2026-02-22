-- Shipping profiles + rates (Phase 3 start)

CREATE TABLE IF NOT EXISTS shipping_profiles (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    countries JSONB NOT NULL,
    active BOOLEAN NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS shipping_profiles_tenant_idx
    ON shipping_profiles (tenant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS shipping_rates (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    profile_id TEXT NOT NULL,
    name TEXT NOT NULL,
    rate_type TEXT NOT NULL,
    amount_atomic BIGINT NOT NULL,
    currency TEXT NOT NULL,
    min_subtotal BIGINT,
    max_subtotal BIGINT,
    active BOOLEAN NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS shipping_rates_tenant_profile_idx
    ON shipping_rates (tenant_id, profile_id, created_at DESC);
