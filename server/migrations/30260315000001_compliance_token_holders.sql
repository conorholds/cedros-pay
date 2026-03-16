-- Token holders table: tracks who holds tokens (recorded at mint time)
CREATE TABLE IF NOT EXISTS token_holders (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    collection_id TEXT NOT NULL,
    mint_address TEXT NOT NULL,
    wallet_address TEXT NOT NULL,
    user_id TEXT,
    amount_minted BIGINT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    frozen_at TIMESTAMPTZ,
    freeze_tx TEXT,
    thaw_tx TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_token_holders_tenant_created
    ON token_holders (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_token_holders_tenant_wallet
    ON token_holders (tenant_id, wallet_address);
CREATE INDEX IF NOT EXISTS idx_token_holders_tenant_status
    ON token_holders (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_token_holders_tenant_collection
    ON token_holders (tenant_id, collection_id);

-- Compliance actions table: audit trail for freeze/thaw/sweep operations
CREATE TABLE IF NOT EXISTS compliance_actions (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    action_type TEXT NOT NULL,
    wallet_address TEXT NOT NULL,
    mint_address TEXT NOT NULL,
    holder_id TEXT,
    reason TEXT NOT NULL,
    actor TEXT NOT NULL,
    tx_signature TEXT,
    report_reference TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compliance_actions_tenant_created
    ON compliance_actions (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_compliance_actions_tenant_type
    ON compliance_actions (tenant_id, action_type);
CREATE INDEX IF NOT EXISTS idx_compliance_actions_wallet
    ON compliance_actions (wallet_address);
