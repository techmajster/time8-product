# Spec Tasks

## 1. Database & Types
- [x] 1.1 Create migration adding `exclude_public_holidays`, `daily_start_time`, `daily_end_time`, `work_schedule_type`, `shift_count`, `work_shifts` columns to `public.organizations`
- [x] 1.2 Backfill existing org rows with Mon–Fri + 09:00–17:00 defaults
- [x] 1.3 Update TypeScript definitions (`types/organization.ts`, etc.) to include new fields

## 2. API / Server
- [x] 2.1 Update `/api/admin/settings/work-mode` route to accept the new payload + validation
- [x] 2.2 Ensure response returns updated organization snapshot
- [x] 2.3 Wire admin/server loaders (`/admin/settings`, `/dashboard`, `/calendar`) to select new columns

## 3. Admin Settings UI
- [x] 3.1 Replace `WorkModeSettings` summary with Figma cards + `Edytuj` actions
- [x] 3.2 Implement `EditWorkingDaysSheet` (chips, toggle, optimistic updates)
- [x] 3.3 Implement `EditWorkHoursSheet` (Praca codzienna, shift preview states)
- [x] 3.4 Hook sheets into React Query mutation with loading/error states

## 4. Dashboard & Calendar Integration
- [ ] 4.1 Feed working-days + hours into `CurrentDayCard`
- [ ] 4.2 Pass new config props through `DashboardCalendar` → `CalendarClient`
- [ ] 4.3 Update `CalendarClient` day status logic (hours label + holiday toggle)

## 5. QA / Documentation
- [ ] 5.1 Add component/API tests covering new flows + validation failures
- [ ] 5.2 Update spec docs / README section with new fields & behaviors
- [ ] 5.3 Manual QA checklist: working day chips, holiday toggle, hours reflected on dashboard + calendar