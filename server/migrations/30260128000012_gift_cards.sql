-- Gift cards (Phase 8)

CREATE TABLE IF NOT EXISTS gift_cards (
    code TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    initial_balance BIGINT NOT NULL,
    balance BIGINT NOT NULL,
    currency TEXT NOT NULL,
    active BOOLEAN NOT NULL,
    expires_at TIMESTAMPTZ,
    metadata JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS gift_cards_tenant_created_idx
    ON gift_cards (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS gift_cards_tenant_active_idx
    ON gift_cards (tenant_id, active);
