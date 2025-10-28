# Leave Balance System - Code References

## File Structure Overview

```
app/
├── api/
│   ├── auth/
│   │   ├── signup-with-invitation/route.ts      [Balance creation on signup]
│   │   └── signup/route.ts                       [No balance creation]
│   ├── invitations/
│   │   ├── accept/route.ts                       [Balance creation on accept]
│   │   └── lookup/route.ts                       [Invitation verification]
│   └── employees/
│       ├── route.ts                              [Invitation creation]
│       └── [id]/leave-balances/route.ts          [Balance retrieval]
│
lib/
├── leave-balance-utils.ts                        [Balance update logic]
├── leave-types-service.ts                        [Leave type queries]
├── leave-validation.ts                           [Validation rules]
└── supabase/server.ts                            [DB connection]

types/
└── leave.ts                                      [TypeScript definitions]
```

---

## Primary Balance Creation Code

### File 1: `/app/api/auth/signup-with-invitation/route.ts`

**Lines 187-236:** Setup default leave types for organization
```typescript
// 6. Create default leave types for the user (if they don't exist for the organization)
console.log('🏖️ Setting up leave types...')
let organizationLeaveTypes = []
try {
  const { DEFAULT_LEAVE_TYPES } = await import('@/types/leave')
  
  // Check if leave types already exist for this organization
  const { data: existingLeaveTypes, error: leaveTypesCheckError } = await supabaseAdmin
    .from('leave_types')
    .select('*')
    .eq('organization_id', organization_id)

  if (!existingLeaveTypes || existingLeaveTypes.length === 0) {
    // Create default leave types for the organization
    const { data: createdLeaveTypes, error: leaveTypesError } = await supabaseAdmin
      .from('leave_types')
      .insert(DEFAULT_LEAVE_TYPES.map(type => ({...})))
      .select()
    
    organizationLeaveTypes = createdLeaveTypes || []
  } else {
    organizationLeaveTypes = existingLeaveTypes
  }
}
```

**Lines 237-283:** Create leave balances for new user
```typescript
// 7. Create default leave balances for the new user
console.log('💰 Creating leave balances for new user...')
try {
  if (organizationLeaveTypes.length > 0) {
    // Filter leave types that require balance tracking and aren't child-specific
    const balanceRequiredTypes = organizationLeaveTypes.filter(lt => 
      lt.requires_balance && 
      lt.days_per_year > 0 && 
      !['maternity', 'paternity', 'childcare'].includes(lt.leave_category)
    )

    if (balanceRequiredTypes.length > 0) {
      const leaveBalances = balanceRequiredTypes.map(leaveType => ({
        user_id: authData.user.id,
        leave_type_id: leaveType.id,
        organization_id: organization_id,
        year: new Date().getFullYear(),
        entitled_days: leaveType.days_per_year,
        used_days: 0
      }))

      console.log('💰 Creating leave balances:', { 
        userId: authData.user.id, 
        balancesCount: leaveBalances.length,
        balances: leaveBalances 
      })

      const { error: balancesError } = await supabaseAdmin
        .from('leave_balances')
        .insert(leaveBalances)

      if (balancesError) {
        console.error('⚠️ Leave balances creation error:', balancesError)
        // Don't fail the process, balances can be created later
      } else {
        console.log('✅ Leave balances created for new user')
      }
    }
  }
}
```

**Key Points:**
- Line 244: Filter on `lt.requires_balance`
- Line 245: Filter on `lt.days_per_year > 0`
- Line 246: Exclude `['maternity', 'paternity', 'childcare']`
- Line 253: Set year to `new Date().getFullYear()`

---

### File 2: `/app/api/invitations/accept/route.ts`

**Lines 178-221:** Create balances when existing user joins organization
```typescript
// 5. Create leave balances for the new user in this organization
console.log('💰 Creating leave balances for user in new organization...')
try {
  const { data: organizationLeaveTypes, error: leaveTypesError } = await supabaseAdmin
    .from('leave_types')
    .select('*')
    .eq('organization_id', invitation.organization_id)
    .eq('requires_balance', true)
    .gt('days_per_year', 0)

  if (leaveTypesError) {
    console.error('⚠️ Leave types fetch error:', leaveTypesError)
  } else if (organizationLeaveTypes && organizationLeaveTypes.length > 0) {
    // Filter out child-specific leave types
    const balanceRequiredTypes = organizationLeaveTypes.filter(lt => 
      !['maternity', 'paternity', 'childcare'].includes(lt.leave_category)
    )

    if (balanceRequiredTypes.length > 0) {
      const leaveBalances = balanceRequiredTypes.map(leaveType => ({
        user_id: user.id,
        leave_type_id: leaveType.id,
        organization_id: invitation.organization_id,
        year: new Date().getFullYear(),
        entitled_days: leaveType.days_per_year,
        used_days: 0
      }))

      const { error: balancesError } = await supabaseAdmin
        .from('leave_balances')
        .insert(leaveBalances)

      if (balancesError) {
        console.error('⚠️ Leave balances creation error:', balancesError)
        // Don't fail the process
      } else {
        console.log('✅ Leave balances created')
      }
    }
  }
}
```

