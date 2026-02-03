-- Phase 10: product SEO fields
ALTER TABLE products
    ADD COLUMN IF NOT EXISTS seo_title TEXT,
    ADD COLUMN IF NOT EXISTS seo_description TEXT;
