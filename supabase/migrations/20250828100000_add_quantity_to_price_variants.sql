-- =====================================================================================
-- ADD QUANTITY COLUMN TO PRICE VARIANTS
-- File: 20250828100000_add_quantity_to_price_variants.sql
-- 
-- This migration adds the quantity column to price_variants table which was missing
-- from the initial schema. This column tracks how many seats are included in each variant.
-- =====================================================================================

BEGIN;

-- Add quantity column to price_variants table
ALTER TABLE price_variants 
ADD COLUMN IF NOT EXISTS quantity INTEGER NOT NULL DEFAULT 1;

-- Add index for quantity for performance
CREATE INDEX IF NOT EXISTS idx_price_variants_quantity ON price_variants(quantity);

COMMIT;

-- Verify the column was added
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'price_variants'
    AND column_name = 'quantity';