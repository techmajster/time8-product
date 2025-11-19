# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-01-15-admin-settings-figma-redesign/spec.md

## Technical Requirements

### UI/UX Updates

#### Tab Structure
- Reduce tab count from 8 to 4
- Tab order: Ogólne → Tryb pracy → Urlopy → Rozliczenia
- Use existing `FigmaTabs` component for navigation
- Remove unused tab components and their associated sheets

#### Ogólne Tab
**Remove Components:**
- Logo upload UI (file input, preview)
- Organization slug input field
- Google Workspace integration card (`EditGoogleWorkspaceSheet`)
- Google domain configuration fields

**Keep & Update:**
- Workspace name (read-only display with edit button)
- Administrator selector (user card with dropdown)
- Holiday calendar selector (dropdown with country flag icons)
- Primary language selector (dropdown with country flag icons)
- Add helper text for language: "Domyślny język dla nowych użytkowników. Użytkownicy mogą zmienić język w swoim profilu."

**Visual Updates:**
- Match Figma card padding (24px gaps)
- Add country flag icons (Poland flag) to dropdowns
- Update "Edytuj dane" button styling to match Figma

#### Tryb pracy Tab
**New Visual Components:**

1. **Dni pracujące Card**
   - Section title: "Dni pracujące"
   - Subtitle: "Podstawowe informacje o przestrzeni roboczej"
   - 7-day checkbox grid (horizontal layout, 4px gap)
   - Each day button:
     - Active days (Mon-Fri): Purple background `#ede9fe`, checkmark icon
     - Inactive days (Sat-Sun): Gray background `#f5f5f5`, X icon
     - 50% opacity on checkbox icons
     - 12px padding, 10px border radius
   - Public holidays checkbox:
     - Label: "Wolne święta państwowe"
     - Description: "Święta wypadające w dni pracujące zostaną wyłączone z harmonogramu"
     - Purple primary color `#7c3aed`, 50% opacity

2. **Godziny pracy Card** (separated by horizontal rule)
   - Section title: "Godziny pracy"
   - Subtitle: "Podstawowe informacje o przestrzeni roboczej"
   - Subsection: "Praca codzienna" with description "Stałe godziny pracy każdego dnia pracującego"
   - Time range inline selectors:
     - Label "Godziny pracy"
     - "Od" dropdown showing "9:00" (90px width, disabled with 50% opacity)
     - "do" label
     - Dropdown showing "17:00" (90px width, disabled with 50% opacity)
   - "Edytuj" button (currently non-functional)

**Implementation Notes:**
- All interactive elements are visual-only for this phase
- No state management needed yet
- Hard-coded values: Mon-Fri active, Sat-Sun inactive, 9:00-17:00
- Disabled state styling: 50% opacity, pointer-events-none

#### Urlopy Tab
**Remove:**
- Nested tab navigation (Rodzaje urlopów / Polityki urlopowe)
- `EditLeavePoliciesSheet` component
- Policies tab content

**Update:**
- Show only the leave types table as main content
- Enhance table with lock icons for mandatory types (`is_mandatory: true`)
- Improve badge styling to match Figma (purple "Świąt" badges)
- Update action buttons: "Utwórz domyślne rodzaje urlopów" (outline), "+ Dodaj rodzaj urlopu" (purple primary)
- Preserve all existing functionality (create, edit, delete leave types)

#### Rozliczenia Tab
- No changes - keep existing implementation

### Component Architecture

**Files to Modify:**
- `app/admin/settings/components/AdminSettingsClient.tsx` - Update tab structure
- `app/admin/settings/components/EditOrganizationSheet.tsx` - Remove deprecated fields
- `app/admin/settings/page.tsx` - Remove unused data fetches

**Files to Remove:**
- `app/admin/settings/components/EditGoogleWorkspaceSheet.tsx`
- `app/admin/settings/components/EditLeavePoliciesSheet.tsx`
- Calendar visibility related components (if any standalone files)

**New Components to Create:**
- `app/admin/settings/components/WorkingDaysGrid.tsx` - 7-day checkbox grid
- `app/admin/settings/components/WorkHoursDisplay.tsx` - Visual time range display

### Styling Updates

**Color Tokens:**
- Active state background: `bg-violet-100` (#ede9fe)
- Inactive state background: `bg-gray-100` (#f5f5f5)
- Primary purple: `bg-violet-600` (#7c3aed)
- Checkbox opacity: `opacity-50`

**Spacing:**
- Card gaps: `gap-6` (24px)
- Form field gaps: `gap-3` (12px)
- Day grid gap: `gap-1` (4px)

### API Changes

**Modify Endpoint:** `PUT /api/admin/settings/organization`

**Remove from Request Body:**
- `slug`
- `googleDomain`
- `requireGoogleDomain`
- `logoUrl`

**Keep in Request Body:**
- `name` (workspace name)
- `adminId` (administrator user ID)
- `countryCode` (holiday calendar)
- `locale` (primary language)

**Update Validation:**
- Remove slug uniqueness check
- Remove Google domain validation
- Add validation to reject removed fields with error message

**Response Updates:**
- Remove deprecated fields from response
- Maintain backward compatibility for existing fields

### Performance Considerations

- Remove unused data fetching (Google Workspace related queries)
- Optimize component tree by removing unused sheets
- Reduce bundle size by removing deprecated components
- Maintain current React Query caching strategy

### Error Handling

- Display clear error messages if API receives deprecated fields
- Handle migration state gracefully (if old columns still exist)
- Preserve existing error handling for leave types
- Add validation messages for new visual components (even if non-functional)

### Accessibility

- Maintain proper ARIA labels for all interactive elements
- Ensure disabled state is properly announced by screen readers
- Keep keyboard navigation working for all controls
- Maintain sufficient color contrast for active/inactive states
- Provide text alternatives for visual indicators (checkmarks, X icons)

### Browser Compatibility

- Use existing Tailwind utilities for cross-browser compatibility
- Test checkbox grid layout in Safari, Firefox, Chrome
- Ensure flag icons render correctly across browsers
- Maintain responsive design principles

### Testing Requirements

- Update component tests for AdminSettingsClient (4 tabs instead of 8)
- Remove tests for deleted components
- Add visual regression tests for new working days grid
- Add visual regression tests for work hours display
- Update integration tests for organization settings API
- Ensure leave types functionality tests still pass

## External Dependencies

No new external dependencies required. All functionality uses existing:
- Next.js 14+
- React 18+
- TailwindCSS 4+
- shadcn/ui components
- Lucide React icons
- next-intl for translations
- @supabase/ssr for database access
