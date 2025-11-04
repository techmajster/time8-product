# Migration Status - Task 1 Complete

**Date:** 2025-11-04
**Task:** Database Schema Extensions (Task 1.1-1.7)
**Status:** ✅ COMPLETE - Ready for Deployment

---

## Files Created

### 1. Test Suite
- **File:** `/__tests__/database/seat-management-schema.test.ts`
- **Purpose:** Comprehensive test suite for schema changes
- **Coverage:**
  - Subscriptions table extensions (4 new columns)
  - User_organizations table extensions (2 new columns + enum)
  - Alerts table structure
  - Database constraints validation
  - Performance indexes verification

### 2. Migration Files

#### Migration 1: Subscriptions Table Extensions
- **File:** `/supabase/migrations/20251104000000_add_seat_management_to_subscriptions.sql`
- **Changes:**
  - ✅ Added `current_seats` INTEGER column (current billing period seat count)
  - ✅ Added `pending_seats` INTEGER column (next renewal seat count, nullable)
  - ✅ Added `lemonsqueezy_quantity_synced` BOOLEAN column (sync status)
  - ✅ Added `lemonsqueezy_subscription_item_id` TEXT column (API identifier)
  - ✅ Added check constraints (seats >= 0)
  - ✅ Added 3 performance indexes
  - ✅ Data migration: populated current_seats from quantity

#### Migration 2: User Organizations Table Extensions
- **File:** `/supabase/migrations/20251104000001_add_seat_management_to_user_organizations.sql`
- **Changes:**
  - ✅ Created `user_organization_status` enum (active, pending_removal, archived)
  - ✅ Added `status` column with enum type
  - ✅ Added `removal_effective_date` TIMESTAMPTZ column
  - ✅ Added 4 performance indexes
  - ✅ Created trigger to sync status with is_active (backward compatibility)
  - ✅ Data migration: synced status from is_active boolean

#### Migration 3: Alerts Table Creation
- **File:** `/supabase/migrations/20251104000002_create_alerts_table.sql`
- **Changes:**
  - ✅ Created alerts table with all required columns
  - ✅ Added severity check constraint (info, warning, critical)
  - ✅ Added 4 performance indexes including GIN index for metadata JSONB
  - ✅ Created trigger for automatic resolved_at timestamp
  - ✅ Added RLS policies (admin access + service role)

---

## Migration Details

### Subscriptions Table Schema

```sql
-- New columns added:
current_seats                      INTEGER NOT NULL DEFAULT 0
pending_seats                      INTEGER (nullable)
lemonsqueezy_quantity_synced      BOOLEAN NOT NULL DEFAULT FALSE
lemonsqueezy_subscription_item_id TEXT (nullable)

-- Constraints:
CHECK (current_seats >= 0)
CHECK (pending_seats IS NULL OR pending_seats >= 0)

-- Indexes:
idx_subscriptions_pending_renewal   -- WHERE pending_seats IS NOT NULL
idx_subscriptions_sync_needed       -- WHERE pending_seats IS NOT NULL AND synced = FALSE
idx_subscriptions_active            -- Recreated with current_seats for better queries
```

### User Organizations Table Schema

```sql
-- New enum type:
CREATE TYPE user_organization_status AS ENUM (
    'active',
    'pending_removal',
    'archived'
);

-- New columns added:
status                  user_organization_status NOT NULL DEFAULT 'active'
removal_effective_date TIMESTAMPTZ (nullable)

-- Indexes:
idx_user_organizations_pending_removal      -- WHERE status = 'pending_removal'
idx_user_organizations_archived             -- WHERE status = 'archived'
idx_user_organizations_active_and_pending   -- WHERE status IN ('active', 'pending_removal')
idx_user_organizations_ready_for_archival   -- For webhook archival queries

-- Trigger:
sync_user_organization_is_active_trigger    -- Keeps is_active in sync with status
```

### Alerts Table Schema

```sql
-- Table structure:
id            UUID PRIMARY KEY
severity      TEXT CHECK (severity IN ('info', 'warning', 'critical'))
message       TEXT NOT NULL
resolved      BOOLEAN DEFAULT FALSE
resolved_at   TIMESTAMPTZ (nullable)
resolved_by   UUID REFERENCES profiles(id)
created_at    TIMESTAMPTZ DEFAULT NOW()
metadata      JSONB (nullable)

-- Indexes:
idx_alerts_unresolved  -- WHERE resolved = FALSE
idx_alerts_severity    -- (severity, created_at DESC)
idx_alerts_resolved    -- (resolved, created_at DESC)
idx_alerts_metadata    -- GIN index for JSONB queries

-- Trigger:
set_alert_resolved_at_trigger  -- Auto-sets resolved_at when resolved = TRUE

-- RLS Policies:
- Admins can view all alerts
- Admins can resolve alerts
- Service role can manage alerts
```

