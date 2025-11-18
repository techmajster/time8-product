# Manual QA Checklist: Work Schedule Configuration

> Spec: Tryby pracy — Settings & Calendar Sync
> Created: 2025-11-18
> Status: Ready for QA

## Overview
This checklist covers manual testing of the work schedule configuration feature, including working days editor, work hours editor, and calendar integration.

## Test Environment Setup

### Prerequisites
- [ ] Development server running (`npm run dev`)
- [ ] Logged in as admin user
- [ ] Organization with default settings (Mon-Fri, 09:00-17:00, holidays excluded)
- [ ] Browser console open for error monitoring
- [ ] Network tab open to verify API calls

---

## Section 1: Working Days Configuration

### Test 1.1: Access Working Days Editor
**Steps:**
1. Navigate to Settings → Tryb pracy
2. Locate "Dni pracujące" card
3. Click "Edytuj" button

**Expected:**
- [ ] Sheet opens from right side
- [ ] Sheet title: "Dni pracujące"
- [ ] All 7 weekday chips displayed (Pon, Wt, Śr, Czw, Pt, Sob, Niedz)
- [ ] Monday-Friday chips are highlighted (selected)
- [ ] Saturday and Sunday chips are not highlighted
- [ ] "Wolne święta państwowe" toggle is checked
- [ ] Cancel button is present
- [ ] Save button is present and disabled

### Test 1.2: Toggle Working Days
**Steps:**
1. Click on "Sob" (Saturday) chip
2. Observe chip state
3. Click "Sob" again

**Expected:**
- [ ] First click: Saturday chip becomes highlighted/selected
- [ ] Save button becomes enabled
- [ ] Second click: Saturday chip becomes unhighlighted
- [ ] Save button remains enabled (change detected)

### Test 1.3: Select All Days
**Steps:**
1. Click to select all 7 days (if not already selected)

**Expected:**
- [ ] All day chips are highlighted
- [ ] Save button is enabled
- [ ] No visual errors or overlaps

### Test 1.4: Try to Deselect All Days
**Steps:**
1. Try to deselect all working days (click all selected days)

**Expected:**
- [ ] Save button should remain disabled OR
- [ ] Validation should prevent saving with 0 working days

### Test 1.5: Toggle Holiday Exclusion
**Steps:**
1. Click the "Wolne święta państwowe" toggle
2. Observe toggle state
3. Click toggle again

**Expected:**
- [ ] First click: Toggle becomes unchecked
- [ ] Save button becomes enabled
- [ ] Second click: Toggle becomes checked again
- [ ] Visual state updates smoothly

### Test 1.6: Cancel Changes
**Steps:**
1. Change working days (select Saturday)
2. Click "Anuluj"
3. Reopen the sheet

**Expected:**
- [ ] Sheet closes
- [ ] No API call is made (check network tab)
- [ ] When reopened, original settings are shown (Saturday not selected)

### Test 1.7: Save Working Days Changes
**Steps:**
1. Select Saturday and Sunday
2. Click "Zapisz"
3. Wait for save to complete
4. Observe summary card

**Expected:**
- [ ] Loading indicator shows on Save button
- [ ] Network request to `/api/admin/settings/work-mode`
- [ ] Success toast notification appears
- [ ] Sheet closes automatically
- [ ] Summary card updates to show 7 working days
- [ ] Saturday and Sunday chips now appear in summary

### Test 1.8: Save Holiday Toggle Change
**Steps:**
1. Open working days sheet
2. Toggle "Wolne święta państwowe" to off
3. Click "Zapisz"

**Expected:**
- [ ] Save completes successfully
- [ ] Summary card updates to show "Święta państwowe są dniami pracującymi" or similar text
- [ ] No errors in console

---

## Section 2: Work Hours Configuration

### Test 2.1: Access Work Hours Editor
**Steps:**
1. Navigate to Settings → Tryb pracy
2. Locate "Godziny pracy" card
3. Click "Edytuj" button

