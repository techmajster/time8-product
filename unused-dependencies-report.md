# Unused Dependencies Audit Report

## ✅ Confirmed Unused Dependencies (Safe to Remove)

### 1. `embla-carousel-react` (0 usages)
- **Size impact:** ~30-50 kB
- **Status:** ❌ Not used anywhere
- **Action:** REMOVE

### 2. `input-otp` (0 usages)  
- **Size impact:** ~10-20 kB
- **Status:** ❌ Not used anywhere
- **Action:** REMOVE

### 3. `react-resizable-panels` (0 usages)
- **Size impact:** ~20-30 kB
- **Status:** ❌ Not used anywhere
- **Action:** REMOVE

### 4. `vaul` (0 usages)
- **Size impact:** ~15-25 kB
- **Status:** ❌ Not used anywhere
- **Action:** REMOVE

### 5. `react-hot-toast` (0 usages)
- **Size impact:** ~15-25 kB
- **Status:** ❌ Not used anywhere (app uses `sonner` instead)
- **Action:** REMOVE

### 6. `recharts` (0 usages)
- **Size impact:** ~100-150 kB (LARGE!)
- **Status:** ❌ Not used anywhere
- **Action:** REMOVE (Biggest win!)

## ⚠️ Dependencies That Need Investigation

### 1. `tw-animate-css` (1 usage)
- **Usage:** Only in `app/globals.css`
- **Status:** 🔍 Need to check if animations are actually used
- **Action:** INVESTIGATE - remove if animations not used

### 2. `cmdk` (1 usage)
- **Usage:** Only in `components/ui/command.tsx`
- **Status:** 🔍 Need to check if command component is used
- **Action:** INVESTIGATE - might be shadcn/ui boilerplate

## ✅ Confirmed Used Dependencies

### Heavy but Necessary
- **`lucide-react`** - 75 import statements across codebase (heavily used)
- **`@radix-ui/*`** - Used in all UI components  
- **`@supabase/*`** - Core backend functionality
- **`next-intl`** - Internationalization system
- **`@tanstack/react-query`** - Data fetching

## 📊 Removal Impact Summary

### Immediate Bundle Size Savings
| Package | Estimated Size | Status |
|---------|---------------|--------|
| `recharts` | 100-150 kB | ❌ REMOVE |
| `embla-carousel-react` | 30-50 kB | ❌ REMOVE |
| `react-resizable-panels` | 20-30 kB | ❌ REMOVE |
| `react-hot-toast` | 15-25 kB | ❌ REMOVE |
| `vaul` | 15-25 kB | ❌ REMOVE |
| `input-otp` | 10-20 kB | ❌ REMOVE |

**Total estimated savings: 190-300 kB**

## 🚀 Recommended Actions

### Phase 1: Safe Removals (5 minutes)
```bash
npm uninstall embla-carousel-react input-otp react-resizable-panels vaul react-hot-toast recharts
```

### Phase 2: Investigate & Clean (15 minutes)
1. Check if `cmdk` command component is used
2. Verify if `tw-animate-css` animations are needed
3. Remove if unused

### Expected Results
- **Bundle size reduction:** 190-300 kB (53-84% of goal)
- **Vendor chunk reduction:** ~15-25% smaller
- **Faster installs:** Less dependencies to download

---

*Generated from dependency usage audit - safe to proceed with Phase 1 removals* 