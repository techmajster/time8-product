# Spec Tasks

## Tasks

- [ ] 1. Add Translation Keys to Messages Files
  - [ ] 1.1 Add new dashboard translation keys to `messages/pl.json`
  - [ ] 1.2 Add corresponding English translations to `messages/en.json`
  - [ ] 1.3 Verify translation key structure follows existing conventions

- [ ] 2. Implement Role-Based Visibility for Leave Requests Card
  - [ ] 2.1 Add conditional rendering in DashboardClient.tsx (line 152)
  - [ ] 2.2 Test with admin role (card should be visible)
  - [ ] 2.3 Test with manager role (card should be visible)
  - [ ] 2.4 Test with user role (card should be hidden)

- [ ] 3. Replace Hardcoded Polish Text in DashboardClient
  - [ ] 3.1 Import `useTranslations` hook if not already present
  - [ ] 3.2 Replace "Cześć" with translation key (line 93)
  - [ ] 3.3 Replace vacation balance text with translation key (lines 107-108)
  - [ ] 3.4 Replace custom balance badge text with translation key (line 114)
  - [ ] 3.5 Replace leave requests card text with translation keys (lines 156-168)
  - [ ] 3.6 Verify all translations render correctly

- [ ] 4. Replace Hardcoded Polish Text in CurrentDayCard
  - [ ] 4.1 Add `useTranslations('dashboard')` hook to CurrentDayCard.tsx
  - [ ] 4.2 Update props interface to accept translation keys
  - [ ] 4.3 Pass translation keys from parent component
  - [ ] 4.4 Test rendering with both Polish and English locales

- [ ] 5. Replace Hardcoded Polish Text in BirthdayCard
  - [ ] 5.1 Add `useTranslations('dashboard')` hook to BirthdayCard.tsx
  - [ ] 5.2 Replace hardcoded "Najbliższe urodziny" (line 23)
  - [ ] 5.3 Replace hardcoded "Brak urodzin w tym miesiącu" (line 27)
  - [ ] 5.4 Test rendering with both locales

- [ ] 6. Replace Hardcoded Polish Text in TeamCard
  - [ ] 6.1 Add `useTranslations('dashboard')` hook to TeamCard.tsx
  - [ ] 6.2 Replace "Twój zespół" with translation key (line 74)
  - [ ] 6.3 Replace team filter dropdown labels (lines 86, 95, 103)
  - [ ] 6.4 Replace "Nieobecni" section header (line 117)
  - [ ] 6.5 Replace "do {date}" format (line 157)
  - [ ] 6.6 Replace "Dziś pracują" section header (line 171)
  - [ ] 6.7 Replace "Brak pracowników w pracy" empty state (line 201)
  - [ ] 6.8 Test all team card scenarios (with/without teams, filters)

- [ ] 7. Optimize Birthday Calculation
  - [ ] 7.1 Create utility function in `lib/utils/birthday.ts`
  - [ ] 7.2 Move `calculateNearestBirthday` logic to utility function
  - [ ] 7.3 Update page.tsx to use utility function
  - [ ] 7.4 Verify birthday calculation accuracy with test cases
  - [ ] 7.5 Verify performance improvement (no calculation on every render)

- [ ] 8. Document Admin Client Security Model
  - [ ] 8.1 Add comprehensive security comment above admin client creation (line 72)
  - [ ] 8.2 Document team scope filtering rationale
  - [ ] 8.3 Add TODO comment for future RLS policy enhancement
  - [ ] 8.4 Verify comments are clear and helpful for future developers

- [ ] 9. Clean Up Last Update Info Code
  - [ ] 9.1 Remove commented-out props from DashboardClient (page.tsx lines 208-212)
  - [ ] 9.2 Remove optional props from DashboardCalendar interface (lines 25-27)
  - [ ] 9.3 Remove conditional rendering block in DashboardCalendar (lines 129-135)
  - [ ] 9.4 Remove separator before last update section (line 126)
  - [ ] 9.5 Test calendar card renders correctly without last update info

- [ ] 10. Final Testing and Verification
  - [ ] 10.1 Test dashboard with admin role account
  - [ ] 10.2 Test dashboard with manager role account
  - [ ] 10.3 Test dashboard with user role account
  - [ ] 10.4 Test with Polish locale (pl)
  - [ ] 10.5 Test with English locale (en)
  - [ ] 10.6 Verify all cards render correctly
  - [ ] 10.7 Verify leave requests card visibility is role-based
  - [ ] 10.8 Verify birthday calculation is optimized
  - [ ] 10.9 Run any existing tests
  - [ ] 10.10 Verify no console errors or warnings