---

## Deployment Instructions

### Option 1: Via Supabase MCP (Recommended)

If using Supabase MCP in Claude Code:

```
1. Use mcp__supabase__apply_migration tool
2. Apply migrations in order:
   - 20251104000000_add_seat_management_to_subscriptions.sql
   - 20251104000001_add_seat_management_to_user_organizations.sql
   - 20251104000002_create_alerts_table.sql
```

### Option 2: Via Supabase Dashboard

1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of each migration file
3. Run migrations in order (000000, 000001, 000002)
4. Verify using the SELECT statements at the end of each migration

### Option 3: Via Supabase CLI

```bash
# If Supabase CLI is installed
supabase db reset  # Development only!
# Or for production:
supabase db push
```

---

## Verification Steps

After deployment, verify with these queries:

### 1. Verify Subscriptions Table

```sql
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'subscriptions'
    AND column_name IN (
        'current_seats',
        'pending_seats',
        'lemonsqueezy_quantity_synced',
        'lemonsqueezy_subscription_item_id'
    );
```

**Expected:** 4 rows returned

### 2. Verify User Organizations Table

```sql
SELECT
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'user_organizations'
    AND column_name IN ('status', 'removal_effective_date');
```

**Expected:** 2 rows returned

### 3. Verify Alerts Table

```sql
SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'alerts'
);
```

**Expected:** true

### 4. Verify Enum Type

```sql
SELECT enumlabel
FROM pg_enum
WHERE enumtypid = 'user_organization_status'::regtype
ORDER BY enumsortorder;
```

**Expected:** active, pending_removal, archived

---

## Running Tests

After migrations are applied:

```bash
# Run the test suite
npm test __tests__/database/seat-management-schema.test.ts
```

**Expected:** All tests pass ✅

---

## Rollback Procedures

If issues are encountered, rollback in reverse order:

### Rollback Migration 3 (Alerts)

```sql
DROP TABLE IF EXISTS alerts CASCADE;
DROP FUNCTION IF EXISTS set_alert_resolved_at CASCADE;
```

### Rollback Migration 2 (User Organizations)

```sql
ALTER TABLE user_organizations DROP COLUMN IF EXISTS status CASCADE;
ALTER TABLE user_organizations DROP COLUMN IF EXISTS removal_effective_date CASCADE;
DROP TRIGGER IF EXISTS sync_user_organization_is_active_trigger ON user_organizations;
DROP FUNCTION IF EXISTS sync_user_organization_is_active CASCADE;
DROP TYPE IF EXISTS user_organization_status CASCADE;

-- Drop indexes
DROP INDEX IF EXISTS idx_user_organizations_pending_removal;
DROP INDEX IF EXISTS idx_user_organizations_archived;
DROP INDEX IF EXISTS idx_user_organizations_active_and_pending;
DROP INDEX IF EXISTS idx_user_organizations_ready_for_archival;
```

### Rollback Migration 1 (Subscriptions)

```sql
ALTER TABLE subscriptions DROP COLUMN IF EXISTS current_seats CASCADE;
ALTER TABLE subscriptions DROP COLUMN IF EXISTS pending_seats CASCADE;
ALTER TABLE subscriptions DROP COLUMN IF EXISTS lemonsqueezy_quantity_synced CASCADE;
ALTER TABLE subscriptions DROP COLUMN IF EXISTS lemonsqueezy_subscription_item_id CASCADE;

-- Drop indexes
DROP INDEX IF EXISTS idx_subscriptions_pending_renewal;
DROP INDEX IF EXISTS idx_subscriptions_sync_needed;

-- Restore original idx_subscriptions_active
DROP INDEX IF EXISTS idx_subscriptions_active;
CREATE INDEX idx_subscriptions_active
    ON subscriptions(organization_id, status)
    WHERE status IN ('active', 'on_trial');
```

---

## Next Steps

1. ✅ **Task 1 Complete** - Database schema ready
2. **Next:** Task 2 - Background Jobs Infrastructure
   - Create ApplyPendingSubscriptionChangesJob
   - Create ReconcileSubscriptionsJob
   - Configure cron scheduling

---

## Notes

- All migrations include comprehensive comments and verification queries
- Backward compatibility maintained via trigger (is_active synced with status)
- All indexes designed for specific query patterns used by background jobs
- RLS policies ensure security at database level
- Rollback procedures documented for safety

---

**Migration Author:** Claude (Agent OS)
**Spec Reference:** `.agent-os/specs/2025-11-04-seat-based-subscription-grace-periods/`
**Ready for Review:** Yes ✅
**Ready for Deployment:** Yes ✅
