-- Add visibility flags to FAQs table
ALTER TABLE faqs ADD COLUMN IF NOT EXISTS use_in_chat BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE faqs ADD COLUMN IF NOT EXISTS display_on_page BOOLEAN NOT NULL DEFAULT true;

-- Index for public FAQ page (active + display_on_page)
CREATE INDEX IF NOT EXISTS faqs_public_display_idx
    ON faqs (tenant_id, display_on_page, active)
    WHERE active = true AND display_on_page = true;

-- Index for chat AI (active + use_in_chat)
CREATE INDEX IF NOT EXISTS faqs_chat_idx
    ON faqs (tenant_id, use_in_chat, active)
    WHERE active = true AND use_in_chat = true;
