# Design System

## Overview

This document defines the design system for the leave management application. All components should follow these patterns to ensure visual consistency and maintainability.

**Last Updated:** 2025-10-29
**Status:** Active - 80% of app using design tokens

---

## Color Tokens

### Semantic Colors

Use semantic color tokens instead of hardcoded colors. All colors are defined in `app/globals.css` and support automatic light/dark mode switching.

#### Background Colors

```tsx
// ✅ CORRECT - Use semantic tokens
<div className="bg-card">...</div>          // White cards/surfaces
<div className="bg-muted">...</div>         // Subtle backgrounds (gray-50/100)
<div className="bg-foreground">...</div>    // Dark backgrounds (black/gray-950)
<div className="bg-card-violet">...</div>   // Dashboard card backgrounds (#ede9fe)

// ❌ WRONG - Never hardcode colors
<div className="bg-white">...</div>
<div className="bg-neutral-100">...</div>
<div className="bg-gray-50">...</div>
```

#### Text Colors

```tsx
// ✅ CORRECT - Use semantic tokens
<p className="text-foreground">...</p>           // Primary text (black/gray-950)
<p className="text-muted-foreground">...</p>     // Secondary text (gray-500/600)
<p className="text-primary-foreground">...</p>   // White text on colored backgrounds

// ❌ WRONG - Never hardcode colors
<p className="text-neutral-950">...</p>
<p className="text-gray-900">...</p>
<p className="text-black">...</p>
```

#### Border Colors

```tsx
// ✅ CORRECT - Use semantic token
<div className="border">...</div>              // Standard borders (rgba(2,2,2,0.2))
<div className="border-card">...</div>         // Card borders

// ❌ WRONG - Never hardcode colors
<div className="border-neutral-200">...</div>
<div className="border-gray-200">...</div>
```

### Brand Colors

