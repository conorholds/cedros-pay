-- Add compound index for webhook_queue queries
-- Queries typically filter by status AND next_attempt_at together
-- Having separate indexes forces PostgreSQL to choose one and filter the other in-memory
-- A compound index allows both conditions to use the index efficiently

-- Compound index for pending webhook polling queries
-- Covers: WHERE status = 'pending' AND next_attempt_at <= NOW()
CREATE INDEX IF NOT EXISTS idx_webhook_queue_status_next_attempt
    ON webhook_queue(status, next_attempt_at)
    WHERE status = 'pending';

-- Note: The old separate indexes are kept for backward compatibility
-- and may still be useful for other query patterns
