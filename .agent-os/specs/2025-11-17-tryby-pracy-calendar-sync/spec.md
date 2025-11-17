# Spec Requirements Document

> Spec: Tryby pracy — Settings & Calendar Sync  
> Created: 2025-11-17  
> Status: Draft

## Overview

Implement the redesigned “Tryb pracy” tab (per Figma nodes `26317-283869`, `26407-120970`) with fully functional editing sheets for working days (`26316-272813`) and working hours (`26316-282375`, `26317-282724`, `26317-283521`). Persist the new settings in `organizations`, and propagate them to both the dashboard (`CurrentDayCard`, `DashboardCalendar`) and the full calendar (`CalendarClient`). The goal is to let admins configure:

- Working days (chips) and whether public holidays become non-working days.
- Daily work hours (Praca codzienna) or multi-shift placeholder (UI only for now).
- Summary cards that show the saved configuration.
- Calendar/day-card rendering that reflects the chosen days, hours, and holiday toggle.

## User Stories

### 1. Configure Working Days
As an admin, I can open “Dni pracujące”, select weekdays, and decide if national holidays are automatically marked as free so that the company schedule reflects reality.

**Flow:** Tryb pracy tab → `Edytuj` (Dni pracujące) → sheet with pill checkboxes + “Wolne święta państwowe” toggle → Save updates summary and database.

### 2. Configure Daily Working Hours
As an admin, I can open “Godziny pracy”, choose “Praca codzienna”, and pick start/end hours so that the dashboard and calendar show accurate work ranges (instead of the current `9:00 - 15:00` placeholder).

### 3. Prepare for Shift Schedules
As an admin, I see the “Praca według grafiku” UI (radio, shift count selector, per-shift rows per Figma) so we can enable multi-shift later. In this spec the component is functional for 1-shift daily schedule; multi-shift UI can stay disabled/previewed but should follow the design structure.

### 4. Calendar Consistency
As an employee, when I view the dashboard card or the calendar grid, I see my organization’s working days highlighted, holidays respected according to the toggle, and the correct hour range for working days.

## Scope

### Backend / Data
1. Extend `public.organizations`:
   - `exclude_public_holidays boolean default true`
   - `daily_start_time time default '09:00'`
   - `daily_end_time time default '17:00'`
   - `work_schedule_type text default 'daily'` (values: `daily`, `multi_shift`)
   - `shift_count integer default 1 CHECK 1-3`
   - `work_shifts jsonb default '[]'` (array of `{ label: string; start_time: string; end_time: string }`)
2. Backfill existing rows from current constants (Mon–Fri, 09:00–17:00, holidays excluded).
3. Update RLS comments if needed; no new tables for now.

### API
1. Replace `/api/admin/settings/work-mode` payload with:
   ```ts
   {
     working_days: string[]
     exclude_public_holidays: boolean
     work_schedule_type: 'daily' | 'multi_shift'
     daily_start_time?: string // HH:MM
     daily_end_time?: string
     shift_count?: 1 | 2 | 3
     work_shifts?: { label: string; start_time: string; end_time: string }[]
   }
   ```
2. Validate:
   - `working_days` subset of week names (lowercase).
   - Start < end times, no overlaps for shifts, shift_count matches array length.
   - `multi_shift` temporarily blocked from saving (`return 422` with TODO) unless at least 1 shift defined.
3. Return new org snapshot so client can update optimistically.

### Admin Settings UI
1. **Summary cards** (Figma `26317-283869`, `26407-120970`):
   - Dni pracujące: chips, description text, “Wolne święta...” status.
   - Godziny pracy: show either “Praca codzienna” with `Od/Do` or “Praca według grafiku” list, plus `Edytuj` buttons.
2. **Sheets**:
   - `EditWorkingDaysSheet`: pill checkbox list, toggle, Cancel/Save actions, disabled state while saving.
   - `EditWorkHoursSheet`:
     - Radio group for `Praca codzienna` vs `Praca według grafiku`.
     - Daily mode: two select inputs (minute granularity 15). Pre-fill from org data.
     - Shift mode: segmented control (1–3), dynamic shift rows, `Od/Do` selects. For now, allow editing but display “Wkrótce” badge or disable final save if multi-shift isn’t GA (depending on product decision).
   - Both sheets follow design spacing, colors, typography (Geist).
3. Toast feedback for success/error, loading indicators on Save.

### Dashboard & Calendar Integration
1. `/dashboard` data loader must select `organizations(work_mode, working_days, exclude_public_holidays, daily_start_time, daily_end_time, work_schedule_type, shift_count, work_shifts)`.
2. `CurrentDayCard`:
   - Show “Nie pracujemy” + `—` when the current weekday isn’t in `working_days`.
   - Otherwise show formatted `daily_start_time - daily_end_time`.
3. `DashboardCalendar` → `CalendarClient`:
   - Pass `working_days`.
   - Pass new `workScheduleConfig` prop `{ excludePublicHolidays, dailyStartTime, dailyEndTime }`.
4. `CalendarClient`:
   - Replace hardcoded `statusLabel`.
   - When `excludePublicHolidays === false`, treat holidays as normal working days (unless weekend).
   - Keep leave + weekend precedence as today.
   - Selected-day sheet should also display the computed hours in the header banner.
5. Calendar page loader already fetches `working_days`; extend to include all new fields and pass them down.

### Testing & QA
1. Write unit tests for API validation (working days, time ordering).
2. Component tests for:
   - Working-days sheet toggling, disabled Save until change.
   - Hours sheet daily mode (input formatting, validation).
   - Calendar day status deriving from new settings (weekend vs working, holiday toggle on/off).
3. Manual QA checklist:
   - Change working days → calendar updates after save.
   - Toggle holiday behavior → holiday cells switch between grey/working backgrounds.
   - Update hours → dashboard card and calendar labels update.

## Out of Scope
- Employee-level shift assignments or individual calendars.
- Backend scheduling logic for multi-shift (beyond saving data).
- Mobile-specific redesign (existing responsive behavior stays).
- Any rewrite of `CalendarClient` beyond the integrations listed.

## Dependencies / Open Questions
1. Need confirmation on default behavior for `exclude_public_holidays` (assume true).
2. Time picker source of truth: reuse existing Select component or introduce dedicated time-picker?
3. Should multi-shift Save be fully blocked or allowed to store data even if calendars don’t render them yet? (spec assumes blocked with friendly “Wkrótce” copy).

## Acceptance Criteria
1. Admin can change working days + holiday toggle; data persists in Supabase and summary UI updates instantly.
2. Admin can change daily hours; dashboard + calendar reflect new range after save without code changes.
3. Calendar weekend/holiday rendering uses `working_days` + `exclude_public_holidays`.
4. New API returns validation errors for invalid payloads, with translated error copy rendered in sheets.
5. Existing calendars keep functioning for organizations that never opened the new tab (defaults cover them).


