# Spec Requirements Document

> Spec: Database Cleanup
> Created: 2025-08-05
> Status: Planning

## Overview

Clean up the database by removing obsolete tables, unused migration files, and optimizing database structure after the multi-organization migration transition. This will improve database performance, reduce storage costs, and eliminate potential security risks from abandoned database artifacts.

## User Stories

### Database Administrator Story

As a database administrator, I want to remove obsolete tables and unused migrations, so that the database is clean, performant, and maintainable without legacy artifacts that could cause confusion or security issues.

**Detailed Workflow:**
1. Analyze current database schema to identify obsolete tables and artifacts
2. Safely remove unused tables while preserving all active data
3. Clean up migration files that are no longer needed
4. Optimize remaining database structure for better performance
5. Validate that all application functionality remains intact after cleanup

### Developer Story

As a developer, I want a clean database structure, so that I can work with a clear, understandable schema without legacy artifacts from previous iterations of the multi-organization migration.

**Detailed Workflow:**
1. Review database changes to understand what was cleaned up
2. Update any documentation or database diagrams
3. Verify that all existing queries and API endpoints continue to work
4. Test all application features to ensure no regressions

## Spec Scope

1. **Obsolete Table Removal** - Identify and safely remove unused tables from the multi-org migration
2. **Migration File Cleanup** - Remove or consolidate unused migration files in the migrations directory
3. **Database Optimization** - Review and optimize indexes, constraints, and RLS policies
4. **Schema Validation** - Ensure all removed items don't break existing functionality
5. **Documentation Update** - Update any schema documentation to reflect cleaned structure

## Out of Scope

- Modifying core application tables that are actively used
- Changing the multi-organization structure itself
- Performance tuning beyond basic cleanup optimizations
- Data migration or transformation of existing records
- Backup and recovery system modifications

## Expected Deliverable

1. All obsolete tables and artifacts removed from the database
2. Migration files cleaned up and consolidated where appropriate
3. Database schema optimized with unnecessary indexes/constraints removed