# Database Schema

This is the database schema implementation for the spec detailed in [.agent-os/specs/2025-10-23-mandatory-absence-types/spec.md](../.agent-os/specs/2025-10-23-mandatory-absence-types/spec.md)

## Schema Changes

### 1. Add `is_mandatory` Column to `leave_types` Table

```sql
-- Add is_mandatory column with default false
ALTER TABLE leave_types
ADD COLUMN is_mandatory BOOLEAN NOT NULL DEFAULT false;

-- Create index for performance
CREATE INDEX idx_leave_types_mandatory
ON leave_types(organization_id, is_mandatory)
WHERE is_mandatory = true;

-- Add comment for documentation
COMMENT ON COLUMN leave_types.is_mandatory IS
'Indicates whether this leave type is mandatory and cannot be deleted. Used for Polish labor law compliance (Urlop wypoczynkowy and Urlop bezpłatny).';
```

**Rationale:**
- Default `false` ensures existing leave types remain non-mandatory unless explicitly marked
- Partial index on mandatory types improves query performance when filtering for non-deletable types
- Index includes `organization_id` for efficient multi-tenant queries
- NOT NULL constraint ensures data integrity

### 2. Backfill Existing Mandatory Types

```sql
-- Mark existing Urlop wypoczynkowy as mandatory
UPDATE leave_types
SET is_mandatory = true
WHERE leave_category = 'annual'
  AND (name ILIKE '%wypoczynkowy%' OR name = 'Urlop wypoczynkowy');

-- Mark existing Urlop bezpłatny as mandatory
UPDATE leave_types
SET is_mandatory = true
WHERE leave_category = 'unpaid'
  AND (name ILIKE '%bezpłatny%' OR name = 'Urlop bezpłatny');
```

**Rationale:**
- ILIKE for case-insensitive matching to handle variations in existing data
- Combines `leave_category` and `name` checks for precise identification
- Updates all matching records across all organizations
- Idempotent - can be run multiple times safely

### 3. Ensure All Workspaces Have Mandatory Types

```sql
-- Function to ensure workspace has Urlop wypoczynkowy
CREATE OR REPLACE FUNCTION ensure_mandatory_leave_types(org_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if Urlop wypoczynkowy exists
  IF NOT EXISTS (
    SELECT 1 FROM leave_types
    WHERE organization_id = org_id
      AND leave_category = 'annual'
      AND name ILIKE '%wypoczynkowy%'
  ) THEN
    -- Create it
    INSERT INTO leave_types (
      organization_id,
      name,
      days_per_year,
      color,
      requires_approval,
      requires_balance,
      is_paid,
      leave_category,
      is_mandatory
    ) VALUES (
      org_id,
      'Urlop wypoczynkowy',
      20,
      '#3B82F6',
      true,
      true,
      true,
      'annual',
      true
    );
  END IF;

  -- Check if Urlop bezpłatny exists
  IF NOT EXISTS (
    SELECT 1 FROM leave_types
    WHERE organization_id = org_id
      AND leave_category = 'unpaid'
      AND name ILIKE '%bezpłatny%'
  ) THEN
    -- Create it
    INSERT INTO leave_types (
      organization_id,
      name,
      days_per_year,
      color,
      requires_approval,
      requires_balance,
      is_paid,
      leave_category,
      is_mandatory
    ) VALUES (
      org_id,
      'Urlop bezpłatny',
      0,
      '#F59E0B',
      true,
      false,
      false,
      'unpaid',
      true
    );
  END IF;
END;
$$;

-- Run for all existing organizations
DO $$
DECLARE
  org_record RECORD;
BEGIN
  FOR org_record IN SELECT id FROM organizations LOOP
    PERFORM ensure_mandatory_leave_types(org_record.id);
  END LOOP;
END;
$$;
```

**Rationale:**
- Function encapsulates logic for reusability
- Can be called during organization creation or as migration
- Only creates missing types - doesn't duplicate existing ones
- Sets correct defaults per Polish labor law
- Marked as mandatory from creation

