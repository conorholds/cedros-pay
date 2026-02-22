-- Add customer_name and receipt_url fields to orders table
-- These fields support custom receipt templates for x402/credits payments

ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS receipt_url TEXT;

-- Add index for receipt URL lookups (e.g., receipt page validation)
CREATE INDEX IF NOT EXISTS idx_orders_receipt_url ON orders(receipt_url) WHERE receipt_url IS NOT NULL;
