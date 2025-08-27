# Workspace Owner Balance Migration Guide

## Overview

This document describes the solution for initializing leave balances for existing workspace owners who created their organizations before the balance initialization fix was implemented.

## Problem

Before the fix, when users created new workspaces:
1. ✅ Leave types were created for the organization
2. ❌ Leave balances were NOT created for the workspace creator
3. ❌ Workspace owners had 0 vacation days and couldn't add days for themselves

After the fix, new workspace creators automatically get:
- 20 days vacation leave balance
- 4 days on-demand leave balance  
- Other eligible leave type balances based on `requires_balance: true` and `days_per_year > 0`

## Solution

### 1. Migration API Endpoint

**Endpoint:** `POST /api/admin/fix-workspace-owners-balances`

**Authentication:** Requires admin role

**Parameters:**
```json
{
  "dryRun": true  // Set to false to actually create balances
}
```

**What it does:**
1. Finds all workspace owners (users with `role='admin'` and `joined_via='created'`)
2. Identifies leave types requiring balances (`requires_balance: true`, `days_per_year > 0`)
3. Filters out child-specific leave types (`maternity`, `paternity`, `childcare`)
4. Checks for existing balances to avoid duplicates
5. Creates missing balances with default values

### 2. Admin UI

**Page:** `/admin/fix-workspace-owners-balances`

**Features:**
- **Preview Mode (Dry Run):** Shows what would be created without making changes
- **Migration Mode:** Actually creates the missing balances
- **Detailed Results:** Shows per-owner breakdown of what was created
- **Error Handling:** Reports any issues encountered

### 3. Command Line Script

**File:** `scripts/fix-existing-workspace-owners-balances.ts`

**Usage:** `npx tsx scripts/fix-existing-workspace-owners-balances.ts`

**Requirements:** 
- `SUPABASE_SERVICE_ROLE_KEY` environment variable must be set
- Direct database access via admin client

## Usage Instructions

### Option 1: Web UI (Recommended)

1. Navigate to `/admin/fix-workspace-owners-balances` as an admin user
2. Click **"Preview (Dry Run)"** first to see what would be changed
3. Review the results carefully
4. Click **"Run Migration"** to actually create the balances
5. Verify the results show successful balance creation

### Option 2: API Direct

```bash
# Preview what would be changed
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"dryRun": true}' \
  https://your-app.com/api/admin/fix-workspace-owners-balances

# Actually run the migration  
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"dryRun": false}' \
  https://your-app.com/api/admin/fix-workspace-owners-balances
```

### Option 3: Command Line Script

```bash
# Set environment variable
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Run the script
npx tsx scripts/fix-existing-workspace-owners-balances.ts
```

## Safety Features

### 1. Dry Run Mode
- Default mode is dry run (`dryRun: true`)
- Shows exactly what would be created without making changes
- Allows verification before actual execution

### 2. Duplicate Prevention
- Checks for existing balances before creating new ones
- Uses composite key check: `user_id + leave_type_id + organization_id`
- Only creates missing balances

### 3. Error Handling
- Graceful handling of individual owner errors
- Continues processing other owners if one fails  
- Detailed error reporting per owner

### 4. Filtering Logic
- Only processes workspace owners (`role='admin'`, `joined_via='created'`)
- Only processes balance-required leave types (`requires_balance: true`)
- Excludes child-specific leave types to prevent inappropriate balance creation
- Only processes leave types with `days_per_year > 0`

## Expected Results

For a typical workspace owner, the migration should create:

| Leave Type | Days | Category |
|------------|------|----------|
| Urlop wypoczynkowy (Vacation Leave) | 20 | annual |
| Urlop na żądanie (On-demand Leave) | 4 | annual |
| Urlop opiekuńczy (Care Leave) | 5 | care |
| Zwolnienie z powodu siły wyższej (Force Majeure) | 2 | emergency |
| Urlop na poszukiwanie pracy (Job Search Leave) | 3 | special |

**Note:** Child-specific leave types (maternity, paternity, childcare) are intentionally excluded and will be assigned manually when relevant.

## Verification

After running the migration:

1. **Check Admin Dashboard:** Workspace owners should now see their vacation balances
2. **Test Leave Requests:** Owners should be able to create leave requests
3. **Verify Database:** Check `leave_balances` table for new entries
4. **Monitor Logs:** Check for any error messages in the migration results

## Troubleshooting

### Common Issues

**"No workspace owners found"**
- This is normal if all owners already have balances
- Verify using dry run mode first

**"Failed to fetch leave types"**  
- Check organization has leave types configured
- Verify database connectivity

**"Failed to create balances"**
- Check database permissions
- Look for constraint violations (usually duplicate prevention working)

**Authentication/Authorization errors**
- Ensure running as admin user
- Check session is valid

## Files Modified/Created

### New Files
- `app/api/admin/fix-workspace-owners-balances/route.ts` - API endpoint
- `app/admin/fix-workspace-owners-balances/page.tsx` - Admin page
- `app/admin/fix-workspace-owners-balances/components/FixWorkspaceOwnersBalancesClient.tsx` - UI component  
- `scripts/fix-existing-workspace-owners-balances.ts` - Command line script

### Database Changes
- Creates entries in `leave_balances` table
- No schema changes required

## Security Considerations

- API endpoint requires admin authentication
- Uses admin client for database operations
- No sensitive data exposure in responses
- Audit trail through server logs
- Dry run mode prevents accidental changes

---

*This migration should be run once after deploying the workspace creator balance initialization fix to ensure all existing workspace owners have their proper leave balances.*