**Expected:**
- [ ] Sheet opens from right side
- [ ] Sheet title: "Godziny pracy"
- [ ] "Praca codzienna" radio option is selected
- [ ] "Praca według grafiku" radio option is visible (may be disabled/preview)
- [ ] Two time select inputs are visible (Od, Do)
- [ ] Start time shows current value (e.g., "09:00")
- [ ] End time shows current value (e.g., "17:00")
- [ ] Save button is disabled

### Test 2.2: Change Daily Start Time
**Steps:**
1. Click on start time select ("Od")
2. Select "08:30"
3. Observe button state

**Expected:**
- [ ] Dropdown shows times in 15-minute increments
- [ ] Selected time updates to "08:30"
- [ ] Save button becomes enabled
- [ ] No visual glitches

### Test 2.3: Change Daily End Time
**Steps:**
1. Click on end time select ("Do")
2. Select "16:45"

**Expected:**
- [ ] Dropdown shows times in 15-minute increments
- [ ] Selected time updates to "16:45"
- [ ] Save button remains enabled

### Test 2.4: Try Invalid Time Range
**Steps:**
1. Set start time to "16:00"
2. Set end time to "15:00" (before start time)
3. Try to save

**Expected:**
- [ ] Save button should be disabled OR
- [ ] Error message appears OR
- [ ] API returns validation error
- [ ] No data is saved with invalid range

### Test 2.5: Save Work Hours
**Steps:**
1. Set valid times (e.g., 08:30 - 17:00)
2. Click "Zapisz"
3. Wait for save completion

**Expected:**
- [ ] Loading indicator on Save button
- [ ] Network request to `/api/admin/settings/work-mode`
- [ ] Success toast appears
- [ ] Sheet closes
- [ ] Summary card shows new hours "08:30 - 17:00"

### Test 2.6: Multi-Shift Mode Preview
**Steps:**
1. Click "Praca według grafiku" radio button
2. Observe UI changes

**Expected:**
- [ ] Shift mode UI appears (even if disabled)
- [ ] Shift count selector (1, 2, 3) is visible
- [ ] Shift rows may show with "Wkrótce" badge OR
- [ ] Save is disabled with message about upcoming feature
- [ ] No console errors

---

## Section 3: Calendar Integration - Dashboard

### Test 3.1: Dashboard Current Day Card - Working Day
**Setup:** Ensure today is a working day
**Steps:**
1. Navigate to /dashboard
2. Observe "Current Day" card

**Expected:**
- [ ] Card shows current date
- [ ] Work hours are displayed (e.g., "08:30 - 17:00")
- [ ] Hours match the configured hours in settings
- [ ] No "Nie pracujemy" message

### Test 3.2: Dashboard Current Day Card - Non-Working Day
**Setup:** Configure organization to NOT work on current weekday
**Steps:**
1. Go to Settings → Tryb pracy → Dni pracujące
2. Deselect today's weekday
3. Save
4. Navigate to /dashboard

**Expected:**
- [ ] Card shows "Nie pracujemy"
- [ ] Hours section shows "—" or is empty
- [ ] Visual styling indicates non-working day

### Test 3.3: Dashboard Calendar - Working Days
**Steps:**
1. On /dashboard, view the monthly calendar widget
2. Observe different days

**Expected:**
- [ ] Working days show work hours (e.g., "09:00 - 17:00")
- [ ] Non-working days show "Niepracujący"
- [ ] Weekend days (if not in working_days) show "Niepracujący"
- [ ] Custom work hours from settings are displayed

---

## Section 4: Calendar Integration - Full Calendar

### Test 4.1: Calendar Grid - Working Days Display
**Steps:**
1. Navigate to /calendar
2. View current month
3. Examine each day cell

**Expected:**
- [ ] Working days display configured work hours
- [ ] Non-working days display "Niepracujący"
- [ ] Hours match settings (e.g., "08:30 - 17:00" if customized)
- [ ] Consistent formatting across all days

