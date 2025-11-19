# Spec Requirements Document

> Spec: Admin Settings Figma Redesign
> Created: 2025-01-15
> Status: Planning

## Overview

Redesign the admin settings page to align with Figma designs, reducing from 8 tabs to 4 tabs, removing deprecated features, and updating the UI to match the new design system while preserving all backend functionality and existing data.

## User Stories

### Admin Configuration Simplification

As an organization administrator, I want a streamlined settings interface with only essential tabs, so that I can configure my workspace more efficiently without being overwhelmed by options.

**Workflow:**
1. Admin navigates to `/admin/settings`
2. Sees 4 clear tabs: Ogólne, Tryb pracy, Urlopy, Rozliczenia
3. Each tab shows only relevant, frequently-used settings
4. UI matches modern Figma design with improved visual hierarchy
5. Deprecated features are removed from UI but preserved in backend for future use

### Visual Work Mode Configuration

As an organization administrator, I want to see a visual representation of working days and hours, so that I can quickly understand the current work schedule configuration at a glance.

**Workflow:**
1. Admin opens Tryb pracy tab
2. Sees interactive checkbox grid showing Mon-Fri as working days (purple) and Sat-Sun as non-working (gray)
3. Sees work hours displayed as "Od 9:00 do 17:00" with dropdown selectors
4. Visual indicators (checkmarks, X icons, colors) make status immediately clear
5. Note: Actual functionality to change these settings will be implemented in phase 2

### Simplified Leave Types Management

As an organization administrator, I want to manage leave types in a single, focused table view, so that I can quickly see all leave types without navigating nested tabs.

**Workflow:**
1. Admin opens Urlopy tab
2. Sees comprehensive table of all leave types
3. Lock icons clearly indicate which types are mandatory
4. Can create, edit, and delete leave types from single interface
5. All existing leave type data is preserved during the redesign

## Spec Scope

1. **Tab Reduction** - Remove 4 tabs (Calendar Visibility, Workspace, Notifications, Additional Rules) from the settings interface, keeping only Ogólne, Tryb pracy, Urlopy, and Rozliczenia
2. **Ogólne Tab Redesign** - Update UI to match Figma design, remove logo upload, slug, and Google Workspace fields while keeping workspace name, administrator, holiday calendar, and language settings
3. **Tryb pracy Tab Implementation** - Create visual-only working days grid and work hours selectors matching Figma design (purple for active, gray for inactive states)
4. **Urlopy Tab Simplification** - Remove nested tabs, show only leave types table, update UI with lock icons and improved badges to match Figma
5. **Database Cleanup** - Remove deprecated columns (slug, google_domain, require_google_domain, logo_url) via migration while preserving all leave type data
6. **API Updates** - Modify organization settings endpoint to reject removed fields and update validation rules

## Out of Scope

- Backend functionality for work hours (time selectors will be visual-only)
- Implementing actual work schedule logic
- Re-implementing removed features (Calendar Visibility, Workspace deletion, etc.)
- Changes to Billing/Rozliczenia tab (remains unchanged)
- Leave policy management (Polityki urlopowe content - removed for now)
- Migration of existing organization data (logo URLs, slugs) to new storage

## Expected Deliverable

1. Admin settings page displays exactly 4 tabs matching Figma designs
2. Ogólne tab shows simplified settings without deprecated fields
3. Tryb pracy tab displays visual working days grid (Mon-Fri purple, Sat-Sun gray) and work hours section
4. Urlopy tab shows single leave types table without nested tabs
5. Database migration successfully removes deprecated columns without data loss
6. All existing leave types remain functional and accessible
7. API endpoints reject deprecated fields with appropriate error messages
8. All tests pass including updated component tests
