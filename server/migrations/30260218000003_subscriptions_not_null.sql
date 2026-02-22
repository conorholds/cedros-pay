-- DB-NULL-TS: Make subscriptions.created_at and updated_at NOT NULL
-- These timestamps should always be set on insert/update.

ALTER TABLE subscriptions
    ALTER COLUMN created_at SET NOT NULL,
    ALTER COLUMN updated_at SET NOT NULL;
