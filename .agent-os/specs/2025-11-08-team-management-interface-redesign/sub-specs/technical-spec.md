# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-11-08-team-management-interface-redesign/spec.md

## Technical Requirements

### 1. Tab Navigation System

- **Component:** Use existing Tabs components from UI library or create custom
- **State Management:** React useState for active tab ('aktywni' | 'zaproszeni' | 'zarchiwizowani')
- **Default Tab:** 'aktywni'
- **Tab Styling:** Active tab highlighted per Figma design
- **URL Sync:** Optional - consider syncing active tab with URL query parameter for deep linking
- **Tab Content:** Conditional rendering based on active tab state

### 2. Edit Employee Sheet Component

**Component Structure:**
- **Base:** `<Sheet>` with `size="content"` (560px width)
- **Header:** SheetTitle "Szczegóły użytkownika"
- **Content:** Scrollable form sections with separators
- **Footer:** Fixed buttons - "Anuluj" (outline) + "Zapisz zmiany" (primary)

**Form Sections:**

**Section 1 - Dane użytkownika:**
- Status Badge component (green background #16a34a, white text)
- Input: Nazwa wyświetlana (text)
- Input: Adres email (email)
- DatePickerWithDropdowns: Data urodzenia
- Select: Rola (employee/manager/admin)
- Select: Grupa (team dropdown)

**Section 2 - Dostępny urlop rocznie:**
- Table component with 3 columns:
  - Column 1: Rodzaj urlopu (leave type name)
  - Column 2: Liczba dni na start (number input)
  - Column 3: Akcje ("Domyślne" button with RefreshCcw icon)
- Show only leave types with `requires_balance = true`
- Remove "Wykorzystanych" (used days) column

**Section 3 - Osoba akceptująca urlop:**
- Select dropdown with manager/admin list
- Nullable field
- Filter: `role IN ('manager', 'admin')`

**State Management:**
- Form state with React useState
- Load existing employee data on open
- Handle form submission with PUT to `/api/employees/[id]`
- Close sheet on successful save
- Trigger data refresh in parent component

**Validation:**
- Required: full_name, email
- Email format validation
- Leave balance entitled_days must be >= 0

### 3. Invitations Tab Table Redesign

**Table Columns (simplified from current):**
1. **Imię i nazwisko** - Name + email (stacked layout)
2. **Akceptujący** - Approver name (new column)
3. **Grupa** - Team/Group name
4. **Status** - Badge component (purple "Zaproszony")
5. **Akcja** - Three-dot menu (resend, cancel)

**Remove these columns:**
- Zespół (redundant with Grupa)
- Zaproszony przez (Invited by)
- Rola (Role)
- Wygasa (Expires)

**New Features:**
- Pagination component (10 items per page)
- Page info: "X z Y wierszy"
- Prev/Next buttons
- Page state management

### 4. Dialog Components

**Cancel Invitation Dialog:**
- Component: AlertDialog
- Trigger: Cancel action in invitations dropdown menu
- Title: "Czy na pewno chcesz anulować zaproszenie?"
- Description: "Zaproszona osoba nie będzie mogła dołączyć do Twojego workspace"
- Actions:
  - Primary: "Tak, anuluj zaproszenie" (outline variant)
  - Secondary: "Zamknij" (primary variant)
- On confirm: Call cancel API, close dialog, refresh data

**Archive User Dialog (updated):**
- Component: AlertDialog (existing, update content)
- Title: "Czy na pewno chcesz dezaktywować użytkownika?" (changed from "Usuń pracownika")
- Description: "Użytkownik utraci dostęp do systemu oraz nie będzie uwzględniany w planowaniu grafiku" (updated)
- Actions:
  - Primary: "Tak, archiwizuj użytkownika" (destructive variant)
  - Secondary: "Zamknij" (primary variant)
- Remove: "Ta akcja jest nieodwracalna" warning
- On confirm: Call archive API, close dialog, refresh data

### 5. Group Filter Component

**Requirements:**
- Reusable component accepting team list
- Chip-based UI (Wszyscy, [team names])
- Active state highlighting
- onClick handler for filter changes
- Applied to all three tabs
- Filter logic:
  - "Wszyscy": no filter
  - Specific team: filter by team_id

### 6. Data Fetching & API Changes

**Server-Side (page.tsx):**
- Fetch teams for group filters
- Fetch active employees for Aktywni tab
- Fetch invitations for Zaproszeni tab
- Fetch archived users for Zarchiwizowani tab
- **NEW:** Fetch managers/admins list for leave approver dropdown

**API Endpoint Updates:**

**`/api/employees/[id]` (PUT):**
- Add `approver_id` field handling
- Update `user_organizations.approver_id` field
- Remove `used_days` from leave balance updates
- Validation: approver_id must be manager/admin role
- Return updated employee data

### 7. Component Integration

**TeamManagementClient.tsx Updates:**
- Add tab state: `const [activeTab, setActiveTab] = useState('aktywni')`
- Add sheet state: `const [isEditSheetOpen, setIsEditSheetOpen] = useState(false)`
- Add employee state: `const [selectedEmployee, setSelectedEmployee] = useState(null)`
- Replace `router.push()` with sheet opening
- Render appropriate content based on activeTab
- Pass data to EditEmployeeSheet component
- Handle sheet close and data refresh

**PendingInvitationsSection.tsx:**
- Adapt for tab context (remove standalone section styling)
- Update table columns per spec
- Add pagination logic
- Add cancel confirmation dialog trigger

**ArchivedUsersSection.tsx:**
- Adapt for tab context
- Keep existing reactivate functionality

### 8. Styling & UI

**Typography:**
- Page title: 30px font-semibold
- Tab labels: 14px font-medium
- Table headers: 14px font-medium text-muted-foreground
- Table cells: 14px font-normal
- Email text: 12px font-normal text-muted-foreground

**Colors:**
- Status badge (Aktywny): bg-green-600 (#16a34a), text-white
- Status badge (Zaproszony): bg-purple-600, text-white
- Tab active: border-bottom-2 border-primary
- Destructive button: bg-destructive text-destructive-foreground

**Spacing:**
- Tab bar: mb-4 or mb-6
- Group filters: mb-4
- Sheet sections: gap-6
- Form fields: gap-4

### 9. Performance Considerations

- Lazy load tab content to avoid rendering all three tables simultaneously
- Implement optimistic updates for sheet form submission
- Use React Query for data fetching and cache management (if applicable)
- Debounce filter changes if needed

### 10. Accessibility

- Keyboard navigation for tabs (arrow keys)
- Focus management in sheet (trap focus, return to trigger on close)
- ARIA labels for icon buttons
- Screen reader announcements for tab changes
- Proper heading hierarchy (h1 for page, h2 for sections)

## External Dependencies

No new external dependencies required. All functionality can be implemented using existing UI components:
- Sheet component (existing)
- AlertDialog component (existing)
- Tabs component (existing or easily created)
- Badge component (existing)
- Select component (existing)
- DatePickerWithDropdowns (existing)
- Table components (existing)
