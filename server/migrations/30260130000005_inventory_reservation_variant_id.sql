-- Add variant_id column to inventory_reservations for variant-level tracking
ALTER TABLE inventory_reservations ADD COLUMN IF NOT EXISTS variant_id TEXT;

-- Add index for efficient variant-level queries
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_variant
    ON inventory_reservations(tenant_id, product_id, variant_id)
    WHERE variant_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN inventory_reservations.variant_id IS 'Optional variant ID for variant-level inventory reservations';
