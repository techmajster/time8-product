# Leave Balance System Investigation - Documentation Index

## Overview

This investigation explores how leave balances are initialized in the current system to understand implications for implementing mandatory absence types.

**Key Finding:** Balances are created on-demand during user onboarding, NOT retroactively for existing employees.

---

## Documents in This Investigation

### 1. LEAVE_BALANCE_SUMMARY.md
**Read this first** - Quick overview of the system

- 3 balance creation paths (signup, invitation accept, on-demand)
- Critical gaps for mandatory types
- What works today vs. what needs work
- Quick decision matrix

**Time to read:** 5 minutes

---

### 2. LEAVE_BALANCE_INVESTIGATION.md
**Read this for full context** - Comprehensive analysis

- Detailed explanation of each balance creation path
- What happens when new employees join
- Leave type management structure
- Multi-organization support details
- 4 critical problems identified
- Code architecture summary
- Default leave types configuration
- Recommended approach for migration

**Time to read:** 20 minutes

---

### 3. LEAVE_BALANCE_CODE_REFERENCES.md
**Read this for implementation** - Specific code locations and patterns

- Complete file structure overview
- Primary balance creation code with line numbers
- Default leave types definition
- Database schema references
- Special cases (e.g., "Urlop na żądanie")
- Exact changes needed for mandatory type support
- SQL migration templates

**Time to read:** 30 minutes

---

## The Three Balance Creation Paths

### Path 1: New User Signup with Invitation
**File:** `/app/api/auth/signup-with-invitation/route.ts`
**Lines:** 237-283

When a new user creates an account via invitation link:
- Creates balances for balance-required types
- Only current year
- Excludes child-specific types

### Path 2: Existing User Joins Organization via Invitation
**File:** `/app/api/invitations/accept/route.ts`
**Lines:** 178-221

When an existing user accepts an invitation to new organization:
- Same logic as Path 1
- Creates balances for balance-required types
- Only current year

### Path 3: On-Demand During Leave Request Processing
**File:** `/lib/leave-balance-utils.ts`
**Lines:** 52-75

As fallback if balance missing when processing leave request:
- Creates single balance if needed
- Intended as safety net ("should rarely happen")

---

## What's Missing for Mandatory Types

| Scenario | Status | Impact |
|----------|--------|--------|
| New employee joins | ✅ Works | Balances auto-created |
| Existing employee needs new mandatory type | ❌ Missing | No retroactive creation |
| Type becomes mandatory mid-year | ❌ Missing | Existing employees not covered |
| Year transition | ❌ Missing | Next year not pre-created |
| Bulk employee operations | ❌ Missing | No batch API |

---

## Reading Recommendation Based on Your Role

### I'm a Product Manager
1. Start: LEAVE_BALANCE_SUMMARY.md
2. Next: "Critical Gaps" section in LEAVE_BALANCE_INVESTIGATION.md
3. Takeaway: Understand backfill requirements before marking types as mandatory

### I'm a Backend Developer
1. Start: LEAVE_BALANCE_SUMMARY.md
2. Next: LEAVE_BALANCE_CODE_REFERENCES.md (entire document)
3. Follow: LEAVE_BALANCE_INVESTIGATION.md section "Recommended Approach"
4. Implement: Changes outlined in "To Add Mandatory Types Support"

### I'm a Database Administrator
1. Start: LEAVE_BALANCE_CODE_REFERENCES.md section "Database Schema References"
2. Next: "To Add Mandatory Types Support" section with SQL templates
3. Execute: Backfill function once schema updated

### I'm Planning the Migration
1. Read: LEAVE_BALANCE_INVESTIGATION.md section "Critical Findings"
2. Study: LEAVE_BALANCE_INVESTIGATION.md section "Recommended Approach"
3. Check: LEAVE_BALANCE_CODE_REFERENCES.md "Summary: What Needs Updating" table

---

## Key Files to Modify (Summary)

### Application Code
1. `/app/api/auth/signup-with-invitation/route.ts` - Lines 244-246
   - Update filter to include mandatory types
   - Change from `requires_balance &&` to `(requires_balance || is_mandatory) &&`

2. `/app/api/invitations/accept/route.ts` - Line 192
   - Same filter update as above

### Database
1. Add column to `leave_types` table:
   ```sql
   ALTER TABLE leave_types ADD COLUMN is_mandatory BOOLEAN DEFAULT false;
   ```

2. Create migration function `initialize_mandatory_type_balances()` - See LEAVE_BALANCE_CODE_REFERENCES.md

### Business Logic
1. Add audit checks to ensure mandatory types have balances
2. Add year-end automation to pre-create next year's balances
3. Document which types are mandatory for each organization

---

## Critical Decision Points

### Decision 1: Marking a Type as Mandatory
**Before marking `is_mandatory = true`:**
- ✅ New employees going forward: Automatically covered
- ❌ Existing employees: Must manually create balances
- ✅ Year transition: Can be pre-created

**Recommendation:** Run backfill function before marking as mandatory

### Decision 2: Implementing Year-End Automation
**Not currently implemented:**
- Next year's balances not pre-created automatically
- Balances only created when user joins organization

**Recommendation:** Add job to create balances on January 1st for all users

### Decision 3: Handling Mid-Year Type Changes
**Current behavior:**
- If type marked as mandatory mid-year, new joins get it
- Existing employees won't have balance

**Recommendation:** Always run initialization function when marking mandatory

---

## Testing Checklist for Implementation

- [ ] New user signup creates balances for mandatory types
- [ ] Existing user joining org gets balances for mandatory types
- [ ] Backfill function creates balances for existing users
- [ ] No duplicate balance creation if balance already exists
- [ ] Mandatory type with 0 days_per_year handled correctly
- [ ] Child-specific types still excluded from initialization
- [ ] Year filtering works correctly (current year)
- [ ] On-demand fallback still works as safety net
- [ ] Mandatory type filtering doesn't break other balance operations

---

## Next Steps

1. **Review** this index and the three documents
2. **Identify** which changes apply to your role
3. **Plan** the implementation using "Recommended Approach" from investigation
4. **Execute** in three phases: Preparation → Activation → Ongoing
5. **Test** using the checklist above

---

## Questions Answered by These Documents

- How are leave balances created today? ✓ All docs
- What happens when new employees join? ✓ INVESTIGATION doc
- Where is balance creation logic? ✓ CODE_REFERENCES doc
- What's missing for mandatory types? ✓ SUMMARY and INVESTIGATION docs
- How do I implement mandatory types? ✓ CODE_REFERENCES doc
- What happens to existing employees? ✓ All docs
- When are balances created for future years? ✓ INVESTIGATION doc
- How does the on-demand fallback work? ✓ INVESTIGATION doc

---

## Document Versions

- Investigation Date: October 23, 2025
- Codebase Version: As of latest commit
- Scope: Leave balance initialization system only
- Status: Complete analysis with implementation recommendations

---

## Contact & Support

For questions about this investigation:
- Check the relevant document section using the index above
- Cross-reference code locations in CODE_REFERENCES doc
- Verify current implementation matches documented behavior

