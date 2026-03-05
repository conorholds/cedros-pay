ALTER TABLE gift_card_redemptions ADD COLUMN IF NOT EXISTS redemption_token TEXT;
ALTER TABLE gift_card_redemptions ADD COLUMN IF NOT EXISTS claimed BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE gift_card_redemptions ADD COLUMN IF NOT EXISTS recipient_email TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_gc_redemption_token ON gift_card_redemptions (redemption_token) WHERE redemption_token IS NOT NULL;
