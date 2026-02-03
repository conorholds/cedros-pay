-- Upgrade config storage to namespace keys by category.
--
-- Fixes CFG-001: app_config uniqueness must include category to avoid cross-category key collisions.

-- 1) Add category to audit table (older installs) and backfill from app_config.
ALTER TABLE app_config_audit
    ADD COLUMN IF NOT EXISTS category TEXT;

UPDATE app_config_audit a
SET category = c.category
FROM app_config c
WHERE a.category IS NULL
  AND c.tenant_id = a.tenant_id
  AND c.config_key = a.config_key;

-- For any remaining rows (e.g. deletions where app_config row no longer exists), default to 'unknown'.
UPDATE app_config_audit
SET category = 'unknown'
WHERE category IS NULL;

ALTER TABLE app_config_audit
    ALTER COLUMN category SET NOT NULL;

-- 2) Move app_config PK to (tenant_id, category, config_key).
ALTER TABLE app_config
    DROP CONSTRAINT IF EXISTS app_config_pkey;

ALTER TABLE app_config
    ADD PRIMARY KEY (tenant_id, category, config_key);

-- 3) Recreate audit index to include category.
DROP INDEX IF EXISTS idx_app_config_audit_tenant_key;
CREATE INDEX IF NOT EXISTS idx_app_config_audit_tenant_key
    ON app_config_audit (tenant_id, category, config_key, changed_at DESC);

-- 4) Update notify payload to include category (optional but useful for consumers).
CREATE OR REPLACE FUNCTION notify_config_change() RETURNS TRIGGER AS $$
BEGIN
    PERFORM pg_notify('config_changed',
        json_build_object('tenant_id', NEW.tenant_id, 'category', NEW.category, 'config_key', NEW.config_key)::text);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5) Ensure audit trigger writes category.
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
