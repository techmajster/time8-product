-- =====================================================================================
-- FIX IS_PAID FOR MANDATORY LEAVE TYPES
-- File: 20251118000000_fix_is_paid_mandatory_types.sql
--
-- This migration fixes the is_paid field for mandatory leave types that were created
-- without this field being properly set during workspace creation.
--
-- Fixes:
-- - Urlop wypoczynkowy: Should have is_paid = true
-- - Urlop bezpłatny: Should have is_paid = false
-- =====================================================================================

-- Update Urlop wypoczynkowy to be paid (is_paid = true)
UPDATE leave_types
SET is_paid = true
WHERE is_mandatory = true
  AND leave_category = 'annual'
  AND (name ILIKE '%wypoczynkowy%' OR name = 'Urlop wypoczynkowy');

-- Update Urlop bezpłatny to be unpaid (is_paid = false)
UPDATE leave_types
SET is_paid = false
WHERE is_mandatory = true
  AND leave_category = 'unpaid'
  AND (name ILIKE '%bezpłatny%' OR name = 'Urlop bezpłatny');

-- Verify the changes
DO $$
DECLARE
  wypoczynkowy_count INTEGER;
  bezplatny_count INTEGER;
BEGIN
  -- Count Urlop wypoczynkowy with is_paid = true
  SELECT COUNT(*) INTO wypoczynkowy_count
  FROM leave_types
  WHERE is_mandatory = true
    AND leave_category = 'annual'
    AND (name ILIKE '%wypoczynkowy%' OR name = 'Urlop wypoczynkowy')
    AND is_paid = true;

  -- Count Urlop bezpłatny with is_paid = false
  SELECT COUNT(*) INTO bezplatny_count
  FROM leave_types
  WHERE is_mandatory = true
    AND leave_category = 'unpaid'
    AND (name ILIKE '%bezpłatny%' OR name = 'Urlop bezpłatny')
    AND is_paid = false;

  RAISE NOTICE '✅ Fixed is_paid field for mandatory leave types:';
  RAISE NOTICE '   - Urlop wypoczynkowy (paid): % records updated', wypoczynkowy_count;
  RAISE NOTICE '   - Urlop bezpłatny (unpaid): % records updated', bezplatny_count;
END;
$$;
