# Spec Requirements Document

> Spec: Leave Settings Figma Alignment
> Created: 2025-11-18
> Status: Planning

## Overview

Align the admin settings leave management UI components with the approved Figma design to ensure pixel-perfect visual consistency and adherence to the design system. This enhancement will improve the professional appearance of the leave management interface and maintain design consistency across the Time8 platform.

## User Stories

### Admin Visual Consistency

As an admin configuring leave types, I want the UI to match the professional Figma design, so that the interface looks polished and consistent with the rest of the platform.

When an admin opens the "Dodaj rodzaj urlopu" sheet, they should see a visually consistent interface with proper typography (20px title), purple checkboxes matching the primary brand color, and clear visual separators between sections. The form should feel professional and well-designed, not mismatched or inconsistent.

### Design System Compliance

As a product owner, I want all UI components to match the approved Figma specifications, so that the platform maintains a cohesive visual identity.

The leave types table should display lock icons for mandatory types, proper badge colors (purple for "Saldo", gray for "Obowiązkowy"), correct row heights (52px), and consistent typography using the Geist font family with appropriate weights (400, 500, 600).

## Spec Scope

1. **CreateLeaveTypeSheet Typography** - Update title from text-lg to text-xl (20px) to match Figma specifications
2. **Checkbox Styling** - Change checked state color from foreground to primary purple (#7c3aed)
3. **Visual Separators** - Add horizontal separator components between major sections in the sheet
4. **Label Text Correction** - Fix "Wymaga zatwierdzenia" label (currently reads "Wymaga zatwierdzania")
5. **Table Badge Styling** - Verify "Saldo" and "Obowiązkowy" badges use correct colors and styling

## Out of Scope

- Functional changes to leave type creation logic
- Database schema modifications
- API endpoint changes
- Changes to other admin setting tabs (Ogólne, Tryb pracy, Rozliczenia)
- Backend validation or business logic updates
- New feature development beyond visual alignment

## Expected Deliverable

1. CreateLeaveTypeSheet component visually matches Figma design (node 26316-268261) with correct title size, checkbox colors, separators, and spacing
2. Leave types table displays proper badge colors, lock icons, and typography matching Figma design (node 26315-87558)
3. All visual discrepancies documented in the analysis are resolved while maintaining full functionality
