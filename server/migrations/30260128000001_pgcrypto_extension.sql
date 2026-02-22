-- Ensure pgcrypto is available for gen_random_uuid().
-- Fixes DB-001.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
