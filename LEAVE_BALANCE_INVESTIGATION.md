# Leave Balance System Investigation Report

## Executive Summary

Investigation into the leave balance system reveals a **demand-based initialization model** with **critical implications for mandatory absence types migration**. Leave balances are created on-demand when needed, not proactively when new employees join.

---

## Current Leave Balance Initialization System

### 1. How Leave Balances Are Currently Created

#### A. On User Signup with Invitation (PRIMARY PATH)
**File:** `/app/api/auth/signup-with-invitation/route.ts` (Lines 237-283)

```typescript
// 7. Create default leave balances for the new user
if (organizationLeaveTypes.length > 0) {
  const balanceRequiredTypes = organizationLeaveTypes.filter(lt => 
    lt.requires_balance && 
    lt.days_per_year > 0 && 
    !['maternity', 'paternity', 'childcare'].includes(lt.leave_category)
  )
  
  // Creates leave_balances for current year only
  const leaveBalances = balanceRequiredTypes.map(leaveType => ({
    user_id: authData.user.id,
    leave_type_id: leaveType.id,
    organization_id: organization_id,
    year: new Date().getFullYear(),
    entitled_days: leaveType.days_per_year,
    used_days: 0
  }))
  
  await supabaseAdmin.from('leave_balances').insert(leaveBalances)
}
```

**Timing:** During account creation when accepting an invitation
**Scope:** Only `requires_balance=true` leave types with `days_per_year > 0`
**Filtered:** Excludes maternity, paternity, and childcare (child-specific types)
**Year:** Only current year

#### B. On Invitation Acceptance (SECONDARY PATH)
**File:** `/app/api/invitations/accept/route.ts` (Lines 178-221)

For existing users accepting invitations:
```typescript
const { data: organizationLeaveTypes } = await supabaseAdmin
  .from('leave_types')
  .select('*')
  .eq('organization_id', invitation.organization_id)
  .eq('requires_balance', true)
  .gt('days_per_year', 0)

// Same filtering logic as signup
const balanceRequiredTypes = organizationLeaveTypes.filter(lt => 
  !['maternity', 'paternity', 'childcare'].includes(lt.leave_category)
)
```

**Timing:** When an existing user accepts an invitation to join an organization
**Scope:** Only balance-tracking leave types
**Year:** Only current year

#### C. On-Demand Fallback (TERTIARY PATH)
**File:** `/lib/leave-balance-utils.ts` (Lines 52-75)

In `updateLeaveBalance()` function:
```typescript
// If no balance exists, create one (this should rarely happen as balances are typically pre-created)
if (!currentBalance) {
  const newBalance = {
    user_id: update.user_id,
    leave_type_id: update.leave_type_id,
    organization_id: update.organization_id,
    year: update.year,
    entitled_days: leaveType.days_per_year,
    used_days: newUsedDays,
  }
  
  await supabaseAdmin.from('leave_balances').insert(newBalance)
}
```

**Purpose:** Safeguard - creates balance if missing when processing leave requests
**Comment:** "this should rarely happen as balances are typically pre-created"

---

### 2. What Happens When New Employees Join

#### Scenario A: New User via Invitation (Invitation Flow)
1. Admin sends invitation
2. User receives invitation email
3. User creates account with invitation
4. During `POST /api/auth/signup-with-invitation`:
   - ✅ User profile created
   - ✅ Organization membership created
   - ✅ Leave balances created for current year ONLY
   - ✅ Only for `requires_balance=true` types

#### Scenario B: Existing User Joins Existing Organization
1. Admin sends invitation to existing user
2. User is already logged in
3. User accepts via `POST /api/invitations/accept`:
   - ✅ Organization membership activated
   - ✅ Leave balances created for current year ONLY
   - ⚠️ SAME filtering as signup flow

#### Scenario C: User Already in Organization (No Action)
- No automatic balance creation
- Balances only created if missing when leave requests are made

---

### 3. Leave Type Management

**File:** `/types/leave.ts` & `/lib/leave-types-service.ts`

#### Leave Type Attributes Affecting Balance
```typescript
interface LeaveType {
  requires_balance: boolean      // Whether balances must be tracked
  days_per_year: number         // Annual entitlement
  leave_category: string        // Category type
  is_paid: boolean             // Payment status
  requires_approval: boolean    // Approval workflow
  // ... other attributes
}
```

#### Leave Categories (Excluding from Balance Initialization)
- `'maternity'` - 0 days initially, assigned per pregnancy
- `'paternity'` - 0 days initially, assigned per child
- `'childcare'` - 0 days initially, assigned per child

**Rationale:** These are calculated dynamically based on employee circumstances

---

## Key Database Insights

### Multi-Organization Support
**File:** `/supabase/migrations/20250127000000_multi_organization_support.sql`

The system uses:
- `user_organizations` - M:M relationship between users and organizations
- `organization_settings` - Per-organization configuration
- `leave_types` - Organization-scoped leave type definitions
- `leave_balances` - User/org/leave-type/year specific balances

### Migration Handling
When users are migrated to multi-org:
```sql
-- PHASE 2: Migrate user-organization relationships
INSERT INTO user_organizations (...)
SELECT p.id, p.organization_id, p.role, ...
FROM profiles p
WHERE p.organization_id IS NOT NULL
```

**Note:** Leave balances are NOT migrated, only user-organization relationships

---

## Critical Findings for Mandatory Absence Types

