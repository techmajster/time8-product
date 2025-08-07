# Database Schema

This is the database schema implementation for the spec detailed in @.agent-os/specs/2025-08-05-database-cleanup/spec.md

## Tables to Remove

### Confirmed Obsolete Tables
```sql
-- parental_leave_requests - Already removed in migration 20250113000000_cleanup_parental_leave.sql
-- Verify complete removal and cleanup any remaining references

-- migration_logs - Evaluate for archival/removal
-- Contains migration history that may not be needed for production
DROP TABLE IF EXISTS migration_logs CASCADE;
```

### Backup Tables (if they exist)
```sql
-- Remove any backup tables created during migrations
-- Pattern: *_backup, *_old, *_temp
-- These will be identified during database analysis

-- Example cleanup script:
DO $$
DECLARE
    backup_table record;
BEGIN
    FOR backup_table IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        AND (table_name LIKE '%_backup' OR table_name LIKE '%_old' OR table_name LIKE '%_temp')
    LOOP
        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(backup_table.table_name) || ' CASCADE';
        RAISE NOTICE 'Dropped backup table: %', backup_table.table_name;
    END LOOP;
END $$;
```

## Unused Columns to Remove

### profiles table cleanup
```sql
-- Remove children_count column if confirmed unused
-- Note: This was kept in migration 20250113000000_cleanup_parental_leave.sql
-- Need to verify it's not used in application before removal
ALTER TABLE profiles DROP COLUMN IF EXISTS children_count;
```

## Indexes to Optimize

### Remove Redundant Indexes
```sql
-- Identify and remove unused indexes
-- This will be done after analyzing actual query patterns

-- Example of index removal (to be confirmed during analysis):
-- DROP INDEX IF EXISTS idx_unused_example;
```

### Consolidate Multi-column Indexes
```sql
-- Review multi-column indexes for optimization opportunities
-- Combine overlapping indexes where beneficial for query performance
```

## RLS Policy Optimization

### Simplify Complex Policies
```sql
-- Review and optimize RLS policies for better performance
-- Focus on policies created during multi-org migration that may be overly complex

-- Example policy optimization (to be determined during analysis):
-- DROP POLICY IF EXISTS "complex_policy_name" ON table_name;
-- CREATE POLICY "simplified_policy_name" ON table_name FOR SELECT USING (simpler_condition);
```

## Functions and Triggers Cleanup

### Remove Unused Migration Functions
```sql
-- Clean up migration helper functions that are no longer needed
DROP FUNCTION IF EXISTS migrate_to_multi_org() CASCADE;
DROP FUNCTION IF EXISTS validate_multi_org_migration() CASCADE;
DROP FUNCTION IF EXISTS rollback_multi_org_migration() CASCADE;
DROP FUNCTION IF EXISTS auto_expire_join_requests() CASCADE;
```

## Constraints Review

### Foreign Key Optimization
```sql
-- Review all foreign key constraints for necessity and performance impact
-- Ensure all constraints are still valid after table removals
-- This will be done through analysis queries, not predetermined changes
```

## Database Size Optimization

### Vacuum and Analyze
```sql
-- After all cleanup operations, optimize database storage
VACUUM FULL;
ANALYZE;

-- Update table statistics for better query planning
```

## Validation Queries

### Data Integrity Check
```sql
-- Comprehensive check for orphaned records after cleanup
WITH orphaned_records AS (
    -- This will be expanded with specific checks for each table relationship
    SELECT 'Check will be implemented during analysis' as status
)
SELECT * FROM orphaned_records;
```

### Performance Validation
```sql
-- Benchmark queries before and after cleanup
-- Ensure no performance regressions
EXPLAIN ANALYZE SELECT /* key application queries */;
```

## Rollback Procedures

### Table Recreation Scripts
```sql
-- For each table removed, maintain recreation script for rollback
-- These will be generated during the analysis phase

-- Example structure:
-- CREATE TABLE IF NOT EXISTS table_name_rollback AS 
-- SELECT * FROM table_name; -- (before deletion)
```

### Index Recreation
```sql
-- Scripts to recreate removed indexes if rollback needed
-- These will be generated based on current index analysis
```

## Migration File Updates

### Consolidation Strategy
- Combine small related migrations where appropriate
- Preserve essential migration history
- Remove failed or rolled-back migrations
- Update migration documentation

### New Cleanup Migration
```sql
-- Create new migration file: YYYYMMDD_database_cleanup.sql
-- This will contain all approved cleanup operations
-- With proper rollback procedures documented
```