### 4. Backfill Leave Balances for Existing Employees

**Critical:** After ensuring mandatory leave types exist, we must create leave_balances records for all existing employees who don't have them yet.

```sql
-- Function to create missing leave balances for mandatory types
CREATE OR REPLACE FUNCTION backfill_mandatory_leave_balances(org_id UUID)
RETURNS TABLE(
  user_id UUID,
  leave_type_id UUID,
  balances_created INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
  current_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE);
  user_record RECORD;
  type_record RECORD;
  balances_count INTEGER := 0;
BEGIN
  -- Loop through all active users in the organization
  FOR user_record IN
    SELECT DISTINCT uo.user_id
    FROM user_organizations uo
    WHERE uo.organization_id = org_id
      AND uo.is_active = true
  LOOP
    -- Loop through all mandatory leave types in the organization
    FOR type_record IN
      SELECT lt.id, lt.days_per_year, lt.requires_balance
      FROM leave_types lt
      WHERE lt.organization_id = org_id
        AND lt.is_mandatory = true
        AND lt.days_per_year > 0  -- Only Urlop wypoczynkowy (skip Urlop bezpłatny with 0 days)
    LOOP
      -- Check if balance already exists for this user, type, and year
      IF NOT EXISTS (
        SELECT 1 FROM leave_balances
        WHERE user_id = user_record.user_id
          AND leave_type_id = type_record.id
          AND year = current_year
          AND organization_id = org_id
      ) THEN
        -- Create the missing balance record
        INSERT INTO leave_balances (
          user_id,
          leave_type_id,
          year,
          entitled_days,
          used_days,
          remaining_days,
          organization_id
        ) VALUES (
          user_record.user_id,
          type_record.id,
          current_year,
          type_record.days_per_year,  -- Use workspace default
          0,  -- No days used yet
          type_record.days_per_year,  -- All days remaining
          org_id
        );

        balances_count := balances_count + 1;
      END IF;
    END LOOP;
  END LOOP;

  -- Return summary
  RETURN QUERY
  SELECT
    user_record.user_id,
    type_record.id as leave_type_id,
    balances_count;
END;
$$;

-- Run backfill for all existing organizations
DO $$
DECLARE
  org_record RECORD;
  backfill_result RECORD;
  total_created INTEGER := 0;
BEGIN
  RAISE NOTICE 'Starting leave balance backfill for mandatory types...';

  FOR org_record IN SELECT id, name FROM organizations LOOP
    RAISE NOTICE 'Processing organization: % (ID: %)', org_record.name, org_record.id;

    -- Call backfill function
    FOR backfill_result IN
      SELECT * FROM backfill_mandatory_leave_balances(org_record.id)
    LOOP
      total_created := total_created + backfill_result.balances_created;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Backfill complete. Total balances created: %', total_created;
END;
$$;
```

**Rationale:**
- Creates balances ONLY for mandatory types with `days_per_year > 0` (Urlop wypoczynkowy)
- Skips Urlop bezpłatny since it has 0 days and doesn't require balance tracking
- Uses workspace default (`days_per_year`) for initial entitled_days
- Checks for existing records to avoid duplicates (idempotent)
- Only processes active users (`is_active = true`)
- Creates balances for current year only (consistent with onboarding logic)
- Returns summary for audit and verification
- Provides detailed logging via RAISE NOTICE

**Why This Is Critical:**
Based on the investigation in `LEAVE_BALANCE_SUMMARY.md`:
- Balances are created on-demand during user onboarding
- Existing employees who joined before mandatory types were created have NO balances
- Without this backfill, existing employees cannot request Urlop wypoczynkowy
- The on-demand fallback in `leave-balance-utils.ts` is a safety net, not primary creation path

### 5. Add Database Constraint to Prevent Deletion

