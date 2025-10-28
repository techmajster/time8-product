# Leave Balance System - Quick Summary

## Key Finding
**Balances are created on-demand during user onboarding, NOT retroactively for existing employees.**

## Three Balance Creation Paths

### 1. New User Signup with Invitation (PRIMARY)
- **Trigger:** User creates account via invitation link
- **File:** `/app/api/auth/signup-with-invitation/route.ts` (lines 237-283)
- **Creates:** Balances for all `requires_balance=true` types with `days_per_year > 0`
- **Excludes:** Maternity, paternity, childcare (child-specific)
- **Year:** Current year only

### 2. Existing User Accepts Invitation (SECONDARY)
- **Trigger:** User joins new organization via invitation
- **File:** `/app/api/invitations/accept/route.ts` (lines 178-221)
- **Creates:** Same as above
- **Year:** Current year only

### 3. On-Demand During Leave Request (FALLBACK)
- **Trigger:** Leave request processed but no balance exists
- **File:** `/lib/leave-balance-utils.ts` (lines 52-75)
- **Creates:** Single balance record if missing
- **Note:** "Should rarely happen as balances are typically pre-created"

## Critical Gaps for Mandatory Types

| Scenario | Handled? | Issue |
|----------|----------|-------|
| New employee joins | ✅ Yes | Only `requires_balance=true` types |
| Existing employee needs new mandatory type | ❌ No | No retroactive balance creation |
| Mid-year type becomes mandatory | ❌ No | Existing employees not covered |
| Year transition | ❌ No | Next year balances not pre-created |
| Bulk employee import | ❌ No | No API for batch balance creation |

## For Mandatory Absence Types Migration

### What Works Today
- Balances auto-created for new employees
- Balances auto-created for new organizations
- On-demand fallback prevents errors

### What Needs Work
- **Backfill:** Must create balances for existing employees
- **Coverage:** Must handle mid-year type changes
- **Automation:** Must pre-create future-year balances
- **Validation:** Must audit and enforce balance existence

## Key Files to Modify

1. **`/app/api/auth/signup-with-invitation/route.ts`**
   - Update to include mandatory types in balance creation
   - Currently filters by `requires_balance` flag

2. **`/app/api/invitations/accept/route.ts`**
   - Same filtering logic - needs update for mandatory types

3. **`/lib/leave-balance-utils.ts`**
   - Can be enhanced for mandatory type checks

4. **Database Migration**
   - Add `is_mandatory` field to `leave_types`
   - Create backfill function for existing employees

## Quick Decision Matrix

**Question:** Can I just mark a type as mandatory today?

**Answer:** 
- ✅ New employees: Yes, balances created automatically
- ❌ Existing employees: No, must manually create balances
- ⚠️ Year transition: No, next year not prepared

**Recommendation:**
1. Add `is_mandatory` flag to `leave_types` table
2. Create migration function: `ensure_mandatory_type_balances(org_id)`
3. Run before marking type as mandatory
4. Update invitation flow to include mandatory types

