-- DB-GIFT-PK: Change gift_cards PK to be tenant-scoped
-- Prevents cross-tenant gift card code collisions.

ALTER TABLE gift_cards DROP CONSTRAINT IF EXISTS gift_cards_pkey;
ALTER TABLE gift_cards ADD PRIMARY KEY (tenant_id, code);
