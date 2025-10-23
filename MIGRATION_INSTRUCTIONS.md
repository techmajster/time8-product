# Migration Instructions for Calendar Visibility Feature

## Required Migration

The Calendar Visibility feature requires a new column in the `organizations` table. You need to apply this migration:

**File**: `supabase/migrations/20251022000001_add_restrict_calendar_by_group.sql`

## How to Apply the Migration

### Option 1: Using Supabase CLI (Recommended)

```bash
# Make sure you're connected to your remote Supabase project
npx supabase link --project-ref YOUR_PROJECT_REF

# Apply the migration to remote database
npx supabase db push
```

### Option 2: Using Supabase Dashboard

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `supabase/migrations/20251022000001_add_restrict_calendar_by_group.sql`
4. Paste into SQL Editor and click **Run**

### Option 3: Manual SQL Execution

Execute this SQL directly in your production database:

```sql
BEGIN;

ALTER TABLE organizations
    ADD COLUMN restrict_calendar_by_group BOOLEAN DEFAULT false;

COMMENT ON COLUMN organizations.restrict_calendar_by_group IS
'When true, users in groups can only see calendars of their group members. Users without groups see everyone. When false (default), all users see all calendars.';

CREATE INDEX idx_organizations_restrict_calendar
    ON organizations(restrict_calendar_by_group)
    WHERE restrict_calendar_by_group = true;

COMMIT;
```

## After Applying Migration

Once the migration is applied, the Calendar Visibility toggle in Admin Settings will work correctly.

Test by:
1. Going to `/admin/settings`
2. Clicking the "Widoczność kalendarza" tab
3. Toggling the switch
4. Checking the calendar at `/calendar` to verify filtering

## Rollback (if needed)

If you need to rollback this migration:

```sql
BEGIN;

DROP INDEX IF EXISTS idx_organizations_restrict_calendar;
ALTER TABLE organizations DROP COLUMN IF EXISTS restrict_calendar_by_group;

COMMIT;
```
