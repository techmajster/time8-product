# Spec Requirements Document

> Spec: Multi-Workspace Isolation Audit & Fix
> Created: 2025-10-23
> Status: Planning

## Overview

Conduct a comprehensive security audit of all API routes to ensure proper workspace isolation for multi-organization admins. Fix data leakage vulnerabilities where routes query data without respecting the `active-organization-id` cookie, preventing unauthorized cross-workspace data access.

## User Stories

### Admin Switching Between Workspaces

As a multi-organization admin, I want my data queries to automatically filter by my currently active workspace, so that I never accidentally see or modify data from a different organization when I switch workspaces.

**Detailed Workflow:**
1. Admin logs into the application and has access to multiple organizations
2. Admin selects Organization A from the workspace switcher
3. All API calls (employees, leave requests, teams, calendar, settings) return only Organization A data
4. Admin switches to Organization B using the workspace switcher
5. All subsequent API calls now return only Organization B data
6. No data from Organization A is visible or accessible while in Organization B context

### Preventing Data Leakage in API Routes

As a platform developer, I want all organization-scoped API routes to consistently read and validate the `active-organization-id` cookie, so that data isolation is enforced at the API layer and cannot be bypassed by client-side manipulation.

**Detailed Workflow:**
1. Developer creates a new API route that queries organization-scoped data
2. Route reads `active-organization-id` from cookies using standardized helper
3. Route validates user has access to the organization from the cookie
4. All database queries include `organization_id` filter using the validated ID
5. If cookie is missing or user lacks access, route returns 401/403 error
6. Integration tests verify multi-workspace isolation for the route

### Testing Multi-Workspace Scenarios

As a QA engineer, I want comprehensive integration tests for multi-workspace admin scenarios, so that I can verify workspace isolation is properly enforced across all critical API endpoints.

**Detailed Workflow:**
1. Test creates two organizations with different data
2. Test creates an admin user with access to both organizations
3. Test simulates switching between workspaces by changing the cookie
4. Test verifies each API endpoint returns only data for the active workspace
5. Test attempts to access data from workspace A while cookie is set to workspace B
6. Test confirms unauthorized access is properly rejected

## Spec Scope

1. **API Route Audit** - Systematically review all 30+ routes that reference `organization_id` to identify isolation vulnerabilities
2. **Cookie Standardization** - Create and enforce a standard pattern for reading `active-organization-id` cookie in all organization-scoped routes
3. **Critical Route Fixes** - Fix identified vulnerabilities in employees, teams, leave requests, calendar, billing, and admin settings endpoints
4. **Integration Test Suite** - Add comprehensive tests for multi-workspace admin scenarios covering all critical endpoints
5. **Developer Documentation** - Document standard cookie usage pattern for future API development to prevent regression

## Out of Scope

- Changing the overall authentication or authorization system
- Refactoring the database schema or RLS policies
- Implementing new multi-workspace features beyond fixing isolation bugs
- UI changes to the workspace switcher component

## Expected Deliverable

1. All organization-scoped API routes consistently respect `active-organization-id` cookie and return only data for the active workspace
2. Integration tests pass for multi-workspace admin scenarios, verifying no data leakage between workspaces
3. Developer documentation exists for the standard cookie usage pattern to guide future API development
