# Spec Requirements Document

> Spec: Multi-Organization Bug Fix
> Created: 2025-08-21
> Status: Planning

## Overview

Fix critical system-wide bug where 24 pages use hardcoded `.eq('is_default', true)` instead of respecting the active organization cookie, causing users to see data from the wrong workspace when switching between organizations. This bug breaks the entire multi-organization functionality across dashboard, admin, calendar, leave management, and team pages.

## User Stories

### Organization Admin Switching Context
As an organization admin who manages multiple workspaces, I want the application to show data from my currently selected organization, so that I can work with the correct team data and not accidentally view or modify information from the wrong workspace.

**Current Broken Flow:** Admin switches organization via workspace selector → Pages still show default organization data → Admin sees wrong employees, leave requests, holidays, etc.

**Expected Fixed Flow:** Admin switches organization via workspace selector → Active organization cookie is set → All pages respect the cookie and show correct organization data → Admin sees the right workspace data consistently.

### Multi-Workspace User Experience
As a user who belongs to multiple organizations, I want all application pages to consistently show data from my currently active workspace, so that I never accidentally see confidential information from other organizations or submit requests to the wrong workspace.

**Current Broken Flow:** User switches workspace → Some pages update correctly, others show default org data → Data inconsistency across the app

**Expected Fixed Flow:** User switches workspace → All pages uniformly respect active organization → Consistent data visibility across entire application

## Spec Scope

1. **Cookie-Based Organization Selection** - Replace all hardcoded `.eq('is_default', true)` queries with cookie-aware organization selection logic
2. **Standardized Organization Context** - Implement consistent organization context retrieval pattern across all 24 affected pages  
3. **Fallback Mechanism** - Ensure proper fallback to default organization when no active cookie is present
4. **Query Consistency** - Update all Supabase queries to use organization_id filtering based on active organization
5. **User Organization Validation** - Verify user has access to the requested organization before serving data

## Out of Scope

- Workspace switching UI modifications (UI already works correctly)
- Cookie setting mechanism (already implemented correctly)
- Organization creation or management features
- Performance optimizations beyond the bug fix
- Adding new multi-organization features

## Expected Deliverable

1. All 24 identified pages consistently respect the active organization cookie and show data only from the currently selected workspace
2. Users can switch between organizations and immediately see the correct data on all pages without refresh
3. Fallback to default organization works correctly when no active organization cookie is present
4. No data leakage between organizations - users only see data they have access to in the active workspace