```sql
-- Create trigger function to prevent deletion of mandatory types
CREATE OR REPLACE FUNCTION prevent_mandatory_leave_type_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.is_mandatory = true THEN
    RAISE EXCEPTION 'Cannot delete mandatory leave type: %. This type is required by Polish labor law.', OLD.name
      USING HINT = 'Mandatory leave types (Urlop wypoczynkowy and Urlop bezpłatny) cannot be deleted.',
            ERRCODE = 'restrict_violation';
  END IF;
  RETURN OLD;
END;
$$;

-- Create trigger
CREATE TRIGGER trg_prevent_mandatory_deletion
BEFORE DELETE ON leave_types
FOR EACH ROW
EXECUTE FUNCTION prevent_mandatory_leave_type_deletion();
```

**Rationale:**
- Database-level enforcement ensures no API bypass can delete mandatory types
- Clear error message explains why deletion is prevented
- Custom error code for programmatic error handling
- BEFORE trigger prevents deletion entirely (not just logging)

### 5. Update RLS Policies (if needed)

```sql
-- Verify existing RLS policies don't need changes
-- Current policies should already handle is_mandatory column correctly

-- Optional: Add explicit policy documentation
COMMENT ON POLICY "Users can view leave types for their organization" ON leave_types IS
'Allows all organization members to view leave types, including mandatory types.';

COMMENT ON POLICY "Admins can manage leave types in their organization" ON leave_types IS
'Allows admins to create, update, and delete leave types. Deletion of mandatory types is prevented by trigger, not RLS.';
```

**Rationale:**
- RLS policies don't need changes - they already scope by organization
- Deletion prevention is handled by trigger, not RLS
- Comments improve maintainability

## Leave Balances Table (No Changes)

The existing `leave_balances` table already supports individual overrides via the `entitled_days` column:

```sql
-- Existing schema (no changes needed):
CREATE TABLE leave_balances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  leave_type_id UUID NOT NULL REFERENCES leave_types(id),
  year INTEGER NOT NULL,
  entitled_days INTEGER NOT NULL,  -- This field stores individual overrides
  used_days INTEGER NOT NULL DEFAULT 0,
  remaining_days INTEGER NOT NULL,
  carry_over_days INTEGER,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, leave_type_id, year, organization_id)
);
```

**Documentation:**
- `entitled_days` stores the actual entitled days for this user, year, and leave type
- When set explicitly by admin, it overrides `leave_types.days_per_year`
- When a balance record doesn't exist, the system falls back to workspace default

## Migration File Structure

```
supabase/migrations/20251023000000_add_mandatory_leave_types.sql
```

### Migration Content Order

1. Add `is_mandatory` column
2. Create index
3. Add comments
4. Backfill existing types (mark as mandatory)
5. Create ensure_mandatory_leave_types function
6. Run ensure function for all orgs (creates missing types)
7. **Create backfill_mandatory_leave_balances function**
8. **Run backfill function for all orgs (creates missing balances for existing employees)**
9. Create deletion prevention trigger
10. Add policy comments (optional)

**Critical Note:** Steps 7-8 are ESSENTIAL for existing employees. Without them, employees who joined before this migration will not have balances for mandatory leave types and won't be able to request leave.

### Rollback Strategy

```sql
-- Rollback script (separate file if needed)
-- NOTE: Rollback does NOT delete created leave_balances records to preserve data integrity

DROP TRIGGER IF EXISTS trg_prevent_mandatory_deletion ON leave_types;
DROP FUNCTION IF EXISTS prevent_mandatory_leave_type_deletion();
DROP FUNCTION IF EXISTS backfill_mandatory_leave_balances(UUID);
DROP FUNCTION IF EXISTS ensure_mandatory_leave_types(UUID);
DROP INDEX IF EXISTS idx_leave_types_mandatory;
ALTER TABLE leave_types DROP COLUMN IF EXISTS is_mandatory;

-- Optional: Reset is_mandatory flag on leave types (if you want to keep column)
-- UPDATE leave_types SET is_mandatory = false WHERE is_mandatory = true;
```