**Primary:** `--primary` (Violet-600 #7c3aed)
**Sidebar:** `--sidebar` (Indigo-950 #1e1b4b)
**Card Violet:** `--card-violet` (Violet-100 #ede9fe)

### Complete Token Reference

| Token | Light Mode | Dark Mode | Usage |
|-------|-----------|-----------|-------|
| `background` | White | Gray-950 | Page background |
| `foreground` | Black | White | Primary text |
| `card` | White | Gray-800 | Card backgrounds |
| `card-foreground` | Black | White | Card text |
| `card-violet` | Violet-100 | - | Dashboard cards |
| `muted` | Gray-50/100 | Gray-800 | Subtle backgrounds |
| `muted-foreground` | Gray-500/600 | Gray-400 | Secondary text |
| `border` | rgba(2,2,2,0.2) | rgba(255,255,255,0.1) | All borders |
| `primary` | Violet-600 | - | Brand color |
| `primary-foreground` | White | - | Text on primary |

---

## Border Radius

### Standard Radii

```tsx
// ✅ CORRECT - Use standardized tokens
<div className="rounded-lg">...</div>    // 8px (most common)
<div className="rounded-xl">...</div>    // 12px (cards)
<div className="rounded-full">...</div>  // Circles/pills

// ❌ WRONG - Never use pixel values
<div className="rounded-[14px]">...</div>
<div className="rounded-[10px]">...</div>
<div className="rounded-[9999px]">...</div>
```

### Border Radius Scale

| Class | Size | Usage |
|-------|------|-------|
| `rounded-sm` | 4px | Small elements |
| `rounded` | 6px | Inputs, buttons |
| `rounded-md` | 6px | Default |
| `rounded-lg` | 8px | **Most common - cards, sheets** |
| `rounded-xl` | 12px | Large cards |
| `rounded-full` | 9999px | Avatars, pills |

**Global Setting:** `--radius: 0.5rem` (8px) in `globals.css`

---

## Spacing System

### Standard Spacing

Use Tailwind's spacing scale (based on 0.25rem / 4px):

```tsx
// Padding
<div className="p-6">...</div>     // 24px all sides (standard card)
<div className="px-4">...</div>    // 16px horizontal
<div className="py-2">...</div>    // 8px vertical

// Gap
<div className="gap-4">...</div>   // 16px gap (common)
<div className="gap-6">...</div>   // 24px gap (sections)

// Margin
<div className="mt-4">...</div>    // 16px top margin
<div className="mb-6">...</div>    // 24px bottom margin
```

### Spacing Scale Reference

| Class | Size | Usage |
|-------|------|-------|
| `spacing-0` | 0px | No spacing |
| `spacing-1` | 4px | Tight spacing |
| `spacing-2` | 8px | Small gaps |
| `spacing-3` | 12px | - |
| `spacing-4` | 16px | Standard gaps |
| `spacing-5` | 20px | - |
| `spacing-6` | 24px | **Card padding, section gaps** |
| `spacing-8` | 32px | Large sections |

**Key Pattern:** Tables should have `spacing-6` (24px) left/right padding.

---

## Component Patterns

### Card Component

The `Card` component is the foundation for all content containers.

#### Basic Usage

```tsx
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card'

// ✅ CORRECT - Standard pattern
<Card>
  <CardHeader>
    <h2>Title</h2>
  </CardHeader>
  <CardContent className="py-0">
    {/* Content here */}
  </CardContent>
</Card>
```

#### Card Padding Rules

- **Card Component:** Has `p-6` (24px all sides) built-in
- **CardContent:** Use `className="py-0"` to remove vertical padding only
- **Never use:** `px-*` classes on CardContent (horizontal padding inherited from Card)

```tsx
// ✅ CORRECT
<Card>                                    // Has p-6 built-in
  <CardContent className="py-0">         // Only override vertical
    {/* Content */}
  </CardContent>
</Card>

// ❌ WRONG
<Card>
  <CardContent className="px-6 py-0">   // Don't duplicate horizontal padding
    {/* Content */}
  </CardContent>
</Card>
```

#### Card Variants

```tsx
// Standard white card
<Card>...</Card>

// Dashboard violet card
<Card className="bg-card-violet">...</Card>

// Rounded variants
<Card className="rounded-lg">...</Card>   // Default (8px)
<Card className="rounded-xl">...</Card>   // Larger (12px)
```

### Button Component

Buttons use variant-based styling, never hardcoded colors.

```tsx
import { Button } from '@/components/ui/button'

// ✅ CORRECT - Use variants
<Button variant="default">Primary Action</Button>
<Button variant="outline">Secondary Action</Button>
<Button variant="ghost">Tertiary Action</Button>

// ❌ WRONG - Never override with hardcoded colors
<Button className="bg-foreground text-white">...</Button>
<Button className="bg-neutral-900">...</Button>
```

#### Button Variants

| Variant | Appearance | Usage |
|---------|-----------|-------|
| `default` | Primary (violet bg) | Main actions |
| `outline` | Border only | Secondary actions |
| `ghost` | No border/bg | Tertiary actions |
| `destructive` | Red bg | Delete/cancel |

#### Button Sizes

```tsx
<Button size="sm">...</Button>      // Small (h-9 / 36px)
<Button size="default">...</Button> // Default (h-10 / 40px)
<Button size="lg">...</Button>      // Large (h-11 / 44px)
```

### Sheet Component

Sheets (slide-out panels) follow the same design token patterns.

```tsx
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'

<Sheet open={isOpen} onOpenChange={setIsOpen}>
  <SheetContent side="right" size="content">
    <SheetTitle>Sheet Title</SheetTitle>
    {/* Sheet content */}
  </SheetContent>
</Sheet>
```

**Key Details:**
- Overlay uses `bg-foreground/50` (50% opacity dark background)
- Content uses `bg-card` (automatic light/dark mode)
- Borders use `border` token

### Table Patterns

Tables should maintain consistent spacing.

```tsx
// ✅ CORRECT - Unified spacing
<Card>                              // Card has p-6 (24px)
  <CardContent className="py-0">   // Remove vertical, keep horizontal
    <Table>
      {/* Table content */}
    </Table>
  </CardContent>
</Card>

// ❌ WRONG - Inconsistent padding
<Card className="py-2">
  <CardContent className="px-4 py-0">
    {/* Creates 16px instead of 24px horizontal */}
  </CardContent>
</Card>
```

**Rule:** All tables should have `spacing-6` (24px) left/right padding from Card's `p-6`.

---

## Typography

### Font Families

```tsx
// Default system font stack (inherited)
font-family: 'Geist', sans-serif

// Monospace
font-family: 'Geist Mono', monospace
```

### Font Sizes & Weights

```tsx
// Headings
<h1 className="text-3xl font-semibold">...</h1>  // 30px
<h2 className="text-xl font-semibold">...</h2>   // 20px
<h3 className="text-lg font-semibold">...</h3>   // 18px

// Body text
<p className="text-base">...</p>                 // 16px
<p className="text-sm">...</p>                   // 14px
<p className="text-xs">...</p>                   // 12px

// Weights
font-normal    // 400
font-medium    // 500
font-semibold  // 600
```

---

## Common Patterns

### Form Fields

```tsx
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

<div className="space-y-2">
  <Label className="text-sm font-medium">Field Label</Label>
  <Input placeholder="Enter value" />
</div>
```

### Loading States

```tsx
// Skeleton loading
<div className="h-8 bg-muted rounded animate-pulse"></div>

// Spinner
<div className="animate-spin rounded-full h-6 w-6 border-b-2 border-foreground"></div>
```

### Hover States

```tsx
// Buttons
hover:bg-foreground/90          // 90% opacity on dark backgrounds
hover:bg-muted/50               // 50% opacity on light backgrounds

// Borders
hover:border-foreground/50      // 50% opacity borders on hover
```

---

## Migration Guide

### From Hardcoded to Tokens

| Old (Hardcoded) | New (Token) |
|-----------------|-------------|
| `bg-white` | `bg-card` |
| `bg-neutral-100` | `bg-muted` |
| `bg-neutral-900` | `bg-foreground` |
| `text-neutral-950` | `text-foreground` |
| `text-neutral-500` | `text-muted-foreground` |
| `text-gray-900` | `text-foreground` |
| `text-gray-600` | `text-muted-foreground` |
| `border-neutral-200` | `border` |
| `border-gray-200` | `border` |
| `rounded-[14px]` | `rounded-xl` |
| `rounded-[10px]` | `rounded-lg` |

### Button Migration

```tsx
// OLD ❌
<Button className="bg-foreground hover:bg-foreground/90 text-white">
  Submit
</Button>

// NEW ✅
<Button variant="default">
  Submit
</Button>
```

---

## Design System Stats

**Adoption Progress:** 80% complete
**Files Updated:** 35+ components
**Tokens Replaced:** 184 instances
**Remaining:** 41 edge cases (intentional)

**Phase Completion:**
- ✅ Phase 1: Card Component Standardization
- ✅ Phase 2: Figma Color Alignment
- ✅ Phase 3: Dashboard Unification
- ✅ Phase 4: Admin & Settings Unification
- ✅ Phase 5: Global Color Token Cleanup
- ✅ Phase 6: Remaining Component Token Cleanup
- ✅ Phase 7: Design System Documentation (this document)

---

## Quick Reference

### Most Common Classes

```tsx
// Layout
bg-card                    // White background
bg-muted                   // Gray background
p-6                        // 24px padding
gap-4                      // 16px gap
rounded-lg                 // 8px radius

// Typography
text-foreground            // Black text
text-muted-foreground      // Gray text
text-sm font-medium        // 14px medium weight

// Borders
border                     // Standard border
border-card                // Card border

// Interactive
hover:bg-muted/50          // Hover on light
hover:bg-foreground/90     // Hover on dark
```

### Component Checklist

When creating a new component:

- [ ] Use `bg-card` instead of `bg-white`
- [ ] Use `text-foreground` instead of `text-black` or `text-neutral-*`
- [ ] Use `text-muted-foreground` for secondary text
- [ ] Use `border` instead of `border-gray-*` or `border-neutral-*`
- [ ] Use `rounded-lg` or `rounded-xl` instead of pixel values
- [ ] Use Button variants instead of hardcoded colors
- [ ] Use Card with proper padding pattern (`py-0` on CardContent)
- [ ] Use `spacing-6` for table left/right padding

---

## Figma Integration

The design system is aligned with Figma design files. Key mappings:

| Figma | Code |
|-------|------|
| Primary/Brand | `--primary` (Violet-600) |
| Neutral/50-100 | `bg-muted` |
| Neutral/900-950 | `bg-foreground` |
| Border Light | `border` (rgba(2,2,2,0.2)) |
| Rounded MD | `rounded-lg` (8px) |
| Rounded LG | `rounded-xl` (12px) |
| Violet/100 | `bg-card-violet` |

---

## Support & Updates

**Maintained by:** Development Team
**Last Review:** 2025-10-29
**Roadmap Location:** `.agent-os/product/roadmap.md`
**Spec Location:** `.agent-os/specs/2025-10-29-design-system-unification/`

For questions or suggestions, reference this document in code reviews and development discussions.
