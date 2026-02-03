-- Add raw payload bytes for webhook signature stability
-- Allows delivering exactly the bytes used for signature generation.

ALTER TABLE webhook_queue
    ADD COLUMN IF NOT EXISTS payload_bytes BYTEA;

ALTER TABLE webhook_dlq
    ADD COLUMN IF NOT EXISTS payload_bytes BYTEA;
