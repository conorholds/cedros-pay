-- FAQs table for knowledge base entries
CREATE TABLE IF NOT EXISTS faqs (
    id TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    keywords TEXT[] NOT NULL DEFAULT '{}',
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (tenant_id, id)
);

-- Index for listing active FAQs by tenant
CREATE INDEX IF NOT EXISTS faqs_tenant_active_idx
    ON faqs (tenant_id, active, updated_at DESC);

-- Index for keyword search (GIN for array contains)
CREATE INDEX IF NOT EXISTS faqs_keywords_idx
    ON faqs USING GIN (keywords);

-- Full text search index on question and answer
CREATE INDEX IF NOT EXISTS faqs_text_search_idx
    ON faqs USING GIN (to_tsvector('english', question || ' ' || answer));
