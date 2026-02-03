-- Chat sessions table for site chat feature
CREATE TABLE IF NOT EXISTS chat_sessions (
    id TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    customer_id TEXT,
    customer_email TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    message_count INTEGER NOT NULL DEFAULT 0,
    last_message_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (tenant_id, id)
);

CREATE INDEX IF NOT EXISTS chat_sessions_tenant_customer_idx
    ON chat_sessions (tenant_id, customer_id, created_at DESC)
    WHERE customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS chat_sessions_tenant_created_idx
    ON chat_sessions (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS chat_sessions_tenant_status_idx
    ON chat_sessions (tenant_id, status, last_message_at DESC);

-- Chat messages table
CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    tool_calls JSONB,
    tool_results JSONB,
    created_at TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (tenant_id, id)
);

CREATE INDEX IF NOT EXISTS chat_messages_session_idx
    ON chat_messages (tenant_id, session_id, created_at ASC);

CREATE INDEX IF NOT EXISTS chat_messages_tenant_created_idx
    ON chat_messages (tenant_id, created_at DESC);