**Key Points:**
- Line 181-186: Query with `requires_balance=true` and `days_per_year > 0`
- Line 192: Apply same category filtering
- Line 201: Current year only
- Same structure as signup flow

---

### File 3: `/lib/leave-balance-utils.ts`

**Lines 15-110:** Main balance update function
```typescript
export async function updateLeaveBalance(update: LeaveBalanceUpdate) {
  const supabase = await createClient()

  try {
    // First check if this leave type requires balance tracking
    const { data: leaveType, error: leaveTypeError } = await supabase
      .from('leave_types')
      .select('requires_balance, days_per_year')
      .eq('id', update.leave_type_id)
      .eq('organization_id', update.organization_id)
      .single()

    if (!leaveType.requires_balance) {
      console.log(`Skipping balance update for leave type ${update.leave_type_id}`)
      return null
    }

    // Get current balance
    const { data: currentBalance, error: fetchError } = await supabase
      .from('leave_balances')
      .select('*')
      .eq('user_id', update.user_id)
      .eq('leave_type_id', update.leave_type_id)
      .eq('year', update.year)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      console.error('Error fetching leave balance:', fetchError)
      throw new Error('Failed to fetch current leave balance')
    }

    // If no balance exists, create one (this should rarely happen)
    if (!currentBalance) {
      const newUsedDays = Math.max(0, -update.days_change)
      const newBalance = {
        user_id: update.user_id,
        leave_type_id: update.leave_type_id,
        organization_id: update.organization_id,
        year: update.year,
        entitled_days: leaveType.days_per_year,
        used_days: newUsedDays,
      }

      const { error: createError } = await supabaseAdmin
        .from('leave_balances')
        .insert(newBalance)

      if (createError) {
        console.error('Error creating leave balance:', createError)
        throw new Error('Failed to create leave balance')
      }

      return newBalance
    }

    // Update existing balance
    const newUsedDays = Math.max(0, currentBalance.used_days - update.days_change)

    const { data: updatedBalance, error: updateError } = await supabase
      .from('leave_balances')
      .update({
        used_days: newUsedDays,
      })
      .eq('id', currentBalance.id)
      .select()
      .single()
  }
}
```

**Key Points:**
- Line 52: "this should rarely happen as balances are typically pre-created"
- Line 54: On-demand creation only when balance missing
- Line 78: Only updates `used_days`, remaining is calculated

---

## Default Leave Types Definition

### File: `/types/leave.ts`

**Lines 314-457:** DEFAULT_LEAVE_TYPES array
```typescript
export const DEFAULT_LEAVE_TYPES = [
  {
    name: 'Urlop wypoczynkowy',
    days_per_year: 20,
    color: '#3B82F6',
    requires_approval: true,
    requires_balance: true,           // ← Will get balance
    is_paid: true,
    leave_category: 'annual',
  },
  {
    name: 'Urlop na żądanie',
    days_per_year: 4,
    color: '#10B981',
    requires_approval: false,
    requires_balance: true,           // ← Will get balance
    is_paid: true,
    leave_category: 'annual',
  },
  {
    name: 'Urlop bezpłatny',
    days_per_year: 0,
    color: '#F59E0B',
    requires_approval: true,
    requires_balance: false,          // ← NO balance
    is_paid: false,
    leave_category: 'unpaid',
  },
  {
    name: 'Urlop macierzyński',
    days_per_year: 0,
    color: '#EC4899',
    requires_approval: true,
    requires_balance: true,           // ← balance but excluded
    is_paid: true,
    leave_category: 'maternity',      // ← EXCLUDED from init
  },
  // ... more types
]
```

**Filtering Logic:**
Balance only created if:
1. ✅ `requires_balance === true`
2. ✅ `days_per_year > 0`
3. ✅ `leave_category` NOT in `['maternity', 'paternity', 'childcare']`

---

## Leave Balance Calculation

### Generated Column: `remaining_days`

The `leave_balances` table has a calculated field:
```sql
remaining_days = entitled_days - used_days
```

This is computed by PostgreSQL automatically, not in application code.

**Update Pattern:**
```typescript
// Only modify used_days
await supabaseAdmin
  .from('leave_balances')
  .update({ used_days: newUsedDays })
  .eq('id', balance.id)

// remaining_days is auto-calculated
// No need to update it explicitly
```

---

## Special Case: "Urlop na żądanie" Logic

### File: `/lib/leave-balance-utils.ts` Lines 115-177

