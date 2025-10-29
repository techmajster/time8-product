# Figma Design System Analysis

This document compares the Figma design system with the current implementation to identify what needs to be updated.

## Executive Summary

**Key Finding:** Your current `globals.css` already has MOST of the correct design tokens, but they're **not being used consistently** throughout the app. The Figma design uses specific values that differ slightly from your current implementation.

### Critical Discrepancies

| Design Element | Figma Value | Current Implementation | Status |
|----------------|-------------|------------------------|--------|
| **Border Radius** | `8px` (`rounded-md`) | `10px` (`--radius: 0.625rem`) | ❌ MISMATCH |
| **Border Color** | `rgba(2,2,2,0.2)` | `oklch(0 0 0 / 0.2)` (same) | ✅ CORRECT |
| **Card Background** | `#ffffff` | `#ffffff` | ✅ CORRECT |
| **Primary Purple** | `#7c3aed` | `oklch(0.5730 0.2430 288.71)` (same) | ✅ CORRECT |
| **Card Violet** | `#ede9fe` (violet-100) | Not in tokens | ⚠️ MISSING |
| **Font Family** | `Geist` | `Geist` (defined but not loaded) | ⚠️ NEEDS UPDATE |

---

## 1. Figma Design Tokens Extracted

### Colors

From Figma variable definitions (`get_variable_defs`):

```json
{
  "base/foreground": "#0a0a0a",
  "base/card-foreground": "#0a0a0a",
  "base/muted-foreground": "#00000080",
  "base/primary": "#7c3aed",
  "base/primary-foreground": "#fafafa",
  "base/border": "#02020233",
  "base/background": "#ffffff",
  "base/card": "#ffffff",
  "base/muted": "#f5f5f5",
  "base/accent": "#f5f5f5",
  "base/input": "#e5e5e5",
  "base/sidebar-foreground": "#0a0a0a",
  "base/sidebar-accent": "#ffffff66",
  "base/sidebar-accent-foreground": "#171717",
  "tailwind colors/violet/100": "#ede9fe",
  "tailwind colors/violet/200": "#ddd6fe",
  "tailwind colors/violet/700": "#6d28d9",
  "tailwind colors/indigo/950": "#1e1b4b",
  "tailwind colors/amber/100": "#fef3c7",
  "tailwind colors/amber/500": "#f59e0b",
  "tailwind colors/green/200": "#bbf7d0",
  "tailwind colors/blue/100": "#dbeafe"
}
```

### Border Radius

```json
{
  "border-radius/rounded-md": "8",
  "border-radius/rounded-lg": "10",
  "border-radius/rounded-full": "9999"
}
```

**Critical:** Figma uses `8px` as the primary card border-radius (`rounded-md`), NOT `10px`!

### Spacing Scale

```json
{
  "spacing/0-5": "2",
  "spacing/1": "4",
  "spacing/1-5": "6",
  "spacing/2": "8",
  "spacing/2-5": "10",
  "spacing/3": "12",
  "spacing/4": "16",
  "spacing/5": "20",
  "spacing/6": "24",
  "spacing/8": "32",
  "spacing/11": "44"
}
```

### Typography

```json
{
  "font/font-sans": "Geist",
  "font-weight/light": "300",
  "font-weight/normal": "400",
  "font-weight/medium": "500",
  "font-weight/semibold": "600",

  "text/xs/font-size": "12",
  "text/xs/line-height": "16",

  "text/sm/font-size": "14",
  "text/sm/line-height": "20",

  "text/base/font-size": "16",
  "text/base/line-height": "24",

  "text/xl/font-size": "20",
  "text/xl/line-height": "28",

  "text/5xl/font-size": "48",
  "text/5xl/line-height": "48"
}
```

### Shadows

```json
{
  "shadow/xs": "0 1px 2px 0 rgba(0,0,0,0.05)",
  "shadow/sm": "0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)"
}
```

---

## 2. Current Implementation (globals.css)

### What's Correct ✅

1. **Border color** - `--border: oklch(0 0 0 / 0.2)` ≈ `rgba(2,2,2,0.2)` ✅
2. **Primary purple** - `--primary: oklch(0.5730 0.2430 288.71)` = `#7c3aed` ✅
3. **Sidebar gradient** - Uses correct indigo-950 and violet-700 ✅
4. **Font family** - `Geist` defined in `--font-sans` ✅
5. **Card background** - `--card: oklch(1 0 0)` = `#ffffff` ✅

### What's Wrong ❌

1. **Border Radius Mismatch:**
   - **Current:** `--radius: 0.625rem` = `10px`
   - **Figma:** `8px` (`rounded-md`)
   - **Fix:** Change `--radius: 0.625rem` to `--radius: 0.5rem` (8px)

