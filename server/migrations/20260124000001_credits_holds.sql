-- Credits holds binding (server-managed)
--
-- Stores cedros-login hold IDs created by this server, binding them to
-- (tenant_id, user_id, resource_id, amount) to prevent hold replay/mismatch.

CREATE TABLE IF NOT EXISTS credits_holds (
    tenant_id TEXT NOT NULL DEFAULT 'default',
    hold_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    resource_id TEXT NOT NULL,
    amount BIGINT NOT NULL,
    amount_asset TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (tenant_id, hold_id)
);

CREATE INDEX IF NOT EXISTS idx_credits_holds_user ON credits_holds(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_credits_holds_resource ON credits_holds(tenant_id, resource_id);
CREATE INDEX IF NOT EXISTS idx_credits_holds_expires ON credits_holds(expires_at);
