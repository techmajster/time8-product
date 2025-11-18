# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-11-18-leave-settings-figma-alignment/spec.md

## Technical Requirements

### Component Updates

#### CreateLeaveTypeSheet.tsx (Lines 145-274)

**Title Typography Update**
- Change SheetTitle className from `text-lg font-semibold` to `text-xl font-semibold`
- Update line 156 to use Tailwind class `text-xl` (20px) instead of `text-lg` (18px)
- Maintain font-semibold (600 weight) as per Figma

**Checkbox Color Fix**
- Update Checkbox component className on lines 203, 221, and 239
- Change from `data-[state=checked]:bg-foreground data-[state=checked]:border-foreground`
- To: `data-[state=checked]:bg-primary data-[state=checked]:border-primary`
- This applies primary purple (#7c3aed) instead of foreground (black/dark)

**Visual Separators**
- Import Separator component from `@/components/ui/separator`
- Add `<Separator className="w-full" />` after line 157 (after title section)
- Add separator before line 195 (before checkboxes section)
- Add separator before line 255 (before footer section)
- Match Figma node 26316:268262-26316:268300 structure

**Label Text Correction**
- Line 225: Change label text from "Wymaga zatwierdzenia" to "Wymaga zatwierdzania"
- Matches Figma design node 26316:268616 specification

**Layout Spacing Verification**
- Confirm outer padding is 24px (`p-6` on line 154)
- Verify gap between sections is 24px (`gap-6` on line 154)
- Ensure form spacing uses `space-y-5` (20px) on line 160
- Checkbox section uses `space-y-4` (16px) on line 196

#### AdminSettingsClient.tsx Table Styling

**Badge Component Verification**
- "Saldo" badges should use `bg-primary` (purple #7c3aed)
- "Obowiązkowy" badges should use `bg-secondary` (gray #f5f5f5)
- Verify badge text uses `text-xs` (12px) with font-semibold (600)

**Table Cell Heights**
- Verify table rows are h-[52px] (matches Figma specification)
- Verify table header rows are h-[40px]
- Ensure proper padding: `p-[var(--spacing/2,8px)]` or equivalent `p-2`

**Lock Icon Display**
- Confirm IconLockKeyhole renders for mandatory leave types
- Icon size should be 16px (size-4)
- Should appear before leave type name in first column

**Typography Consistency**
- Table headers: font-medium (500), text-sm (14px), text-muted-foreground
- Table cells: font-medium (500), text-sm (14px), text-foreground
- Ensure Geist font family is applied via global CSS

### UI Component Library

**Separator Component**
- Use existing shadcn/ui Separator component
- Orientation: horizontal (default)
- No additional styling needed beyond `className="w-full"`

**Checkbox Component**
- Modify base checkbox styles if needed in `components/ui/checkbox.tsx`
- Ensure primary variant uses `--primary` CSS variable
- Checked state should have purple background and border

**Badge Component**
- Verify primary variant exists and uses `--primary` color
- Verify secondary variant uses `--secondary` color
- Font should be semibold (600), text-xs (12px)

### Design Tokens

**Colors (from Figma)**
- Primary: #7c3aed (purple)
- Secondary background: #f5f5f5 (gray)
- Foreground: #0a0a0a (black)
- Muted foreground: rgba(0,0,0,0.5)
- Border: rgba(2,2,2,0.2)

**Typography (Geist Font)**
- Font family: 'Geist' (already configured)
- Weights: 400 (Regular), 500 (Medium), 600 (SemiBold)
- Sizes: 12px (text-xs), 14px (text-sm), 20px (text-xl)
- Line heights: 16px (xs), 20px (sm), 28px (xl)

**Spacing**
- Padding: 24px (p-6), 16px (p-4), 8px (p-2)
- Gaps: 24px (gap-6), 16px (gap-4), 8px (gap-2)
- Border radius: 8px (rounded-md)

### Testing Requirements

**Visual Regression**
- Compare rendered CreateLeaveTypeSheet with Figma node 26316-268261
- Verify title is 20px (not 18px)
- Confirm checkboxes are purple when checked
- Ensure separators are visible between sections

**Functional Testing**
- Verify checkbox state changes still work correctly
- Confirm form submission behavior unchanged
- Test input field interactions
- Validate button click handlers

**Cross-Browser Compatibility**
- Test in Chrome, Firefox, Safari
- Verify Geist font renders correctly
- Confirm purple color displays consistently
- Check separator visibility across browsers

### Performance Considerations

- No performance impact expected (purely visual changes)
- No new dependencies required
- Component bundle size unchanged
- Re-renders limited to styling updates

### Accessibility

**Color Contrast**
- Verify purple (#7c3aed) on white background meets WCAG AA
- Ensure foreground text on badges has sufficient contrast
- Confirm focus states remain visible

**Keyboard Navigation**
- Checkboxes remain keyboard accessible
- Tab order preserved
- Focus rings visible on interactive elements

**Screen Reader Support**
- Labels and descriptions unchanged
- ARIA attributes preserved
- Semantic HTML structure maintained
