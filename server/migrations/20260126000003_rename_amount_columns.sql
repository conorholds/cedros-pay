-- Rename amount columns to match code expectations (_atomic suffix)
-- The code uses fiat_amount_atomic/crypto_amount_atomic but schema has fiat_amount/crypto_amount

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'products' AND column_name = 'fiat_amount'
    ) THEN
        ALTER TABLE products RENAME COLUMN fiat_amount TO fiat_amount_atomic;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'products' AND column_name = 'crypto_amount'
    ) THEN
        ALTER TABLE products RENAME COLUMN crypto_amount TO crypto_amount_atomic;
    END IF;
END $$;
