# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-10-29-design-system-unification/spec.md

## Technical Requirements

### Phase 1: Standardize Card Component

**File:** `components/ui/card.tsx`

**Current State:**
```tsx
className="rounded-xl border bg-card text-card-foreground shadow"
```

**Required Changes:**
1. Verify Card uses `rounded-xl` (already correct)
2. Verify Card uses `border-border` via Tailwind's default border color
3. Verify Card uses `bg-card` (already correct)
4. Document expected usage in JSDoc comments

**Optional Enhancement:**
Create card variant system for status-based backgrounds:
```tsx
const cardVariants = cva(
  "rounded-xl border bg-card text-card-foreground shadow",
  {
    variants: {
      status: {
        default: "bg-card",
        vacation: "bg-[#C7F4D4]",
        sick: "bg-[#FECACA]",
      }
    }
  }
)
```

### Phase 2: Unify Leave Section

**Files to Update:**
1. `app/leave/page.tsx` (lines 102, 117)
2. `app/leave/components/LeaveBalanceCard.tsx`
3. `app/leave/components/LeaveRequestsList.tsx`

**Pattern Replacements:**
| Current | Replace With | Instances |
|---------|--------------|-----------|
| `border-neutral-200` | `border-border` | 11 |
| `bg-white` | `bg-card` | 20 |
| `rounded-[10px]` | `rounded-xl` or use Card component | 11 |
| Custom div cards | Shadcn Card component | Multiple |

**Example Transformation:**

**Before:**
```tsx
<div className="flex-1 bg-white border border-neutral-200 rounded-[10px] p-6">
  <h2>Content</h2>
</div>
```

**After:**
```tsx
<Card className="flex-1">
  <CardHeader>
    <CardTitle>Content</CardTitle>
  </CardHeader>
</Card>
```

Or if no semantic structure needed:
```tsx
<Card className="flex-1 p-6">
  <h2>Content</h2>
</Card>
```

### Phase 3: Unify Dashboard

**File:** `app/dashboard/page.tsx`

**Current Inline Cards:**
```tsx
<div className="w-32 h-32 border border-border rounded-xl bg-card flex flex-col items-center justify-center mb-1">
```

**Convert To:**
```tsx
<Card className="w-32 h-32 flex flex-col items-center justify-center mb-1">
  <CardContent className="flex flex-col items-center justify-center p-0">
    {/* content */}
  </CardContent>
</Card>
```

**Requirements:**
- Preserve all existing layout and spacing
- Maintain purple theme and visual design
- Use semantic Card components (CardHeader, CardContent) where appropriate
- Keep all existing functionality intact

### Phase 4: Unify Admin & Settings Pages

**Files to Update:**
- `app/admin/settings/page.tsx`
- `app/admin/team-management/page.tsx`
- `app/admin/groups/page.tsx`
- `app/profile/page.tsx` (if applicable)

**Apply Same Pattern:**
1. Replace `border-neutral-200` → `border-border`
2. Replace `bg-white` → `bg-card`
3. Replace `rounded-[10px]` → `rounded-xl`
4. Convert custom divs to Card components where appropriate

### Phase 5: Global Color Token Cleanup

**Search and Replace Pattern:**

**Text Colors:**
| Hardcoded | Semantic Token |
|-----------|----------------|
| `text-neutral-900` | `text-foreground` |
| `text-neutral-700` | `text-foreground` |
| `text-neutral-600` | `text-muted-foreground` |
| `text-neutral-500` | `text-muted-foreground` |
| `text-neutral-400` | `text-muted-foreground` |

**Background Colors:**
| Hardcoded | Semantic Token |
|-----------|----------------|
| `bg-white` | `bg-card` or `bg-background` |
| `bg-neutral-50` | `bg-muted` |
| `bg-neutral-100` | `bg-muted` |

**Border Colors:**
| Hardcoded | Semantic Token |
|-----------|----------------|
| `border-neutral-200` | `border-border` |
| `border-neutral-300` | `border-border` |

**Files Affected (20 total):**
- All files using `text-neutral-*` or `bg-neutral-*` patterns
- Requires careful review of each usage for proper semantic token

### Phase 6: Design System Documentation

**File to Create:** `.agent-os/product/design-system.md`

**Required Sections:**
1. **Design Tokens Reference**
   - Colors (all CSS variables from globals.css)
   - Border radius values
   - Spacing scale
   - Typography scale

2. **Component Usage Guidelines**
   - When to use Card vs custom div
   - Shadcn component import patterns
   - Semantic structure (CardHeader, CardContent, CardFooter)

3. **Color Token Usage**
   - Semantic token mapping
   - Background states (default, vacation, sick)
   - Text color hierarchy

4. **Common Patterns**
   - Card with header and content
   - Simple card wrapper
   - Status-based card backgrounds
   - Form layouts

5. **Examples**
   - Code snippets for common use cases
   - Before/after comparisons

## Testing Requirements

### Visual Regression Testing

**For Each Updated Page:**
1. Take screenshot before changes
2. Apply design token updates
3. Take screenshot after changes
4. Verify no layout shifts or visual breaks

**Test Cases:**
- Desktop viewport (1920x1080)
- Tablet viewport (768x1024)
- Mobile viewport (375x667)

### Component Testing

**Card Component:**
- Renders with correct border-radius
- Uses design tokens for colors
- Supports optional variants (if implemented)

### Functionality Testing

**For Each Updated Page:**
1. All interactive elements work (buttons, forms, links)
2. No broken layouts or overflows
3. Responsive behavior preserved
4. Existing functionality unchanged

## Implementation Strategy

### Order of Execution

1. **Phase 1 (Card Component)** - Foundation, 1 day
2. **Phase 2 (Leave Section)** - High visibility, high priority, 1 week
3. **Phase 3 (Dashboard)** - Medium priority, 2-3 days
4. **Phase 4 (Admin Pages)** - Medium priority, 1 week
5. **Phase 5 (Color Cleanup)** - Low risk, can run parallel, 2-3 days
6. **Phase 6 (Documentation)** - Final step, 1 day

### Safety Measures

1. Work on feature branch: `design-system-unification`
2. Commit after each phase completion
3. Test thoroughly before moving to next phase
4. Keep screenshots for visual comparison
5. Document any edge cases or deviations

### Rollback Strategy

Each phase is independent and can be reverted individually if issues arise:
- Git revert specific commits
- Phases 1-4 are component/file-based, easy to isolate
- Phase 5 requires more careful rollback (global search/replace)

## Success Criteria

1. ✅ Zero instances of `border-neutral-200` in codebase
2. ✅ Zero instances of `bg-white` used for cards
3. ✅ Zero instances of `rounded-[10px]` custom values
4. ✅ All cards use Shadcn Card component
5. ✅ All pages visually consistent
6. ✅ Design system documentation complete
7. ✅ All tests passing
8. ✅ No visual regression bugs
