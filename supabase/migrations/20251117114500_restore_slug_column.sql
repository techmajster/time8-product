-- Restore slug column to organizations table
-- The spec removed slug from the UI, but many parts of the codebase still reference it
-- This migration restores the column to avoid breaking existing queries

BEGIN;

-- Restore slug column (nullable for now since existing rows won't have values)
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS slug TEXT;

-- Add unique constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'organizations_slug_key'
  ) THEN
    ALTER TABLE organizations ADD CONSTRAINT organizations_slug_key UNIQUE (slug);
  END IF;
END $$;

-- Optionally: Generate slugs for existing organizations based on their name
-- UPDATE organizations
-- SET slug = lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'))
-- WHERE slug IS NULL;

COMMIT;