2. **Missing Violet-100 Background:**
   - **Figma cards:** Use `#ede9fe` (violet-100) as card background
   - **Current:** Uses `#ffffff` (white)
   - **Fix:** Add `--card-violet: #ede9fe` for dashboard cards

3. **Font Not Actually Loaded:**
   - **Figma:** Uses `Geist` font family
   - **Current:** `--font-sans` references Geist but font isn't imported
   - **Fix:** Ensure Geist font is loaded (check `layout.tsx` or import from Google Fonts)

---

## 3. Card Component Analysis

### Figma Card Design

From Dashboard card component (`25640:49286`):

```tsx
<div className="
  bg-[var(--tailwind-colors/violet/100,#ede9fe)]  // Violet background
  border-[var(--base/border,rgba(2,2,2,0.2))]      // Border color
  border-[var(--border-width/border,1px)]          // Border width
  rounded-[var(--border-radius/rounded-md,8px)]    // 8px radius
  p-[var(--spacing/6,24px)]                        // 24px padding
  gap-[var(--spacing/4,16px)]                      // 16px gap
">
```

**Key Takeaways:**
- Cards use **violet-100 background** (`#ede9fe`), not white
- Border-radius is **8px** (`rounded-md`), not 10px
- Padding is **24px** (`spacing/6`)
- Gap between elements is **16px** (`spacing/4`)

### Current Card Component

File: `components/ui/card.tsx`

```tsx
const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-xl border bg-card text-card-foreground shadow",
      className
    )}
    {...props}
  />
))
```

**Issues:**
1. Uses `rounded-xl` which calculates to `calc(var(--radius) + 4px)` = `14px` (too large!)
2. Uses `bg-card` which is white, not violet-100

---

## 4. Typography Comparison

### Figma Typography Tokens

| Token | Font Size | Line Height | Weight | Family |
|-------|-----------|-------------|--------|--------|
| `text-xs/leading-normal/normal` | 12px | 16px | 400 | Geist |
| `text-sm/leading-normal/normal` | 14px | 20px | 400 | Geist |
| `text-sm/leading-normal/medium` | 14px | 20px | 500 | Geist |
| `text-sm/leading-normal/semibold` | 14px | 20px | 600 | Geist |
| `text-xl/leading-normal/normal` | 20px | 28px | 400 | Geist |
| `text-xl/leading-normal/semibold` | 20px | 28px | 600 | Geist |
| `text-5xl/leading-normal/semibold` | 48px | 48px | 600 | Geist |

### Current Implementation

- Uses Tailwind's default text sizes (text-xs, text-sm, text-xl, text-5xl)
- Defines `--font-sans: Geist` but doesn't import the font
- Font weights match Figma (400, 500, 600)

---

## 5. Calendar Component

### Figma Calendar Design

From the calendar screenshot:

**Day Cells:**
- **Background (working days):** `#ede9fe` (violet-100)
- **Background (vacation):** Light green/yellow gradient
- **Background (weekends):** Gray with diagonal stripes
- **Border-radius:** `8px` per cell
- **Padding:** Spacious with avatars and text

**Header:**
- Badge "Grafik gotowy" (purple badge)
- Month selector with arrows
- Settings icon (gear)

**Typography:**
- Day numbers: Large, semibold
- Time ranges: Small, muted
- Status labels: "Urlop", "Niepracujący"

### Current Implementation

Likely uses default Shadcn calendar with different styling - needs detailed review.

---

## 6. Leave/Absence List Page

### Figma Design (`25630-159548`)

**Layout:**
- Sidebar (dark purple gradient)
- Main content area with white background
- Header with breadcrumb
- Two summary cards at top
- Tabs (Wszystkie / 2025 / 2024)
- Data table with columns:
  - Data (date + time)
  - Opis (description)
  - Typ (type)
  - Liczba dni (number of days)
  - Status (with colored badges)
  - Akcje (actions with "Szczegóły" button)

**Status Badges:**
- "Oczekuje" - Purple badge
- "Zaakceptowany" - Green badge
- "Zaakceptowany" - Gray badge
- "Odrzucony" - Red badge
- "Anulowany" - Gray badge

**Summary Cards:**
- Background: White (`#ffffff`)
- Border: `rgba(2,2,2,0.2)`
- Border-radius: `8px`
- Padding: `24px`

### Current Implementation

File: `app/leave/page.tsx`

Likely uses:
```tsx
<Card className="flex-1 bg-white border border-neutral-200 rounded-[10px] p-6">
```

**Issues:**
- Hardcoded `bg-white` instead of `bg-card`
- Hardcoded `border-neutral-200` instead of `border-border`
- Hardcoded `rounded-[10px]` instead of `rounded-lg` (which should be 8px)

---

