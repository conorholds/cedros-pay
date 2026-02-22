-- Add variant_id column to inventory_adjustments for variant-level tracking
ALTER TABLE inventory_adjustments ADD COLUMN IF NOT EXISTS variant_id TEXT;

-- Add index for efficient variant-level queries
CREATE INDEX IF NOT EXISTS idx_inventory_adjustments_variant
    ON inventory_adjustments(tenant_id, product_id, variant_id)
    WHERE variant_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN inventory_adjustments.variant_id IS 'Optional variant ID for variant-level inventory tracking';