**Important Rollback Notes:**
- We do NOT delete leave_balances records created during backfill
- Deleting balances would cause data loss for employees
- If you need to truly rollback, manually identify and remove only backfilled records
- The `is_mandatory` column can be dropped or reset to false

## Data Integrity Considerations

### Constraints

- `is_mandatory` is NOT NULL to prevent ambiguous states
- Deletion trigger ensures mandatory types can't be removed even with CASCADE
- Unique constraint on leave_balances prevents duplicate balance records

### Indexing Strategy

- Partial index on mandatory types for efficient filtering
- Existing indexes on `organization_id` and `leave_type_id` remain optimal
- No additional indexes needed on `leave_balances` for override logic

### Performance Impact

- Column addition: Minimal (boolean, small data type)
- Index creation: One-time cost, improves query performance
- Trigger overhead: Negligible (only fires on DELETE, which is rare)
- Function calls: Only during migration and new org creation

## Testing Queries

### 1. Verify Mandatory Types Exist

```sql
-- Should return 0 rows if all orgs have both mandatory types
SELECT
  o.id as org_id,
  o.name as org_name,
  COUNT(*) FILTER (WHERE lt.is_mandatory = true) as mandatory_count,
  STRING_AGG(lt.name, ', ') FILTER (WHERE lt.is_mandatory = true) as mandatory_types
FROM organizations o
LEFT JOIN leave_types lt ON lt.organization_id = o.id
GROUP BY o.id, o.name
HAVING COUNT(*) FILTER (WHERE lt.is_mandatory = true) < 2;
```

### 2. Test Deletion Prevention

```sql
-- Should raise error: "Cannot delete mandatory leave type"
DELETE FROM leave_types WHERE is_mandatory = true LIMIT 1;
```

### 3. Verify Leave Balances Were Created for Existing Employees

```sql
-- Shows which employees have balances for mandatory types
SELECT
  o.name as organization,
  p.full_name as employee,
  p.email,
  lt.name as leave_type,
  lb.entitled_days,
  lb.used_days,
  lb.remaining_days,
  CASE
    WHEN lb.id IS NULL THEN '❌ MISSING'
    ELSE '✅ EXISTS'
  END as balance_status
FROM organizations o
JOIN user_organizations uo ON uo.organization_id = o.id AND uo.is_active = true
JOIN profiles p ON p.id = uo.user_id
CROSS JOIN leave_types lt
LEFT JOIN leave_balances lb ON lb.user_id = p.id
  AND lb.leave_type_id = lt.id
  AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE)
  AND lb.organization_id = o.id
WHERE lt.is_mandatory = true
  AND lt.organization_id = o.id
  AND lt.days_per_year > 0  -- Only Urlop wypoczynkowy
ORDER BY o.name, p.full_name, lt.name;

-- Summary: Count employees missing mandatory balances
SELECT
  o.name as organization,
  COUNT(DISTINCT p.id) as total_active_employees,
  COUNT(DISTINCT CASE WHEN lb.id IS NULL THEN p.id END) as employees_missing_balances,
  ROUND(
    (COUNT(DISTINCT CASE WHEN lb.id IS NULL THEN p.id END)::DECIMAL /
     NULLIF(COUNT(DISTINCT p.id), 0)) * 100,
    2
  ) as percent_missing
FROM organizations o
JOIN user_organizations uo ON uo.organization_id = o.id AND uo.is_active = true
JOIN profiles p ON p.id = uo.user_id
CROSS JOIN leave_types lt
LEFT JOIN leave_balances lb ON lb.user_id = p.id
  AND lb.leave_type_id = lt.id
  AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE)
  AND lb.organization_id = o.id
WHERE lt.is_mandatory = true
  AND lt.organization_id = o.id
  AND lt.days_per_year > 0
GROUP BY o.name
ORDER BY employees_missing_balances DESC;
```

