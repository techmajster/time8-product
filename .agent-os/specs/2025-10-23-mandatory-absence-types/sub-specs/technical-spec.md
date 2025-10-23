# Technical Specification

This is the technical specification for the spec detailed in [.agent-os/specs/2025-10-23-mandatory-absence-types/spec.md](../.agent-os/specs/2025-10-23-mandatory-absence-types/spec.md)

## Technical Requirements

### 1. Database Schema Updates

#### Add `is_mandatory` Column to `leave_types`

- Add boolean column `is_mandatory` with default `false`
- Create index on `is_mandatory` for query performance
- Add check constraint to ensure mandatory types cannot be deleted via cascade

#### Add Balance Override Support

- Ensure `leave_balances` table can store per-user overrides
- Current `entitled_days` column already supports this - no schema change needed
- Document that `entitled_days` in `leave_balances` takes precedence over `days_per_year` in `leave_types`

### 2. Mandatory Type Identification

The two mandatory leave types are identified by their `leave_category`:

1. **Urlop wypoczynkowy** - `leave_category = 'annual'` AND `name LIKE '%wypoczynkowy%'`
2. **Urlop bezpłatny** - `leave_category = 'unpaid'` AND `name LIKE '%bezpłatny%'`

Use these criteria to mark existing types as mandatory in the migration.

### 3. API Endpoint Updates

#### DELETE `/api/leave-types/[id]`

- Add validation to check `is_mandatory` flag before deletion
- Return 403 Forbidden with message: "Cannot delete mandatory leave type. This type is required by Polish labor law."
- Log deletion attempts of mandatory types for audit purposes

#### PUT `/api/leave-types/[id]`

- Allow editing `days_per_year` (workspace default) for mandatory types
- Prevent changing `is_mandatory` flag (only migrations can set this)
- Prevent changing `leave_category` for mandatory types
- Allow editing color, name (with warning), and other non-critical fields

#### GET `/api/leave-balances`

- Update query logic to prioritize `leave_balances.entitled_days` over `leave_types.days_per_year`
- Return both workspace default and individual override in response for admin views

#### PUT `/api/employees/[id]`

- Add ability to set custom `entitled_days` for Urlop wypoczynkowy in employee edit form
- Validate that custom days are reasonable (e.g., 0-50 range)

### 4. UI/UX Requirements

#### Admin Settings - Leave Types Management

- Display lock icon next to mandatory leave types
- Show tooltip on hover: "This leave type cannot be deleted as it's required by Polish labor law"
- Disable delete button for mandatory types (visual indication only - API still validates)
- Show badge with text "Mandatory" or "Required" next to type name
- Allow editing workspace default days via inline edit or modal
- Show current workspace default prominently

#### Employee Edit Page

- Add section for "Leave Balance Overrides"
- For Urlop wypoczynkowy, show:
  - Workspace default: X days
  - Custom balance for this employee: [editable number input] days
  - Checkbox or toggle: "Use custom balance"
- Display current entitled days prominently
- Show validation error if custom days are out of range

#### Employee Dashboard / Leave Request Page

- Display accurate balance using override if present, otherwise workspace default
- For Urlop bezpłatny, show messaging: "Unlimited (subject to approval)" or similar
- Show balance source (workspace default vs. custom override) in tooltip or small text

### 5. Balance Calculation Logic

#### Current Behavior (No Changes Needed)

The system already follows this hierarchy:
1. Check if `leave_balances` record exists for user + leave_type + year
2. If exists, use `leave_balances.entitled_days` (this is the override)
3. If not exists, use `leave_types.days_per_year` (this is the workspace default)

#### Required Updates

- Ensure all balance queries follow this hierarchy consistently
- Update `/lib/leave-balance-utils.ts` if needed to document this behavior
- Add tests to verify override behavior

### 6. Unlimited Leave Handling for Urlop bezpłatny

- `leave_types.days_per_year` should be `0` for Urlop bezpłatny
- `leave_types.requires_balance` should be `false`
- Leave request validation should skip balance check for this type
- Allow any number of days to be requested (subject to approval)
- Balance display should show "Unlimited" or "Not applicable" instead of numbers

### 7. Data Migration Strategy

#### For Existing Workspaces

1. Identify all existing leave types matching mandatory criteria
2. Update `is_mandatory = true` for matching types
3. Ensure all workspaces have at least one Urlop wypoczynkowy and one Urlop bezpłatny
4. If missing, create them with workspace defaults

#### For New Workspaces

- The existing organization creation logic in `/app/api/organizations/route.ts` already creates these types
- Update to set `is_mandatory = true` during creation

### 8. Validation Rules

#### Leave Type Deletion

```typescript
if (leaveType.is_mandatory) {
  throw new Error('Cannot delete mandatory leave type')
}
```

#### Leave Type Editing

```typescript
// Allow editing these fields for mandatory types:
const editableFields = ['days_per_year', 'color', 'name']

// Prevent editing these fields for mandatory types:
const protectedFields = ['is_mandatory', 'leave_category', 'requires_balance', 'requires_approval']
```

#### Balance Override Validation

```typescript
if (customBalance < 0 || customBalance > 50) {
  throw new Error('Custom balance must be between 0 and 50 days')
}
```

### 9. Testing Requirements

#### Unit Tests

- Test deletion prevention for mandatory types
- Test editing workspace defaults for mandatory types
- Test balance calculation with and without overrides
- Test unlimited leave handling for Urlop bezpłatny

#### Integration Tests

- Test full employee balance override workflow
- Test leave request validation with custom balances
- Test migration idempotency (can run multiple times safely)

#### Manual Testing Checklist

1. Verify mandatory types display with lock icons in Admin Settings
2. Attempt to delete mandatory type - should show error
3. Edit workspace default for Urlop wypoczynkowy - should save successfully
4. Edit individual employee balance - should override workspace default
5. Create leave request with custom balance - should validate correctly
6. Create leave request for Urlop bezpłatny - should allow unlimited days
7. Verify balance display on dashboard shows correct values

## Performance Considerations

- Index on `is_mandatory` column for fast filtering
- No additional queries needed - override logic uses existing `leave_balances` table
- Balance calculations remain O(1) with proper indexing

## Accessibility Requirements

- Lock icons must have appropriate aria-labels
- Error messages must be screen-reader friendly
- Form validation must provide clear feedback
- Keyboard navigation must work for all interactive elements

## Error Handling

- API returns appropriate HTTP status codes (403 for forbidden, 400 for validation errors)
- User-friendly error messages in UI
- Console logs for debugging (not shown to users)
- Graceful degradation if balance data is missing