### Test 4.2: Calendar - Holiday with Exclusion ON
**Setup:** Ensure `exclude_public_holidays` is true
**Steps:**
1. Find a day that is both a working day AND a public holiday
2. Observe calendar cell

**Expected:**
- [ ] Holiday name is displayed (e.g., "Boże Narodzenie")
- [ ] Cell is styled as non-working/holiday
- [ ] Work hours are NOT shown
- [ ] Background color indicates holiday

### Test 4.3: Calendar - Holiday with Exclusion OFF
**Setup:** Turn off "Wolne święta państwowe" in settings
**Steps:**
1. Go to Settings → Dni pracujące
2. Uncheck "Wolne święta państwowe"
3. Save
4. Navigate to /calendar
5. Find a working day that is a public holiday

**Expected:**
- [ ] Work hours are displayed (e.g., "09:00 - 17:00")
- [ ] Cell is styled as a working day
- [ ] Holiday name may be shown but day is treated as working
- [ ] Background color indicates working day

### Test 4.4: Calendar - Weekend Not in Working Days
**Steps:**
1. Ensure Saturday/Sunday are NOT in working_days
2. View calendar

**Expected:**
- [ ] Saturday shows "Niepracujący"
- [ ] Sunday shows "Niepracujący"
- [ ] Weekend styling is applied

### Test 4.5: Calendar - Weekend in Working Days
**Steps:**
1. Add Saturday to working_days
2. Save
3. View calendar

**Expected:**
- [ ] Saturday now shows work hours
- [ ] Saturday is styled as a working day
- [ ] No "Niepracujący" message on Saturday
- [ ] Sunday still shows "Niepracujący" (if not added)

### Test 4.6: Calendar - Custom Work Hours Reflected
**Steps:**
1. Change work hours to 07:00 - 15:00
2. Save
3. View calendar

**Expected:**
- [ ] All working days show "07:00 - 15:00"
- [ ] No days still show old hours (09:00 - 17:00)
- [ ] Update is immediate/optimistic

---

## Section 5: Data Persistence & API

### Test 5.1: Settings Persist Across Sessions
**Steps:**
1. Configure custom working days (e.g., Mon-Sat)
2. Configure custom hours (e.g., 08:00 - 16:00)
3. Log out
4. Log back in
5. Navigate to Settings → Tryb pracy

**Expected:**
- [ ] Custom working days are still selected
- [ ] Custom hours are still shown
- [ ] Holiday toggle state is preserved
- [ ] No reset to defaults

### Test 5.2: API Error Handling - Invalid Payload
**Steps:**
1. Open browser console
2. Manually call API with invalid data (or trigger validation error)

**Expected:**
- [ ] API returns 400 or 422 status
- [ ] Error message is descriptive
- [ ] UI shows error toast or message
- [ ] Data is not saved
- [ ] No console errors beyond expected validation error

### Test 5.3: API Success Response
**Steps:**
1. Change working days
2. Save
3. Check network response

**Expected:**
- [ ] API returns 200 status
- [ ] Response includes updated organization data
- [ ] Response includes all new fields (exclude_public_holidays, daily_start_time, etc.)
- [ ] Client state updates from response

---

## Section 6: Edge Cases & Boundary Testing

### Test 6.1: Single Working Day
**Steps:**
1. Select only one working day (e.g., Wednesday)
2. Save
3. View calendar

**Expected:**
- [ ] Only Wednesday shows work hours
- [ ] All other days show "Niepracujący"
- [ ] No errors or crashes

### Test 6.2: All Seven Days Working
**Steps:**
1. Select all 7 days as working days
2. Save
3. View calendar

**Expected:**
- [ ] All days show work hours
- [ ] No "Niepracujący" on any day
- [ ] Weekends are treated as working days

### Test 6.3: Midnight to Noon Hours
**Steps:**
1. Set hours to 00:00 - 12:00
2. Save
3. View calendar

