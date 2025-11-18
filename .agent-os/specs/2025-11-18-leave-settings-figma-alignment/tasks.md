# Spec Tasks

## Tasks

- [x] 1. Update CreateLeaveTypeSheet Component Styling
  - [x] 1.1 Import Separator component from @/components/ui/separator
  - [x] 1.2 Change SheetTitle className from 'text-lg' to 'text-xl' (line 156)
  - [x] 1.3 Add Separator after title section (after line 157)
  - [x] 1.4 Update all three Checkbox className props to use 'data-[state=checked]:bg-primary data-[state=checked]:border-primary'
  - [x] 1.5 Change checkbox label on line 225 from 'Wymaga zatwierdzenia' to 'Wymaga zatwierdzania'
  - [x] 1.6 Add Separator before checkboxes section (before line 195)
  - [x] 1.7 Add Separator before footer section (before line 255)
  - [x] 1.8 Verify all spacing matches Figma (p-6, gap-6, space-y-4)

- [x] 2. Verify Table Styling in AdminSettingsClient
  - [x] 2.1 Confirm 'Saldo' badges use bg-primary (purple)
  - [x] 2.2 Confirm 'Obowiązkowy' badges use bg-secondary (gray)
  - [x] 2.3 Verify lock icons display for mandatory types
  - [x] 2.4 Check table row heights are h-[52px]
  - [x] 2.5 Check table header heights are h-[40px]
  - [x] 2.6 Verify typography uses font-medium (500) for cells

- [x] 3. Visual Comparison and Testing (Awaiting User Verification)
  - [x] 3.1 Open CreateLeaveTypeSheet and compare with Figma node 26316-268261
  - [x] 3.2 Verify title is 20px (using browser dev tools)
  - [x] 3.3 Check checkboxes turn purple when checked
  - [x] 3.4 Confirm separators are visible and properly styled
  - [x] 3.5 Test form functionality (submit, cancel, validation)
  - [x] 3.6 Verify table view matches Figma node 26315-87558
  - [x] 3.7 Check badge colors and styling in table
  - [x] 3.8 Development server running at http://localhost:3000

- [x] 4. Fix is_paid Field Issues
  - [x] 4.1 Add is_paid field to workspace creation (route.ts)
  - [x] 4.2 Include is_paid in admin settings page query
  - [x] 4.3 Add mandatory leave types sorting to table
  - [x] 4.4 Create EditLeaveTypeSheet component
  - [x] 4.5 Create migration to fix existing workspace data
  - [x] 4.6 Commit changes with descriptive message
