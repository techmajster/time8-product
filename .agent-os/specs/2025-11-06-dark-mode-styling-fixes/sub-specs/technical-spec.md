# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-11-06-dark-mode-styling-fixes/spec.md

## Technical Requirements

### 1. CSS Variables Update (globals.css)

**File:** `app/globals.css`

**Change Required:**
- Add `--card-violet` variable to `.dark` selector (lines 144-191)
- Current state: Variable only exists in `:root` (light mode) with value `#ede9fe`
- Proposed dark mode value: `#312e81` or `#1e1b4b` (dark indigo/purple)

**Implementation:**
```css
.dark {
  /* ... existing variables ... */
  --card-violet: #312e81; /* Dark indigo for calendar cells */
}
```

### 2. Radio Group Component

**File:** `components/ui/radio-group.tsx`

**Lines to Update:** 41, 47, 49, 61, 67, 95

**Color Mappings:**
- `border-neutral-900` → `border-primary`
- `bg-neutral-100` → `bg-muted`
- `bg-neutral-900` → `bg-primary`
- `bg-white` → `bg-primary-foreground`
- `text-neutral-800` → `text-foreground`

**Rationale:** Semantic tokens automatically adapt to theme changes via CSS custom properties, while hardcoded Tailwind colors remain static.

### 3. Dashboard Badge

**File:** `app/dashboard/components/DashboardClient.tsx`

**Line:** 112

**Change:**
- From: `bg-blue-100 text-blue-800`
- To: `bg-accent text-accent-foreground`

**Rationale:** Accent colors are theme-aware and provide appropriate contrast in both modes.

### 4. Avatar Fallback

**File:** `components/ui/avatar.tsx`

**Line:** 45

**Change:**
- From: `bg-[#C8BBFD] text-[#1e1b4b]`
- To: `bg-[var(--avatar-fallback)] text-[var(--avatar-fallback-foreground)]`

**Rationale:** CSS variables already defined in globals.css for both light and dark modes. Using them ensures consistency with theme.

### 5. Onboarding Screens (Optional)

**Files:**
- `components/onboarding/WelcomeScreen.tsx` (line 52)
- `components/onboarding/ChoiceScreen.tsx` (line 102)
- `components/onboarding/MultiOptionScreen.tsx` (line 174)

**Change:**
- From: `text-neutral-950`
- To: `text-foreground`

**Priority:** Low - onboarding is typically one-time use

## Performance Considerations

- All changes use existing CSS custom properties or Tailwind utilities
- No additional CSS bundle size impact
- No runtime performance impact (CSS variables are optimized by browser)

## Browser Compatibility

- CSS custom properties supported in all modern browsers
- Tailwind CSS 4.0 with PostCSS ensures compatibility
- No additional polyfills required
