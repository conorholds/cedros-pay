-- Gift card compliance: escheatment tracking via last_activity_at
ALTER TABLE gift_card_redemptions ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ;

-- Backfill existing rows so the column is never NULL for historical data
UPDATE gift_card_redemptions SET last_activity_at = created_at WHERE last_activity_at IS NULL;

-- Index for escheatment dormancy queries (find inactive cards by tenant)
CREATE INDEX IF NOT EXISTS idx_gc_redemptions_activity
  ON gift_card_redemptions (tenant_id, last_activity_at);
