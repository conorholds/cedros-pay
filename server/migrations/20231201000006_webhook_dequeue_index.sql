-- Add index for webhook queue DEQUEUE query
-- Query pattern: WHERE status = 'pending' AND (next_attempt_at IS NULL OR next_attempt_at <= NOW())
--                ORDER BY created_at ASC
-- This prevents full table scan when queue has many entries

-- Partial index for pending webhooks ordered by creation time
-- Covers the common case where next_attempt_at is NULL (immediate retry)
CREATE INDEX IF NOT EXISTS idx_webhook_queue_pending_dequeue
    ON webhook_queue(created_at ASC)
    WHERE status = 'pending';

-- Additional index for scheduled retries (next_attempt_at is set)
-- Helps the OR condition in the DEQUEUE query
CREATE INDEX IF NOT EXISTS idx_webhook_queue_pending_next_attempt
    ON webhook_queue(next_attempt_at ASC, created_at ASC)
    WHERE status = 'pending' AND next_attempt_at IS NOT NULL;
