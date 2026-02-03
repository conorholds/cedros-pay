-- Add composite primary keys for tenant-scoped tables
-- Ensures multi-tenant isolation and prevents cross-tenant ID collisions

-- Cart quotes
ALTER TABLE cart_quotes DROP CONSTRAINT IF EXISTS cart_quotes_pkey;
ALTER TABLE cart_quotes ADD PRIMARY KEY (tenant_id, id);

-- Refund quotes
ALTER TABLE refund_quotes DROP CONSTRAINT IF EXISTS refund_quotes_pkey;
ALTER TABLE refund_quotes ADD PRIMARY KEY (tenant_id, id);

-- Admin nonces
ALTER TABLE admin_nonces DROP CONSTRAINT IF EXISTS admin_nonces_pkey;
ALTER TABLE admin_nonces ADD PRIMARY KEY (tenant_id, id);

-- Subscriptions
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_pkey;
ALTER TABLE subscriptions ADD PRIMARY KEY (tenant_id, id);
