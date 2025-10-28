# Project Reorganization Log

**Date:** 2025-10-28
**Purpose:** Clean up root directory and improve project structure

## Changes Made

### 1. New Directory Structure Created

- `docs/` - Centralized documentation
- `scripts/archive/` - Historical company-specific scripts
- `__tests__/billing/` - Billing-related test scripts
- `__tests__/integration-old/` - Archived integration tests

### 2. Documentation Moved (Root → docs/)

**Analysis & Investigation Files:**
- APPLICATION_STRUCTURE_ANALYSIS.md
- DEBUG_BILLING.md
- INTEGRATION_TEST_RESULTS.md
- INVITATION_SYSTEM_ANALYSIS.md
- INVITATION_TESTING_REPORT.md
- MIGRATION_INSTRUCTIONS.md
- STRUCTURE_QUICK_REFERENCE.md
- WORKSPACE_OWNER_BALANCE_MIGRATION.md
- explain-calendar-restriction.md
- lemonsqueezy_api_docs.md

**Leave Balance Investigation Files:**
- LEAVE_BALANCE_CODE_REFERENCES.md
- LEAVE_BALANCE_INDEX.md
- LEAVE_BALANCE_INVESTIGATION.md
- LEAVE_BALANCE_SUMMARY.md

**Total:** 14 documentation files

### 3. Utility Scripts Moved (Root → scripts/)

- delete-existing-invitation.mjs
- get-admin-user-id.mjs
- verify-groups.mjs

### 4. Test Scripts Reorganized

**Root → __tests__/billing/:**
- test-billing-api.js
- test-billing-api-full.js
- test-billing-response.js
- test-checkout-organization-context.js

**Root → __tests__/:**
- test-webhook.js
- test-webhook-endpoint.js
- test-currency-handling.js
- test-currency-ui.js
- verify-currency-config.js
- test-resend.js
- debug-members.js
- debug-cursor.html

**Total:** 12 test files

### 5. Company-Specific Scripts Archived (Root → scripts/archive/)

**BB8 & Kontury Test Scripts:**
- check-bb8-data.js
- create-bb8-records.js
- update-bb8-seats.js
- fix-test-bb8.js
- create-kontury-records.js
- check-both-subscriptions.js
- update-both-subscriptions.js
- find-real-subscription.js
- get-subscription-details.js

**SQL Scripts:**
- fix-kontury-subscription.sql
- fix_szymon_balances.sql

**Integration Tests → __tests__/integration-old/:**
- fix-szymon-default-org.mjs
- check-szymon-role.mjs

**Additional Scripts:**
- scripts/fix-szymon-balances.js

**Total:** 14 company-specific files

## Files Remaining in Root

**Configuration Files:**
- CLAUDE.md
- README.md
- package.json
- tsconfig.json
- next.config.ts
- tailwind.config.ts
- eslint.config.mjs
- jest.config.js
- jest.setup.js
- postcss.config.mjs

**Application Files:**
- middleware.ts
- i18n.ts
- next-env.d.ts

**Build Files:**
- components.json

## Summary

- **Files Moved:** 40+ files
- **Root Directory Cleanup:** ~70% reduction in clutter
- **No Broken Imports:** Verified no code references to moved files
- **Project Structure:** Significantly improved navigation

## Next Steps

1. Consider deleting duplicate/empty files (see redundancy report)
2. Archive or delete `__old/` directory (10 deprecated docs)
3. Commit untracked migration files
4. Add `.DS_Store` and `tsconfig.tsbuildinfo` to .gitignore
