-- Tax rates (Phase 6)

CREATE TABLE IF NOT EXISTS tax_rates (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    country TEXT NOT NULL,
    region TEXT,
    rate_bps INTEGER NOT NULL,
    active BOOLEAN NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS tax_rates_tenant_country_idx
    ON tax_rates (tenant_id, country);

CREATE INDEX IF NOT EXISTS tax_rates_tenant_active_idx
    ON tax_rates (tenant_id, active);
