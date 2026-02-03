-- Make payment_transactions primary key tenant-scoped
-- Prevents cross-tenant signature collisions

ALTER TABLE payment_transactions DROP CONSTRAINT IF EXISTS payment_transactions_pkey;
ALTER TABLE payment_transactions ADD PRIMARY KEY (tenant_id, signature);