## 7. Recommended Design Token Updates

### Update `globals.css` `:root`

```css
:root {
  /* CHANGE: Fix border-radius to match Figma */
  --radius: 0.5rem; /* 8px, was 0.625rem (10px) */

  /* ADD: Violet card background from Figma */
  --card-violet: #ede9fe; /* tailwind violet-100 */

  /* KEEP: These are already correct */
  --border: oklch(0 0 0 / 0.2); /* rgba(2,2,2,0.2) */
  --primary: oklch(0.5730 0.2430 288.71); /* #7c3aed */
  --card: oklch(1 0 0); /* #ffffff */

  /* ADD: Additional Figma colors for status badges */
  --success: #10b981; /* green for approved */
  --warning: #f59e0b; /* amber for pending */
  --info: #3b82f6; /* blue for info */
}
```

### Update Card Component

File: `components/ui/card.tsx`

```tsx
const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-lg border bg-card text-card-foreground shadow-sm", // Changed rounded-xl to rounded-lg (8px)
      className
    )}
    {...props}
  />
))
```

**Why `rounded-lg`?**
- `rounded-lg` = `var(--radius-lg)` = `var(--radius)` = `8px` (after we fix --radius)
- Matches Figma's `rounded-md` (8px)

---

## 8. Implementation Priorities

### Priority 1: Fix Global Border Radius (CRITICAL)

**File:** `app/globals.css`

```css
/* Line 120 - CHANGE FROM */
--radius: 0.625rem;

/* TO */
--radius: 0.5rem; /* 8px to match Figma rounded-md */
```

**Impact:** This single change fixes border-radius across the entire app.

### Priority 2: Update Card Component

**File:** `components/ui/card.tsx`

Change `rounded-xl` to `rounded-lg` to use the corrected `--radius` value.

### Priority 3: Add Violet-100 Background Support

**File:** `app/globals.css`

```css
:root {
  /* Add after --card definition */
  --card-violet: #ede9fe; /* Violet-100 for dashboard cards */
}
```

**File:** `app/dashboard/page.tsx`

Update dashboard cards to use `bg-[var(--card-violet)]` or create a Card variant.

### Priority 4: Replace All Hardcoded Values

**Pattern to find:**
- `border-neutral-200` → `border-border`
- `bg-white` → `bg-card`
- `rounded-[10px]` → `rounded-lg`
- `text-neutral-*` → `text-foreground` or `text-muted-foreground`

**Files to update:**
- `app/leave/page.tsx`
- `app/leave/components/*.tsx`
- `app/dashboard/page.tsx`
- `app/admin/settings/page.tsx`
- All other pages with hardcoded styles

---

## 9. Font Loading Verification

**Check:** Is the Geist font actually loaded?

**File to review:** `app/layout.tsx`

Ensure Geist font is imported:

```tsx
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'

// Apply to html element
<html className={`${GeistSans.variable} ${GeistMono.variable}`}>
```

Or use `next/font/google` if loading from Google Fonts.

---

## 10. Visual Regression Testing Checklist

After making changes, verify:

- [ ] Dashboard cards have 8px border-radius (not 10px or 12px)
- [ ] Dashboard cards use violet-100 background (`#ede9fe`)
- [ ] Leave page cards have 8px border-radius
- [ ] All borders use `rgba(2,2,2,0.2)` color
- [ ] Calendar day cells have 8px border-radius
- [ ] Status badges use correct colors (purple, green, red, gray)
- [ ] Geist font displays correctly
- [ ] No visual layout shifts or breaks
- [ ] Responsive behavior preserved on mobile/tablet

---

## Summary

### What Matches ✅
- Border color (`rgba(2,2,2,0.2)`)
- Primary purple (`#7c3aed`)
- Sidebar gradient (indigo-950 to violet-700)
- Card white background (for non-dashboard pages)

### What Needs Fixing ❌
1. **Border-radius:** 10px → 8px (change `--radius` from `0.625rem` to `0.5rem`)
2. **Card component:** `rounded-xl` → `rounded-lg`
3. **Dashboard cards:** Add violet-100 background support
4. **Hardcoded values:** Replace across 11+ files

### Impact of Changes
- **Low Risk:** Changing `--radius` from 10px to 8px is a minor visual tweak (2px difference)
- **Medium Effort:** Replacing hardcoded values requires file-by-file updates
- **High Value:** Unified design system makes future changes effortless

---

## Next Steps

1. **Fix border-radius in `globals.css`** (1 line change)
2. **Update Card component** (1 line change)
3. **Add violet-100 token** (1 line addition)
4. **Systematically replace hardcoded values** (follow Phase 2-5 tasks)
5. **Verify Geist font loading** (check `layout.tsx`)
6. **Visual regression test** all updated pages