**Expected:**
- [ ] Hours display correctly as "00:00 - 12:00"
- [ ] No formatting issues
- [ ] Validation accepts this range

### Test 6.4: Late Night Shift
**Steps:**
1. Set hours to 22:00 - 23:59
2. Save
3. View calendar

**Expected:**
- [ ] Hours display correctly
- [ ] No errors or validation issues
- [ ] Calendar shows this time range

### Test 6.5: Rapid Toggle Changes
**Steps:**
1. Open working days sheet
2. Rapidly click multiple day chips
3. Rapidly toggle holiday switch multiple times
4. Save

**Expected:**
- [ ] UI remains responsive
- [ ] Final state is correctly saved
- [ ] No race conditions or duplicate saves

---

## Section 7: Visual & UX Testing

### Test 7.1: Mobile Responsiveness - Working Days Sheet
**Steps:**
1. Open on mobile device or resize browser to mobile width
2. Open working days sheet

**Expected:**
- [ ] Sheet is responsive and usable
- [ ] Day chips are properly sized and tappable
- [ ] Toggle switch is accessible
- [ ] Buttons are properly positioned

### Test 7.2: Mobile Responsiveness - Work Hours Sheet
**Steps:**
1. Open work hours sheet on mobile

**Expected:**
- [ ] Time selects are usable
- [ ] Dropdowns display correctly
- [ ] Sheet doesn't overflow screen
- [ ] Save/Cancel buttons are accessible

### Test 7.3: Loading States
**Steps:**
1. Slow down network (use browser dev tools throttling)
2. Make a change and save

**Expected:**
- [ ] Loading spinner appears on Save button
- [ ] Save button is disabled during save
- [ ] User cannot close sheet during save
- [ ] Success state shows after completion

### Test 7.4: Keyboard Navigation
**Steps:**
1. Use Tab key to navigate through working days sheet
2. Use keyboard to toggle days and switch

**Expected:**
- [ ] Focus indicators are visible
- [ ] All interactive elements are keyboard accessible
- [ ] Enter/Space can toggle days
- [ ] Escape closes sheet

---

## Section 8: Regression Testing

### Test 8.1: Organizations with Defaults
**Setup:** New organization that never changed settings
**Steps:**
1. View calendar for this organization

**Expected:**
- [ ] Monday-Friday show work hours
- [ ] Weekend shows "Niepracujący"
- [ ] Hours are 09:00 - 17:00 (default)
- [ ] Holidays are excluded by default

### Test 8.2: Existing Leave Requests
**Steps:**
1. Ensure there are existing approved leave requests
2. Change working days/hours
3. View calendar with those leave requests

**Expected:**
- [ ] Leave requests still display correctly
- [ ] Leave takes precedence over work hour display
- [ ] No data corruption or lost leave requests

### Test 8.3: Multi-Organization Support
**Setup:** User belongs to multiple organizations
**Steps:**
1. Configure different settings for Org A (Mon-Fri, 09:00-17:00)
2. Configure different settings for Org B (Mon-Sat, 08:00-16:00)
3. Switch between organizations

**Expected:**
- [ ] Each org shows its own settings
- [ ] No cross-contamination of settings
- [ ] Calendar reflects current organization's settings

---

## Test Summary

### Test Execution
- Total Test Cases: ~40+
- Date Tested: _______________
- Tested By: _______________
- Environment: _______________

### Pass/Fail Summary
- [ ] All Critical Tests Passed
- [ ] Minor Issues Found (document below)
- [ ] Major Issues Found (document below)

### Issues Found
| Test # | Description | Severity | Status |
|--------|-------------|----------|--------|
|        |             |          |        |
|        |             |          |        |

### Sign-Off
- [ ] All tests completed
- [ ] Issues logged
- [ ] Ready for production

**QA Engineer:** _______________
**Date:** _______________
**Signature:** _______________