### Problem 1: No Retroactive Balance Creation
**Current Behavior:**
- Leave balances created only when:
  1. New user signs up with invitation
  2. Existing user accepts invitation for new org
- ❌ Does NOT create balances for existing employees

**Impact:**
- If you mark a type as mandatory AND add it to an organization, existing employees won't have balances
- Attempting to use mandatory leave without balance will trigger on-demand creation

### Problem 2: Current Year Only
**Current Behavior:**
```typescript
year: new Date().getFullYear()  // Only current year
```

**Impact:**
- Balances created only for the current calendar year
- Mid-year changes don't create balances for employees already employed
- Next year's balances aren't pre-created

### Problem 3: Dynamic Type Filtering
**Current Behavior:**
- Balance creation excludes specific `leave_category` values at initialization time
- But `requires_balance` flag can be toggled

**Impact:**
- If you change `requires_balance: false → true`, no retroactive balance creation
- Employees already employed won't get balances
- May cause application errors if leave requests expect balances

### Problem 4: No Bulk Balance Creation
**Current Behavior:**
- Balances created individually per user during signup
- No API endpoint to bulk-create balances for existing users
- No scheduled job to create annual balances

**Impact:**
- Migrating to mandatory types requires manual intervention
- No tooling to ensure coverage

---

## Code Architecture Summary

### Leave Balance Utils
**File:** `/lib/leave-balance-utils.ts`

Functions:
- `updateLeaveBalance(update)` - Adjusts balance when leave requests change
  - Creates on-demand if missing
  - Updates `used_days` only (remaining calculated by DB)
  
- `handleLeaveRequestApproval(...)` - Deducts days on approval
  - Special case: "Urlop na żądanie" also deducts from "Urlop wypoczynkowy"
  
- `handleLeaveRequestCancellation(...)` - Restores days on cancellation
  
- `handleLeaveRequestEdit(...)` - Adjusts for request modifications

**Key Design:** Uses `used_days` + `remaining_days` (generated column)
```typescript
// Only update used_days - remaining is auto-calculated
const newUsedDays = Math.max(0, currentBalance.used_days - update.days_change)
```

### Employee Management
**File:** `/app/api/employees/route.ts`

POST endpoint creates invitations but:
- ✅ Validates seat availability
- ✅ Checks domain requirements
- ✅ Creates invitation records
- ❌ Does NOT create leave balances

Balance creation happens later via invitation acceptance

---

## Default Leave Types

**File:** `/types/leave.ts` - Lines 314-457

14 default leave types configured with:
- Urlop wypoczynkowy (Annual vacation) - 20 days, `requires_balance=true`
- Urlop na żądanie (On-demand) - 4 days, `requires_balance=true`
- Urlop bezpłatny (Unpaid) - 0 days, `requires_balance=false`
- Urlop macierzyński (Maternity) - 0 days, `requires_balance=true`
- Urlop ojcowski (Paternity) - 0 days, `requires_balance=true`
- Dni wolne wychowawcze (Childcare) - 0 days, `requires_balance=true`
- And 8 more specialized types...

**Filtering Rule:** Only types with `days_per_year > 0` AND `requires_balance=true` AND NOT in `['maternity', 'paternity', 'childcare']` get initialized

---

## Implications for Mandatory Absence Types System

### Current System Can Handle:
✅ Creating balances for NEW employees joining organizations
✅ Creating balances when new organizations are created (via signup flow)
✅ Creating balances for multiple leave types simultaneously
✅ Filtering to exclude child-specific types
✅ On-demand fallback if balance is missing

### Current System Cannot Handle:
❌ Retroactively creating balances for EXISTING employees
❌ Creating balances for future years
❌ Bulk migrations of balance data
❌ Detecting when an existing type becomes mandatory
❌ Ensuring complete coverage without manual intervention

---

## Recommended Approach for Migration

### Phase 1: Preparation
1. Add `is_mandatory` field to `leave_types` table
2. Create migration function: `initialize_mandatory_type_balances(org_id, type_id)`
3. Document which types are considered mandatory

### Phase 2: Activation
1. Mark type as `is_mandatory=true`
2. Trigger balance initialization for ALL existing users in org
3. Create balances for current year + next year

### Phase 3: Ongoing
1. On future years: Auto-create balances for new year
2. When users join org: Create balances for ALL mandatory types (not just balance-required)
3. Monitor for missing balances

---

## Summary Table: Balance Initialization Points

| Trigger | New User? | Existing User? | Future Years? | Mandatory? |
|---------|-----------|----------------|--------------|-----------|
| Signup with invitation | ✅ Current year | N/A | ❌ | ⚠️ (requires_balance only) |
| Accept invitation | N/A | ✅ Current year | ❌ | ⚠️ (requires_balance only) |
| Admin API | ❌ No auto | ❌ No auto | ❌ | ❌ |
| Leave request | ✅ On-demand | ✅ On-demand | ⚠️ (if missing) | ❌ |
| Year transition | ❌ | ❌ | ❌ | ❌ |

---

## Next Steps for Mandatory Absence Types

1. **Audit existing balances** - Identify gaps in current coverage
2. **Design balance backfill** - Create migration for existing employees
3. **Update invitation flow** - Ensure ALL mandatory types included
4. **Add year-end automation** - Pre-create balances for next year
5. **Implement coverage checks** - Alert if mandatory type lacks balances
6. **Document mandatory types** - Clear rules for what's required

