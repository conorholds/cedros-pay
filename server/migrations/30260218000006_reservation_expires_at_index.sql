-- DB-IDX-RESERVE: Add missing index on inventory_reservations.expires_at
-- Enables efficient cleanup of expired active reservations.

CREATE INDEX IF NOT EXISTS idx_inventory_reservations_expires_at
    ON inventory_reservations (expires_at)
    WHERE status = 'active';
