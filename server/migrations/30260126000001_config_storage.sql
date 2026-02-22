-- Config storage tables for PostgreSQL-based configuration management
-- Supports encrypted secrets via envelope encryption (KEK in env, DEK in DB)

-- Config entries with optional encryption for secrets
CREATE TABLE IF NOT EXISTS app_config (
    tenant_id TEXT NOT NULL,
    config_key TEXT NOT NULL,
    value JSONB NOT NULL,
    encrypted BOOLEAN NOT NULL DEFAULT FALSE,
    key_version INTEGER,
    category TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by TEXT,
    PRIMARY KEY (tenant_id, category, config_key)
);

-- Index for listing configs by category
CREATE INDEX IF NOT EXISTS idx_app_config_category ON app_config (tenant_id, category);

-- Audit trail for config changes
CREATE TABLE IF NOT EXISTS app_config_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    category TEXT NOT NULL,
    config_key TEXT NOT NULL,
    action TEXT NOT NULL,
    old_value JSONB,
    new_value JSONB,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    changed_by TEXT
);

-- Index for querying audit history
CREATE INDEX IF NOT EXISTS idx_app_config_audit_tenant_key ON app_config_audit (tenant_id, category, config_key, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_config_audit_changed_at ON app_config_audit (changed_at DESC);

-- Encryption keys table (envelope encryption)
-- DEKs are encrypted by KEK (from env var) and stored here
CREATE TABLE IF NOT EXISTS encryption_keys (
    tenant_id TEXT NOT NULL,
    key_version INTEGER NOT NULL,
    encrypted_dek BYTEA NOT NULL,
    algorithm TEXT NOT NULL DEFAULT 'AES-256-GCM',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY (tenant_id, key_version)
);

-- Index for finding active keys
CREATE INDEX IF NOT EXISTS idx_encryption_keys_active ON encryption_keys (tenant_id, active) WHERE active = TRUE;

-- Function to notify on config changes for live reload
CREATE OR REPLACE FUNCTION notify_config_change() RETURNS TRIGGER AS $$
BEGIN
    PERFORM pg_notify('config_changed',
        json_build_object('tenant_id', NEW.tenant_id, 'category', NEW.category, 'config_key', NEW.config_key)::text);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for INSERT/UPDATE on app_config
DROP TRIGGER IF EXISTS config_change_trigger ON app_config;
CREATE TRIGGER config_change_trigger
    AFTER INSERT OR UPDATE ON app_config
    FOR EACH ROW EXECUTE FUNCTION notify_config_change();

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_app_config_timestamp() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-updating updated_at
DROP TRIGGER IF EXISTS app_config_updated_at_trigger ON app_config;
CREATE TRIGGER app_config_updated_at_trigger
    BEFORE UPDATE ON app_config
    FOR EACH ROW EXECUTE FUNCTION update_app_config_timestamp();

-- Function to auto-insert audit record on config changes
CREATE OR REPLACE FUNCTION audit_config_change() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO app_config_audit (tenant_id, category, config_key, action, old_value, new_value, changed_by)
        VALUES (NEW.tenant_id, NEW.category, NEW.config_key, 'INSERT', NULL, NEW.value, NEW.updated_by);
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.value IS DISTINCT FROM NEW.value THEN
            INSERT INTO app_config_audit (tenant_id, category, config_key, action, old_value, new_value, changed_by)
            VALUES (NEW.tenant_id, NEW.category, NEW.config_key, 'UPDATE', OLD.value, NEW.value, NEW.updated_by);
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO app_config_audit (tenant_id, category, config_key, action, old_value, new_value, changed_by)
        VALUES (OLD.tenant_id, OLD.category, OLD.config_key, 'DELETE', OLD.value, NULL, NULL);
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for audit trail
DROP TRIGGER IF EXISTS app_config_audit_trigger ON app_config;
CREATE TRIGGER app_config_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON app_config
    FOR EACH ROW EXECUTE FUNCTION audit_config_change();
