-- Add variation_config column to products table for storing variation type definitions
ALTER TABLE products ADD COLUMN IF NOT EXISTS variation_config JSONB;

-- Add comment for documentation
COMMENT ON COLUMN products.variation_config IS 'JSON configuration for product variation types (sizes, colors, etc.)';
