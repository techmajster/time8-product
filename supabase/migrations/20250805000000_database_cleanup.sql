-- Database Cleanup Migration
-- Purpose: Remove obsolete tables and unused columns identified in database analysis
-- Generated: 2025-08-05
-- Phase 1: Safe removal of confirmed obsolete database artifacts

-- First, create a backup log of what we're removing
CREATE TABLE IF NOT EXISTS cleanup_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cleanup_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  table_name TEXT,
  action TEXT,
  row_count INTEGER,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Log the cleanup actions we're about to perform
DO $$
BEGIN
  -- Log parental_leave_requests table cleanup
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'parental_leave_requests') THEN
    INSERT INTO cleanup_log (table_name, action, row_count, details)
    SELECT 'parental_leave_requests', 'DROP_TABLE', 
           (SELECT COUNT(*) FROM parental_leave_requests),
           '{"reason": "Table already dropped in migration 20250113000000, removing any remnants"}'::jsonb;
  END IF;

  -- Log access_requests table (if empty)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'access_requests') THEN
    INSERT INTO cleanup_log (table_name, action, row_count, details)
    SELECT 'access_requests', 'EVALUATE_FOR_REMOVAL', 
           (SELECT COUNT(*) FROM access_requests),
           '{"reason": "Empty table identified in analysis, evaluating removal"}'::jsonb;
  END IF;
END $$;

-- Remove parental_leave_requests table completely (if it still exists)
-- This was partially cleaned up in migration 20250113000000
DROP TABLE IF EXISTS parental_leave_requests CASCADE;

-- Remove children_count column from profiles table 
-- This was kept in the previous cleanup but is no longer used
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'children_count'
  ) THEN
    -- Log the column removal
    INSERT INTO cleanup_log (table_name, action, details)
    VALUES ('profiles', 'DROP_COLUMN', '{"column": "children_count", "reason": "Unused after parental leave workflow removal"}'::jsonb);
    
    -- Remove the column
    ALTER TABLE profiles DROP COLUMN children_count;
  END IF;
END $$;

-- Conditionally remove access_requests table if it's empty and unused
DO $$
DECLARE
  access_requests_count INTEGER := 0;
BEGIN
  -- Check if table exists and get count
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'access_requests') THEN
    SELECT COUNT(*) INTO access_requests_count FROM access_requests;
    
    -- Only remove if empty (0 rows)
    IF access_requests_count = 0 THEN
      -- Log the removal
      INSERT INTO cleanup_log (table_name, action, row_count, details)
      VALUES ('access_requests', 'DROP_TABLE', access_requests_count, 
              '{"reason": "Empty table with no application usage found"}'::jsonb);
      
      -- Remove the table
      DROP TABLE access_requests CASCADE;
    ELSE
      -- Log that we kept it due to data
      INSERT INTO cleanup_log (table_name, action, row_count, details)
      VALUES ('access_requests', 'KEEP_TABLE', access_requests_count, 
              '{"reason": "Table contains data, keeping for safety"}'::jsonb);
    END IF;
  END IF;
END $$;

-- Clean up any unused indexes that might have been left behind
-- Note: We're being conservative here and only removing clearly obsolete ones

-- Drop any indexes related to parental_leave_requests if they still exist
DO $$
DECLARE
  index_name TEXT;
BEGIN
  FOR index_name IN 
    SELECT indexname FROM pg_indexes 
    WHERE tablename = 'parental_leave_requests'
  LOOP
    EXECUTE 'DROP INDEX IF EXISTS ' || quote_ident(index_name) || ' CASCADE';
    INSERT INTO cleanup_log (table_name, action, details)
    VALUES ('pg_indexes', 'DROP_INDEX', 
            ('{"index_name": "' || index_name || '", "reason": "Related to dropped parental_leave_requests table"}')::jsonb);
  END LOOP;
END $$;

-- Cleanup any orphaned RLS policies for removed tables
DO $$
DECLARE
  policy_name TEXT;
BEGIN
  -- Remove any RLS policies for parental_leave_requests
  FOR policy_name IN 
    SELECT policyname FROM pg_policies 
    WHERE tablename = 'parental_leave_requests'
  LOOP
    -- Note: Policies are automatically dropped with the table, but log for record keeping
    INSERT INTO cleanup_log (table_name, action, details)
    VALUES ('pg_policies', 'AUTO_DROPPED_WITH_TABLE', 
            ('{"policy_name": "' || policy_name || '", "table": "parental_leave_requests"}')::jsonb);
  END LOOP;
END $$;

-- Final verification and logging
INSERT INTO cleanup_log (table_name, action, details)
VALUES ('cleanup_migration', 'COMPLETED', 
        '{"migration": "20250805000000_database_cleanup", "phase": "1", "status": "success"}'::jsonb);

-- Create a summary view of what was cleaned up
CREATE OR REPLACE VIEW cleanup_summary AS
SELECT 
  cleanup_date::date as date,
  table_name,
  action,
  row_count,
  details->>'reason' as reason
FROM cleanup_log 
ORDER BY cleanup_date DESC;

-- Add comment to document this migration
COMMENT ON TABLE cleanup_log IS 'Tracks database cleanup operations performed during optimization phase';
COMMENT ON VIEW cleanup_summary IS 'Human-readable summary of database cleanup operations';