### 4. Verify Balance Override Behavior

```sql
-- Shows effective balance calculation (override vs. workspace default)
SELECT
  o.name as organization,
  p.full_name as employee,
  lt.name as leave_type,
  lt.days_per_year as workspace_default,
  lb.entitled_days as individual_balance,
  CASE
    WHEN lb.entitled_days IS NULL THEN lt.days_per_year
    ELSE lb.entitled_days
  END as effective_balance,
  CASE
    WHEN lb.entitled_days IS NULL THEN 'Using workspace default'
    WHEN lb.entitled_days = lt.days_per_year THEN 'Matches workspace default'
    ELSE 'Custom override'
  END as balance_source
FROM organizations o
JOIN user_organizations uo ON uo.organization_id = o.id AND uo.is_active = true
JOIN profiles p ON p.id = uo.user_id
CROSS JOIN leave_types lt
LEFT JOIN leave_balances lb ON lb.user_id = p.id
  AND lb.leave_type_id = lt.id
  AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE)
  AND lb.organization_id = o.id
WHERE lt.is_mandatory = true
  AND lt.organization_id = o.id
ORDER BY o.name, p.full_name, lt.name;
```

### 5. Count Backfill Results

```sql
-- Shows how many balances were created during backfill
SELECT
  'Total mandatory leave types' as metric,
  COUNT(*) as count
FROM leave_types
WHERE is_mandatory = true

UNION ALL

SELECT
  'Total active employees across all orgs' as metric,
  COUNT(DISTINCT uo.user_id) as count
FROM user_organizations uo
WHERE uo.is_active = true

UNION ALL

SELECT
  'Total leave balances for mandatory types (current year)' as metric,
  COUNT(*) as count
FROM leave_balances lb
JOIN leave_types lt ON lt.id = lb.leave_type_id
WHERE lt.is_mandatory = true
  AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE)

UNION ALL

SELECT
  'Expected balances (employees × mandatory types)' as metric,
  COUNT(DISTINCT uo.user_id) *
  (SELECT COUNT(DISTINCT lt.id)
   FROM leave_types lt
   WHERE lt.is_mandatory = true AND lt.days_per_year > 0) as count
FROM user_organizations uo
WHERE uo.is_active = true;
```

## Post-Migration Verification

After running the migration, verify:

1. **All organizations have exactly 2 mandatory leave types** (Test Query #1)
2. **Attempting to delete mandatory types raises error** (Test Query #2)
3. **All active employees have balances for Urlop wypoczynkowy** (Test Query #3)
   - Should show 0% employees missing balances
   - If any missing, re-run backfill function for affected org
4. **Indexes are created successfully**
   ```sql
   SELECT indexname, tablename FROM pg_indexes
   WHERE indexname = 'idx_leave_types_mandatory';
   ```
5. **Triggers are active and functional**
   ```sql
   SELECT tgname, tgtype, tgenabled
   FROM pg_trigger
   WHERE tgname = 'trg_prevent_mandatory_deletion';
   ```
6. **Balance calculations work correctly** (Test Query #4)
   - Verify override vs. workspace default logic
   - Check that employees see correct entitled_days
7. **Backfill statistics match expectations** (Test Query #5)
   - Total balances should equal (active employees × mandatory types with days > 0)

### Troubleshooting Failed Backfill

If Test Query #3 shows missing balances:

```sql
-- Manually run backfill for specific organization
SELECT * FROM backfill_mandatory_leave_balances('<org-id-here>');

-- Or re-run for all orgs
DO $$
DECLARE
  org_record RECORD;
BEGIN
  FOR org_record IN SELECT id, name FROM organizations LOOP
    RAISE NOTICE 'Re-running backfill for: %', org_record.name;
    PERFORM backfill_mandatory_leave_balances(org_record.id);
  END LOOP;
END;
$$;
```
