# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-11-08-fix-approver-assignment-table-update/spec.md

## Technical Requirements

### 1. API Endpoint Modification

**File:** `app/api/employees/[id]/route.ts`

**Changes Required:**

1. Add `approver_id` to request body destructuring (line ~148)
2. Add `approver_id` to `user_organizations` update logic (lines ~169-185)
3. Add validation before database update (after line ~143):
   - Require `approver_id` to be set (not NULL or empty string)
   - Validate manager cannot be their own approver
   - Allow admin to be their own approver

**Validation Logic:**
```typescript
// Require approver_id
if (approver_id === null || approver_id === '') {
  return NextResponse.json({
    error: 'Osoba akceptująca urlop jest wymagana'
  }, { status: 400 })
}

// Manager cannot self-approve
if (approver_id === id && employeeRole === 'manager') {
  return NextResponse.json({
    error: 'Manager nie może być swoim własnym akceptującym'
  }, { status: 400 })
}

// Note: Admin CAN be their own approver (auto-approved)
```

### 2. Table Component Updates

**File:** `app/admin/team-management/components/TeamManagementClient.tsx`

**Changes Required:**

1. **Add helper function** (after line ~240):
```typescript
const getApproverName = (member: TeamMember): string => {
  if (!member.approver_id) return 'Brak akceptującego'

  const approver = approvers.find(a => a.id === member.approver_id)
  return approver?.full_name || approver?.email || 'Brak akceptującego'
}
```

2. **Remove helper function** (lines 241-248):
   - Delete `getManagerName()` function (no longer needed)

3. **Update TableHeader** (lines ~383-391):
   - Remove `<TableHead>` for "Pozostały urlop"
   - Remove `<TableHead>` for "Urlop NŻ"
   - Change "Manager" to "Akceptujący"
   - Add `<TableHead>` for "Status" with `text-center` class
   - Change colSpan from 6 to 5 in empty state row

4. **Update TableRow cells** (lines ~415-453):
   - Keep "Grupa" cell (team name)
   - Replace manager cell with approver cell using `getApproverName(member)`
   - Remove vacation days cell
   - Remove on-demand leave cell
   - Add status badge cell with green "Aktywny" badge

**Status Badge Implementation:**
```typescript
<TableCell className="text-center">
  <div className="bg-green-600 border border-transparent rounded-md px-2 py-0.5 inline-flex items-center justify-center w-fit mx-auto">
    <span className="text-xs font-semibold text-white">Aktywny</span>
  </div>
</TableCell>
```

### 3. Frontend Validation

**File:** `app/admin/team-management/components/EditEmployeeSheet.tsx`

**Changes Required:**

1. **Add validation before API submission** (after line ~155):
```typescript
// Require approver
if (!formData.approver_id) {
  toast.error('Osoba akceptująca urlop jest wymagana')
  return
}

// Manager cannot self-approve
if (formData.approver_id === employee.id && formData.role === 'manager') {
  toast.error('Manager nie może być swoim własnym akceptującym')
  return
}
```

2. **Add required indicator to label** (line ~352):
```typescript
<Label className="text-sm font-medium">
  Osoba akceptująca urlop <span className="text-destructive">*</span>
</Label>
```

3. **Make Select required** (line 353):
```typescript
<Select
  value={formData.approver_id}
  onValueChange={(value) => setFormData(prev => ({ ...prev, approver_id: value }))}
  required
>
```

### 4. Performance Optimization

**File:** `app/admin/team-management/page.tsx`

**Changes Required:**

Replace individual team manager queries (lines ~143-172) with batch queries:

