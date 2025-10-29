# Spec Requirements Document

> Spec: Design System Unification
> Created: 2025-10-29
> Status: Planning

## Overview

Unify the entire SaaS leave system application with consistent Shadcn UI styling and design tokens, eliminating hardcoded values and ensuring pixel-perfect alignment with Figma design system across all pages.

## User Stories

### Consistent Visual Experience

As a user navigating between different pages (Dashboard, Leave, Admin), I want to see consistent card styling, borders, and colors, so that the application feels cohesive and professionally designed.

**Current Issue:** Dashboard uses custom inline cards with `rounded-xl`, Leave pages use `rounded-[10px]` with `border-neutral-200`, creating visual inconsistency.

**Expected:** All cards use Shadcn Card components with unified design tokens (`border-border`, `bg-card`, `rounded-xl`).

### Theme-Ready Design System

As a developer maintaining the codebase, I want all styling to use CSS variables and design tokens, so that future theme changes (e.g., dark mode) can be implemented by updating variables instead of searching through dozens of files.

**Current Issue:** 20 files use hardcoded `text-neutral-*` and `bg-neutral-*` colors, 11 files use custom `rounded-[10px]` values.

**Expected:** All styling uses semantic tokens (`text-foreground`, `text-muted-foreground`, `bg-card`, etc.) defined in `globals.css`.

### Maintainable Component Library

As a developer adding new features, I want clear documentation and examples of the design system, so that I can build new pages that automatically match the existing visual design.

**Current Issue:** No centralized design system documentation, inconsistent component usage patterns across pages.

**Expected:** Design system documentation in `.agent-os/product/design-system.md` with component usage examples, color tokens, and spacing guidelines.

## Spec Scope

1. **Card Component Standardization** - Update Shadcn Card component to use design system variables, create optional status-based variants
2. **Leave Section Unification** - Replace all hardcoded values in leave pages with design tokens and Shadcn Card components
3. **Dashboard Conversion** - Convert dashboard inline div cards to semantic Shadcn Card components while maintaining visual design
4. **Admin Pages Unification** - Apply same design token pattern to admin/settings/team-management/groups pages
5. **Global Color Token Cleanup** - Remove all hardcoded neutral colors across 20 files, replace with semantic tokens
6. **Design System Documentation** - Create comprehensive design system reference guide for future development

## Out of Scope

- Adding new visual designs or features beyond unification
- Dark mode implementation (this work makes it possible, but doesn't implement it)
- Redesigning components beyond what's already in Figma
- Changing functionality or business logic
- Mobile-specific responsive adjustments (preserve existing responsive behavior)

## Expected Deliverable

1. **All pages use consistent styling:**
   - Browse to Dashboard → see cards with unified border-radius and colors
   - Navigate to Leave page → see same card styling as Dashboard
   - Open Admin Settings → see same card styling as other pages

2. **Zero hardcoded style values:**
   - Inspect codebase → no instances of `border-neutral-200`, `bg-white`, or `rounded-[10px]`
   - All styling uses design tokens → `border-border`, `bg-card`, `rounded-xl`

3. **Design system documentation exists:**
   - Open `.agent-os/product/design-system.md` → see comprehensive style guide
   - Read component usage examples → understand when to use Card vs custom divs
   - Check color token reference → know which semantic tokens to use

4. **Visual regression testing confirms no broken layouts:**
   - All existing functionality works identically
   - No layout shifts or broken responsive behavior
   - All pages render correctly across desktop/tablet/mobile
