-- Add compliance_requirements JSONB column to products table.
-- Stores per-product compliance gates (sanctions, KYC, accredited investor).
-- NULL means defaults apply (sanctions check only).
ALTER TABLE products ADD COLUMN IF NOT EXISTS compliance_requirements JSONB;
