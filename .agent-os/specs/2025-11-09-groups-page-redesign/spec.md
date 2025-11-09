# Spec Requirements Document

> Spec: Groups Page Redesign
> Created: 2025-11-09
> Status: Planning
> Phase: 2.19

## Overview

Redesign the admin groups page to match new Figma designs with improved UX, proper state management, manager visibility in table, and cleaner sheet-based workflows. This spec addresses critical UX issues including page reloads, missing manager visibility, N+1 query performance problems, and incomplete group details views.

## User Stories

### Admin Managing Teams

As an admin, I want to see which manager is assigned to each group directly in the main table, so that I can quickly understand team leadership structure without opening each group individually.

**Workflow:**
1. Admin navigates to /admin/groups
2. Main table displays all groups with columns: Nazwa, Opis, Kierownik grupy, Liczba pracowników, Akcje
3. Manager column shows avatar + name for quick visual reference
4. Groups without managers show "—" placeholder
5. Admin can click any row to view full group details

### Viewing Group Details

As an admin, I want to click on a group row to see complete details including all members with their roles, so that I understand the full composition of each team.

**Workflow:**
1. Admin clicks on any group row in the table
2. "Szczegóły grupy" sheet opens on the right side
3. Sheet displays:
   - Group name (large heading)
   - Description (or "brak" if empty)
   - Manager section with avatar and contact info (or "brak")
   - Full list of all team members with avatars, names, and role badges
4. Footer provides actions: "Zarządzaj członkami" and "Edytuj"
5. Sheet closes without triggering page reload

### Managing Groups Without Interruption

As an admin, I want all group operations (create, edit, delete, manage members) to work seamlessly without page reloads, so that I can manage multiple groups efficiently in a single session.

**Workflow:**
1. Admin creates a new group → table updates immediately
2. Admin edits group details → changes reflect instantly
3. Admin adds/removes members → counts update in real-time
4. Admin deletes a group → table refreshes without full page reload
5. All changes persist and UI stays responsive throughout

## Spec Scope

1. **Add Manager Column to Main Table** - Insert "Kierownik grupy" column between "Opis" and "Liczba pracowników" displaying manager avatar, name, and email with null handling

2. **Fix N+1 Query Performance** - Replace individual member count queries with single JOIN query to eliminate 90+ database calls per page load

3. **Update Group Details Sheet** - Fetch and display full member list with avatars and role badges, following exact Figma layout with four sections

4. **Replace Page Reloads with Event System** - Remove all `window.location.reload()` calls and implement `refetchTeamManagement()` event-driven updates across all CRUD operations

5. **Update Delete Confirmation Dialog** - Match Figma copy exactly with new title, description, and button labels

6. **Polish Edit and Create Sheets** - Update button text to match Figma ("Zapisz grupę" instead of "Zaktualizuj grupę") and ensure refetch integration

## Out of Scope

- Changing database schema or adding new tables
- Implementing new permissions or role-based access control
- Adding bulk operations (multi-select, batch delete)
- Implementing drag-and-drop for member management
- Adding group color or icon customization
- Creating group templates or presets
- Implementing group analytics or reporting
- Adding email notifications for group changes

## Expected Deliverable

1. **Main Table Enhancement** - Manager column visible with avatar + name, null managers show "—", N+1 query eliminated with <100ms page load

2. **Group Details Sheet** - Clicking any row opens details sheet showing complete member list with role badges, all data loads without refresh

3. **Zero Page Reloads** - All operations (create, edit, delete, manage members) trigger event-driven refetch, no `window.location.reload()` anywhere

4. **Figma-Perfect UI** - All sheets and dialogs match provided Figma designs pixel-perfect including spacing, typography, and button labels

5. **Delete Dialog Update** - Confirmation shows "Czy na pewno chcesz usunąć tę grupę?" with "Usuń" and "Zamknij" buttons per Figma

## Figma Design References

### 1. Main Groups Page
**URL:** https://www.figma.com/design/Xb0VKGqH8b7w6nXW3HoacI/time8.io?node-id=26146-82491

**Key Elements:**
- Table with columns: Nazwa, Opis, Kierownik grupy, Liczba pracowników, Akcje
- Manager column shows avatar circle + name + email
- Row hover state with background change
- "Dodaj grupę" button in top-right corner
- Three-dot menu in Akcje column

### 2. Add New Group Sheet
**URL:** https://www.figma.com/design/Xb0VKGqH8b7w6nXW3HoacI/time8.io?node-id=26172-207152

**Key Elements:**
- Sheet title: "Dodaj nową grupę"
- Three input fields:
  - Nazwa grupy (text input, placeholder: "Nowa grupa")
  - Kierownik grupy (dropdown, label: "Opcjonalny")
  - Opis (textarea, placeholder: "Wpisz")
- Footer buttons: "Anuluj" (outline) + "Dodaj grupę" (primary)

### 3. Group Details Sheet (Manager Only View)
**URL:** https://www.figma.com/design/Xb0VKGqH8b7w6nXW3HoacI/time8.io?node-id=26172-207261

**Key Elements:**
- Sheet title: "Szczegóły grupy"
- Section 1: Nazwa grupy (text "UX" in large font)
- Section 2: Opis (Lorem ipsum paragraph)
- Section 3: Członkowie gupy with single member showing "Kierownik" badge
- Footer: "Usuń grupę" (destructive left) + "Zarządzaj członkami" + "Edytuj" (right)

### 4. Group Details Sheet (Full Member List)
**URL:** https://www.figma.com/design/Xb0VKGqH8b7w6nXW3HoacI/time8.io?node-id=26166-242492

**Key Elements:**
- Same structure as #3 but with multiple members
- Manager shows "Kierownik" purple badge
- Regular members show "Pracownik" gray badge
- Each member has avatar + name + email
- Scrollable member list

### 5. Manage Members Sheet
**URL:** https://www.figma.com/design/Xb0VKGqH8b7w6nXW3HoacI/time8.io?node-id=26204-223904

**Key Elements:**
- Sheet title: "Zarządzanie członkami"
- Top section: "Członkowie grupy UX" with current members
- Each member has minus button on right for removal
- Bottom section: "Dostępni" with available users to add
- Each available user has plus button on right
- Footer: "Anuluj" + "Zapisz zmiany"

### 6. Edit Group Sheet
**URL:** https://www.figma.com/design/Xb0VKGqH8b7w6nXW3HoacI/time8.io?node-id=26172-175284

**Key Elements:**
- Sheet title: "Edytuj grupę"
- Pre-filled inputs: Nazwa grupy, Kierownik grupy (dropdown), Opis
- Footer: "Usuń grupę" (destructive left) + "Anuluj" + "Zapisz grupę" (right)
- Note: Button says "Zapisz grupę" not "Zaktualizuj grupę"

### 7. Delete Confirmation Dialog
**URL:** https://www.figma.com/design/Xb0VKGqH8b7w6nXW3HoacI/time8.io?node-id=26166-242325

**Key Elements:**
- Dialog title: "Czy na pewno chcesz usunąć tę grupę?"
- Description: "Użytkownicy z tej grupy nie będą przypisani do żadnej grupy"
- Buttons: "Usuń" (destructive red) + "Zamknij" (outline)
- Clean, simple layout with no member count mentioned

## Cross-References

- **Roadmap:** @.agent-os/product/roadmap.md (Phase 2.19)
- **Tech Stack:** @.agent-os/product/tech-stack.md
- **Dependencies:** Phase 2.13 (Auto-Refresh Standardization)
- **Shared Components:** Phase 2.17 (Team Management Redesign)