When "Urlop na żądanie" (on-demand leave) is approved:
```typescript
export async function handleLeaveRequestApproval(
  user_id: string,
  leave_type_id: string,
  days_requested: number,
  organization_id: string,
  year: number = new Date().getFullYear()
) {
  // ... 
  
  // Get the leave type to check if it's "Urlop na żądanie"
  const { data: leaveType } = await supabase
    .from('leave_types')
    .select('name')
    .eq('id', leave_type_id)
    .single()

  // Update the primary leave type balance
  const primaryResult = await updateLeaveBalance({...})

  // Special case: "Urlop na żądanie" also deducts from "Urlop wypoczynkowy"
  if (leaveType.name === 'Urlop na żądanie') {
    console.log(`Processing dual deduction for "Urlop na żądanie"`)
    
    const { data: vacationLeaveType } = await supabase
      .from('leave_types')
      .select('id')
      .eq('name', 'Urlop wypoczynkowy')
      .eq('organization_id', organization_id)
      .single()

    if (!vacationError && vacationLeaveType) {
      // Also deduct from vacation leave balance
      await updateLeaveBalance({
        user_id,
        leave_type_id: vacationLeaveType.id,
        days_change: -days_requested,
        organization_id,
        year
      })
    }
  }

  return primaryResult
}
```

**Why?** In Polish labor law, on-demand leave is part of the annual vacation entitlement.

---

## Database Schema References

### leave_balances table
```
id (UUID, PK)
user_id (UUID, FK → auth.users)
leave_type_id (UUID, FK → leave_types)
organization_id (UUID, FK → organizations)
year (INTEGER)
entitled_days (NUMERIC)
used_days (NUMERIC)
remaining_days (NUMERIC, GENERATED AS entitled_days - used_days)
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
```

### leave_types table
```
id (UUID, PK)
organization_id (UUID, FK → organizations)
name (TEXT)
days_per_year (NUMERIC)
color (TEXT)
requires_approval (BOOLEAN)
requires_balance (BOOLEAN) ← Key filter
leave_category (TEXT) ← Used for exclusions
is_paid (BOOLEAN)
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
```

---

## To Add Mandatory Types Support

### 1. Add Column to leave_types
```sql
ALTER TABLE leave_types
ADD COLUMN is_mandatory BOOLEAN DEFAULT false;
```

### 2. Update Balance Creation Queries
Instead of:
```typescript
const balanceRequiredTypes = organizationLeaveTypes.filter(lt => 
  lt.requires_balance && 
  lt.days_per_year > 0 && 
  !['maternity', 'paternity', 'childcare'].includes(lt.leave_category)
)
```

Use:
```typescript
const balanceRequiredTypes = organizationLeaveTypes.filter(lt => 
  (lt.requires_balance || lt.is_mandatory) &&  // ← Include mandatory
  lt.days_per_year > 0 && 
  !['maternity', 'paternity', 'childcare'].includes(lt.leave_category)
)
```

### 3. Create Backfill Function
```sql
CREATE OR REPLACE FUNCTION initialize_mandatory_type_balances(
  p_organization_id UUID,
  p_leave_type_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_users_count INTEGER := 0;
  v_balances_created INTEGER := 0;
BEGIN
  -- Create balances for all active users in organization
  INSERT INTO leave_balances (
    user_id, leave_type_id, organization_id, year,
    entitled_days, used_days
  )
  SELECT 
    uo.user_id,
    p_leave_type_id,
    p_organization_id,
    EXTRACT(YEAR FROM NOW())::INTEGER,
    lt.days_per_year,
    0
  FROM user_organizations uo
  JOIN leave_types lt ON lt.id = p_leave_type_id
  WHERE uo.organization_id = p_organization_id
    AND uo.is_active = true
    AND NOT EXISTS (
      SELECT 1 FROM leave_balances lb
      WHERE lb.user_id = uo.user_id
        AND lb.leave_type_id = p_leave_type_id
        AND lb.organization_id = p_organization_id
        AND lb.year = EXTRACT(YEAR FROM NOW())::INTEGER
    );

  GET DIAGNOSTICS v_balances_created = ROW_COUNT;

  RETURN json_build_object(
    'success', true,
    'balances_created', v_balances_created
  );
END;
$$ LANGUAGE plpgsql;
```

---

## Summary: What Needs Updating

| File | Lines | Change | Reason |
|------|-------|--------|--------|
| signup-with-invitation | 244-246 | Update filter for mandatory | Include mandatory types in new user signup |
| invitations/accept | 192 | Update filter for mandatory | Include mandatory types when user joins org |
| Database | - | Add `is_mandatory` column | Flag which types are required |
| Database | - | Add backfill function | Create retroactive balances for existing users |
| Admin API | - | Add balance creation endpoint | Manual backfill if needed |

