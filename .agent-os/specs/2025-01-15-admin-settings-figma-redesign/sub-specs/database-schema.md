# Database Schema

This is the database schema implementation for the spec detailed in @.agent-os/specs/2025-01-15-admin-settings-figma-redesign/spec.md

## Schema Changes

### Organizations Table Modifications

**Remove Columns:**
```sql
ALTER TABLE organizations DROP COLUMN IF EXISTS slug;
ALTER TABLE organizations DROP COLUMN IF EXISTS google_domain;
ALTER TABLE organizations DROP COLUMN IF EXISTS require_google_domain;
ALTER TABLE organizations DROP COLUMN IF EXISTS logo_url;
```

**Add Columns (for future functionality):**
```sql
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS work_start_time TIME DEFAULT NULL;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS work_end_time TIME DEFAULT NULL;
```

### Migration Strategy

**Migration File:** `supabase/migrations/YYYYMMDDHHMMSS_remove_deprecated_org_fields.sql`

```sql
-- Remove deprecated organization fields
-- This migration removes UI-only fields that are no longer used

BEGIN;

-- Drop columns that are no longer needed
ALTER TABLE organizations DROP COLUMN IF EXISTS slug;
ALTER TABLE organizations DROP COLUMN IF EXISTS google_domain;
ALTER TABLE organizations DROP COLUMN IF EXISTS require_google_domain;
ALTER TABLE organizations DROP COLUMN IF EXISTS logo_url;

-- Add work hours columns for future use (nullable, not yet functional)
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS work_start_time TIME DEFAULT NULL;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS work_end_time TIME DEFAULT NULL;

COMMIT;
```

### Rationale

**Removing slug:**
- No longer used in URLs or routing
- Organization identification via `id` is sufficient
- Simplifies organization creation flow

**Removing google_domain and require_google_domain:**
- Google Workspace integration moved to different implementation
- These fields are not part of current admin settings UI
- Can be re-added in future if needed

**Removing logo_url:**
- Logo upload functionality removed from admin settings
- Organization branding will be handled differently
- Field can be re-added when proper file storage is implemented

**Adding work_start_time and work_end_time:**
- Prepares database for future work hours functionality
- Nullable to allow gradual rollout
- TIME type stores hours and minutes without date component
- Defaults to NULL until backend functionality is implemented

### Data Integrity

**Pre-Migration Considerations:**
- Backup any existing slug, google_domain, logo_url data if needed
- Verify no application code depends on these columns
- Check for any database triggers or constraints on these columns

**Post-Migration Validation:**
```sql
-- Verify columns were removed
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'organizations'
  AND column_name IN ('slug', 'google_domain', 'require_google_domain', 'logo_url');
-- Should return 0 rows

-- Verify new columns were added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'organizations'
  AND column_name IN ('work_start_time', 'work_end_time');
-- Should return 2 rows with TYPE = time and default = NULL
```

### Rollback Plan

```sql
-- Rollback migration if needed
BEGIN;

-- Re-add removed columns
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS google_domain TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS require_google_domain BOOLEAN DEFAULT false;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Remove newly added columns
ALTER TABLE organizations DROP COLUMN IF EXISTS work_start_time;
ALTER TABLE organizations DROP COLUMN IF EXISTS work_end_time;

COMMIT;
```

## Impact on Other Tables

**No changes required for:**
- `leave_types` - All columns remain intact
- `leave_balances` - All columns remain intact
- `leave_requests` - All columns remain intact
- `user_organizations` - All columns remain intact
- `profiles` - All columns remain intact
- `teams` - All columns remain intact
- `subscriptions` - All columns remain intact

**Verification:**
- Leave types table structure preserved
- All existing leave types data retained
- User-organization relationships unchanged
- No cascade deletions triggered

## Performance Considerations

**Index Updates:**
- Remove any indexes on dropped columns (automatic with DROP COLUMN)
- No new indexes needed for work_start_time/work_end_time yet
- Existing organization primary key and foreign key indexes remain intact

**Query Performance:**
- Reduced column count in organizations table improves SELECT * queries slightly
- No impact on JOIN performance
- No impact on WHERE clause performance for retained columns

## Testing Checklist

- [ ] Run migration on development database
- [ ] Verify all columns dropped successfully
- [ ] Verify new columns added with correct types
- [ ] Test organization CRUD operations still work
- [ ] Verify leave types queries unaffected
- [ ] Test admin settings page loads without errors
- [ ] Confirm no TypeScript errors from removed fields
- [ ] Run full test suite to catch any dependencies
