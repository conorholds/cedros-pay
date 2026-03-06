-- Admin operation audit trail (R12)
-- Captures all admin mutations for compliance and forensic review.

CREATE TABLE IF NOT EXISTS admin_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    resource_type TEXT NOT NULL,   -- e.g. product, coupon, order, gift_card
    resource_id TEXT NOT NULL,     -- ID of the affected resource
    action TEXT NOT NULL,          -- create, update, delete, adjust, process
    actor TEXT,                    -- X-Signer pubkey (base58)
    detail JSONB,                 -- summary of changes (key fields, not full snapshots)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Query by tenant + resource type + time (most common admin audit query)
CREATE INDEX IF NOT EXISTS idx_admin_audit_tenant_resource
    ON admin_audit (tenant_id, resource_type, created_at DESC);

-- Query by specific resource
CREATE INDEX IF NOT EXISTS idx_admin_audit_resource_id
    ON admin_audit (tenant_id, resource_id, created_at DESC);

-- Query by actor (who did what)
CREATE INDEX IF NOT EXISTS idx_admin_audit_actor
    ON admin_audit (tenant_id, actor, created_at DESC);

-- Cleanup: expire old audit entries (optional, via cleanup worker)
CREATE INDEX IF NOT EXISTS idx_admin_audit_created_at
    ON admin_audit (created_at);
