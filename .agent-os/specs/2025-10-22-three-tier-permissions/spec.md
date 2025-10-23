# Spec Requirements Document

> Spec: Three-Tier Permission System
> Created: 2025-10-22
> Status: Planning

## Overview

Implement a flexible three-tier permission system (Normal User, Manager, Admin) with role-based access control that enforces READ-ONLY access for managers on Team/Groups pages while maintaining full CRUD capabilities for admins.

## User Stories

### As a Normal User (Pracownik)
As a normal user, I want to access my dashboard, calendar, profile, and leave requests, so that I can manage my own absences without accessing sensitive team management features.

**Workflow:** Normal users log in and see a simplified navigation menu showing only: Dashboard, Calendar, My Profile, My Leave, and optionally other groups' absences (if the admin enables the visibility setting). They cannot access Team or Groups pages.

### As a Manager (Kierownik)
As a manager, I want to view team members and groups in READ-ONLY mode while managing leave requests, so that I can approve/reject leave without accidentally modifying team structure.

**Workflow:** Managers see all normal user pages plus Team and Groups pages (READ-ONLY). On Team and Groups pages, they can view all information but cannot see Add/Edit/Delete buttons. They have full access to leave request management and can create leave requests on behalf of their team members.

### As an Admin
As an admin, I want full CRUD access to all pages and settings, so that I can configure the workspace, manage users, groups, and leave types.

**Workflow:** Admins see the complete navigation menu with full CRUD operations on all pages: users, groups, leave requests, absence types, and workspace settings.

## Spec Scope

1. **Database Schema Updates** - Add `role` column to `users` table with enum values: `normal_user`, `manager`, `admin`
2. **Role Assignment Logic** - Implement role assignment during user invitation and profile management
3. **UI Navigation Filtering** - Dynamically filter navigation menu items based on user role
4. **Route Protection** - Add middleware/guards to protect routes from unauthorized access
5. **Component-Level Permissions** - Hide action buttons (Add/Edit/Delete) for managers on Team/Groups pages

## Out of Scope

- Custom permission configurations beyond the three predefined roles
- Granular per-feature permission toggles
- Multi-role assignments (users have exactly one role)
- Permission inheritance or role hierarchies beyond the three tiers
- Permission audit logging (reserved for Phase 7)

## Expected Deliverable

1. Users can be assigned one of three roles (normal_user, manager, admin) via the edit employee page
2. Navigation menu dynamically shows/hides items based on the current user's role
3. Managers can view Team and Groups pages but cannot perform CRUD operations (buttons hidden)
4. Protected routes redirect unauthorized users to appropriate pages
5. All role-based restrictions work correctly across the application without breaking existing functionality