```typescript
// Get all unique manager IDs
const managerIds = teams
  ?.filter(team => team.manager_id)
  .map(team => team.manager_id)
  .filter((id, index, arr) => arr.indexOf(id) === index) // Dedupe
  || []

// Batch query all managers
let managerProfiles: Record<string, any> = {}
if (managerIds.length > 0) {
  const { data: managers } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, email')
    .in('id', managerIds)

  if (managers) {
    managerProfiles = managers.reduce((acc, manager) => {
      acc[manager.id] = manager
      return acc
    }, {} as Record<string, any>)
  }
}

// Batch query member counts
const { data: teamMemberCounts } = await supabaseAdmin
  .from('user_organizations')
  .select('team_id')
  .eq('organization_id', profile.organization_id)
  .eq('is_active', true)
  .not('team_id', 'is', null)

const memberCountsByTeam = teamMemberCounts?.reduce((acc, row) => {
  acc[row.team_id] = (acc[row.team_id] || 0) + 1
  return acc
}, {} as Record<string, number>) || {}

// Build teamsWithDetails using cached data
const teamsWithDetails = teams?.map((team) => ({
  ...team,
  manager: team.manager_id ? managerProfiles[team.manager_id] : null,
  members: [],
  member_count: memberCountsByTeam[team.id] || 0
})) || []
```

**Performance Impact:**
- Before: 1 + (N * 2) queries (1 for teams, N for managers, N for counts)
- After: 3 queries total (teams, managers batch, counts batch)
- For 20 teams: 41 queries → 3 queries (93% reduction)

## Edge Cases

### 1. Legacy Data (NULL approver_id)
**Scenario:** Employee record exists with `approver_id = NULL`

**Handling:**
- Display: Show "Brak akceptującego" in table
- Edit: Validation requires setting an approver before saving
- Existing NULL values: Not retroactively changed (only enforced on new saves)

### 2. Deleted Approver
**Scenario:** Employee's approver is archived or deleted

**Handling:**
- Database: Foreign key has `ON DELETE SET NULL` (sets approver_id to NULL)
- Display: Show "Brak akceptującego" in table
- Edit: Admin must assign a new approver

### 3. Team Change
**Scenario:** Admin changes employee's team assignment

**Handling:**
- Keep existing `approver_id` unchanged (don't auto-update)
- Rationale: Approver assignment is independent of team membership
- Admin can manually change approver if needed

### 4. Self-Approval Rules
**Scenario:** User trying to approve their own leave

**Handling:**
- Admin: CAN be their own approver (auto-approved workflow)
- Manager: CANNOT be their own approver (validation prevents)
- Employee: CANNOT be their own approver (validation prevents)

### 5. Approver Not in Dropdown
**Scenario:** Employee's assigned approver is no longer a manager/admin

**Handling:**
- Display: Show approver name even if role changed
- Edit: Cannot re-select that person (dropdown only shows current managers/admins)
- Must assign a new approver from available list

## Database Schema

### Existing Schema (No Changes Required)

**Table:** `user_organizations`
```sql
approver_id UUID REFERENCES profiles(id) ON DELETE SET NULL
```

**Index:** `idx_user_organizations_approver_id`

**Migration:** Already applied via `20251108000000_add_approver_id_to_user_organizations.sql`

## Testing Requirements

### Unit Tests
- Validation logic for approver_id requirement
- Validation logic for manager self-approval prevention
- Admin self-approval allowed
- Helper function `getApproverName()` returns correct values

### Integration Tests
- API endpoint saves approver_id to database
- API endpoint rejects NULL approver_id
- API endpoint rejects manager self-approval
- API endpoint allows admin self-approval
- Table displays approver name correctly
- Status column displays "Aktywny" badge

### Performance Tests
- Measure query count for team data loading
- Verify reduction from ~41 to 3 queries (for 20 teams)
- Page load time under 1 second with 20+ teams

### Manual Tests
- Edit employee → Set approver → Save → Refresh → Verify persisted
- Edit employee → Clear approver → Try to save → See validation error
- Edit manager → Set self as approver → Try to save → See validation error
- Edit admin → Set self as approver → Save → Verify allowed
- View table → Verify "Akceptujący" column shows correct approver
- View table → Verify "Status" column shows green "Aktywny" badge
- View table → Verify leave balance columns removed

## Files Modified

1. `app/api/employees/[id]/route.ts` - API endpoint fix + validation
2. `app/admin/team-management/components/TeamManagementClient.tsx` - Table UI updates
3. `app/admin/team-management/components/EditEmployeeSheet.tsx` - Frontend validation
4. `app/admin/team-management/page.tsx` - Performance optimization

## Files Not Modified

- `app/api/team-management/route.ts` - Code deduplication deferred (no breaking changes)
- Database migrations - No new migrations needed (schema already exists)
- `user_organizations` table - Structure unchanged
