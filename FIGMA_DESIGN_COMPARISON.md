# Figma Design Comparison - Leave Request Sheets

## Overview
This document compares the current implementation with the new Figma designs for all leave request management sheets.

---

## 1. AddAbsenceSheet (Admin Creates for Employee)

### Figma Design: [26119-71080](https://www.figma.com/design/Xb0VKGqH8b7w6nXW3HoacI/time8.io?node-id=26119-71080)

### Current Implementation
**File:** [components/AddAbsenceSheet.tsx](components/AddAbsenceSheet.tsx)

### Key Differences

#### **Layout & Structure**
| Current | Figma Design | Change Required |
|---------|-------------|-----------------|
| Title: "Dodaj nieobecność" | Title: "Dodaj urlop" | ✅ Update title text |
| Description: "Dodaj nieobecność dla wybranego pracownika..." | No description | ❌ Remove SheetDescription |
| Footer buttons left-aligned | Footer: "Anuluj" (left), "Dodaj urlop" (right) | ✅ Re-arrange button layout |

#### **Employee Selector**
| Current | Figma Design | Change Required |
|---------|-------------|-----------------|
| DropdownMenu with avatar + name + email | Same pattern - Avatar (40px) + Full name + Email below | ✅ Already matches |
| Label: "Wybierz pracownika" | Label: "Wybierz pracownika" | ✅ Matches |

#### **Leave Type Selector**
| Current | Figma Design | Change Required |
|---------|-------------|-----------------|
| Shows leave type name + balance ("Dostępne X dni") | Shows "Wypoczynkowy" with "Dostępne 25 dni" below | ✅ Already matches pattern |
| Label: "Jaki typ nieobecności" | Label: "Jaki urlop chcesz wykorzystać" | ✅ Update label text |

#### **Date Picker**
| Current | Figma Design | Change Required |
|---------|-------------|-----------------|
| DateRangePicker component | Calendar icon + formatted date range | ✅ Verify icon and format match |
| Label: "Termin nieobecności" | Label: "Termin urlopu" | ✅ Update label |
| Shows calculated days below | No visible days counter in design | ⚠️ Keep for UX - not visible in static design |

#### **Balance Summary Cards**
| Current | Figma Design | Change Required |
|---------|-------------|-----------------|
| 3 cards in grid: Dostępny, Wnioskowany, Pozostanie | Same 3-card layout with identical labels | ✅ Already matches |
| Cards have border and padding | Same styling in design | ✅ Matches |

#### **Overlap Warning**
| Current | Figma Design | Change Required |
|---------|-------------|-----------------|
| Amber background card with user list | Identical amber (#fef3c7) background | ✅ Matches |
| Shows avatar + name + email + leave type + end date | Same layout pattern | ✅ Matches |
| Label: "W tym terminie również planują urlop:" | Same label | ✅ Matches |

#### **Description/Notes Textarea**
| Current | Figma Design | Change Required |
|---------|-------------|-----------------|
| Label: "Chcesz coś dodać?" | Same label | ✅ Matches |
| Placeholder: "Dodatkowe informacje" | Placeholder: "Dodatkowe informacje" | ✅ Matches |
| Min height: 60px | Min height: 126px in design | ✅ Adjust textarea height |

#### **Footer Buttons**
| Current | Figma Design | Change Required |
|---------|-------------|-----------------|
| "Zamknij" (left), "Dodaj nieobecność" (right) | "Anuluj" (left), "Dodaj urlop" (right) | ✅ Update button text |
| Both size="sm" | h-9 (36px) in design | ✅ Verify height matches |

#### **Close Icon**
| Current | Figma Design | Change Required |
|---------|-------------|-----------------|
| No visible close icon in header | X icon button in top-right corner | ❌ **MISSING** - Add close icon button |

---

## 2. LeaveRequestDetailsSheet (View/Approve/Reject - Pending Status)

### Figma Design: [26098-55453](https://www.figma.com/design/Xb0VKGqH8b7w6nXW3HoacI/time8.io?node-id=26098-55453)

### Current Implementation
**File:** [app/leave-requests/components/LeaveRequestDetailsSheet.tsx](app/leave-requests/components/LeaveRequestDetailsSheet.tsx)

### Key Differences

#### **Layout & Structure**
| Current | Figma Design | Change Required |
|---------|-------------|-----------------|
| Title: "Wniosek o urlop" | Same | ✅ Matches |
| Single column layout | Same | ✅ Matches |

#### **Requester Section (Wnioskujący)**
| Current | Figma Design | Change Required |
|---------|-------------|-----------------|
| NOT VISIBLE in current design | ⭐ **NEW SECTION** - Avatar + Full Name + Email at top | ❌ **MISSING** - Add requester section |
| Shows in conflicting leaves only | Should be first section after header | ✅ Move to top |

#### **Status Badge**
| Current | Figma Design | Change Required |
|---------|-------------|-----------------|
| Shows "Oczekujący" as text | Badge with "Nowy" in purple (#7c3aed) background | ✅ Add Badge component |
| No badge styling | Badge with rounded corners + padding | ✅ Style as badge |
| Color based on status | Purple for pending ("Nowy") | ✅ Add status colors |

#### **Leave Type**
| Current | Figma Design | Change Required |
|---------|-------------|-----------------|
| Label + large text (20px semibold) | Same pattern | ✅ Matches |
| "Rodzaj urlopu" → "Wypoczynkowy" | Same | ✅ Matches |

#### **Leave Period (Termin urlopu)**
| Current | Figma Design | Change Required |
|---------|-------------|-----------------|
| Date range in one row | Same | ✅ Matches |
| Format: "DD.MM.YYYY - DD.MM.YYYY" | Format: "13.07. 2025 - 20.07. 2025" | ⚠️ Verify date format spacing |
| Separate "Długość urlopu" section | **REMOVED** in new design | ❌ Remove separate duration section |

#### **Balance Summary Cards**
| Current | Figma Design | Change Required |
|---------|-------------|-----------------|
| NOT VISIBLE in details view | ⭐ **NEW** - 3 cards showing Dostępny, Wnioskowany, Pozostanie | ❌ **MISSING** - Add balance cards |
| Only in edit/create sheets | Should show in details view too | ✅ Add to details |

#### **Conflicting Leaves**
| Current | Figma Design | Change Required |
|---------|-------------|-----------------|
| Shows in info card | Same amber background card | ✅ Matches |
| Label: "W tym terminie urlop planują" | Label: "W tym terminie również planują urlop:" | ✅ Update label text |

#### **Description**
| Current | Figma Design | Change Required |
|---------|-------------|-----------------|
| Shows reason if present | Same | ✅ Matches |
| Falls back to "Brak opisu" | Shows lorem ipsum text in design | ✅ Keep fallback logic |

#### **Separator Before Footer**
| Current | Figma Design | Change Required |
|---------|-------------|-----------------|
| No separator | ⭐ Separator line above "Data złożenia wniosku" | ❌ **MISSING** - Add separator |

#### **Created Date**
| Current | Figma Design | Change Required |
|---------|-------------|-----------------|
| Shows in content area | Moved to bottom section after separator | ✅ Move to bottom |
| Format: "DD Month YYYY HH:MM" | Format: "15 Czerwiec 2025 12:00" | ✅ Verify format |

#### **Footer Buttons**
| Current | Figma Design | Change Required |
|---------|-------------|-----------------|
| "Odrzuć wniosek" (outline), "Zaakceptuj wniosek" (primary) | Red destructive button for "Odrzuć wniosek" (#dc2626) | ✅ Change reject button to red |
| Both on right side | Both on right side | ✅ Matches |
| Edit button on left (if owner) | NOT visible in pending status design | ⚠️ Conditional - only for approved |

---

## 3. RejectLeaveRequestSheet (Reject Dialog)

### Figma Design: [26098-55699](https://www.figma.com/design/Xb0VKGqH8b7w6nXW3HoacI/time8.io?node-id=26098-55699)

### Current Implementation
**File:** Uses `RejectLeaveRequestDialog` component (AlertDialog)

### Key Differences

#### **⚠️ MAJOR CHANGE: Dialog → Sheet**
| Current | Figma Design | Change Required |
|---------|-------------|-----------------|
| AlertDialog component | **Full Sheet** (same as details sheet) | ❌ **BREAKING** - Convert from Dialog to Sheet |
| Modal overlay | Side sheet overlay | ✅ Complete redesign |

#### **Layout & Structure**
| Current | Figma Design | Change Required |
|---------|-------------|-----------------|
| Dialog title: "Anulować wniosek urlopowy?" | Sheet title: "Odrzuć wniosek o urlop" | ✅ Update title |
| Description text | No description | ❌ Remove description |

#### **Requester Section**
| Current | Figma Design | Change Required |
|---------|-------------|-----------------|
| Shows in description text | ⭐ Full section with Avatar + Name + Email | ❌ **MISSING** - Add requester section |

#### **Leave Details**
| Current | Figma Design | Change Required |
|---------|-------------|-----------------|
| NOT visible | Shows "Rodzaj urlopu" + "Termin urlopu" | ❌ **MISSING** - Add leave details |
| Only shows in parent sheet | Must display in reject sheet | ✅ Add sections |

#### **Rejection Reason**
| Current | Figma Design | Change Required |
|---------|-------------|-----------------|
| Textarea with label "Powód anulowania (opcjonalnie)" | **Large heading** "Uzasadnienie odrzucenia wniosku" + Textarea below | ✅ Update label styling |
| Optional field | Appears required in design (large heading) | ⚠️ Clarify if required |
| Placeholder: "Opisz powód anulowania..." | Placeholder: "Wpisz uzasadnienie" | ✅ Update placeholder |

#### **Footer Buttons**
| Current | Figma Design | Change Required |
|---------|-------------|-----------------|
| "Nie anuluj", "Tak, anuluj wniosek" | "Anuluj", "Odrzuć wniosek" | ✅ Update button text |
| AlertDialog footer | Sheet footer | ✅ Convert to sheet footer |

---

## 4. LeaveRequestDetailsSheet (Approved Status - Read Only)

### Figma Design: [26098-55557](https://www.figma.com/design/Xb0VKGqH8b7w6nXW3HoacI/time8.io?node-id=26098-55557)

### Current Implementation
**File:** Same component, different state

### Key Differences

#### **Status Badge**
| Current | Figma Design | Change Required |
|---------|-------------|-----------------|
| Shows "Zaakceptowany" as text | Badge with "Zaakceptowany" in green (#16a34a) background | ✅ Update badge color |
| No color coding | Green badge for approved | ✅ Add green badge |

#### **Footer Buttons**
| Current | Figma Design | Change Required |
|---------|-------------|-----------------|
| Shows approve/reject if pending | "Edytuj wniosek" (left), "Zamknij" (right) | ✅ Update for approved status |
| No edit button for approved (admin) | Show edit button for admin/manager | ✅ Add edit permission |

#### **All Other Sections**
| Current | Figma Design | Change Required |
|---------|-------------|-----------------|
| Same as pending view | Identical layout | ✅ Matches |

---

## 5. EditLeaveRequestSheet (Edit Approved Request)

### Figma Design: [26098-123108](https://www.figma.com/design/Xb0VKGqH8b7w6nXW3HoacI/time8.io?node-id=26098-123108)

### Current Implementation
**File:** [components/EditLeaveRequestSheet.tsx](components/EditLeaveRequestSheet.tsx)

### Key Differences

#### **Layout & Structure**
| Current | Figma Design | Change Required |
|---------|-------------|-----------------|
| Title: "Edytuj wniosek urlopowy" | Title: "Edycja wniosku" | ✅ Update title (shorter) |

#### **Requester Section**
| Current | Figma Design | Change Required |
|---------|-------------|-----------------|
| NOT visible (assumes current user) | ⭐ Shows Avatar + Name + Email (read-only) | ❌ **MISSING** - Add requester section for admin view |

#### **Leave Type Selector**
| Current | Figma Design | Change Required |
|---------|-------------|-----------------|
| Label: "Jaki urlop chcesz wykorzystać" | Label: "Rodzaj urlopu" | ✅ Update label (simpler) |
| Dropdown with balance | Same | ✅ Matches |

#### **Date Picker**
| Current | Figma Design | Change Required |
|---------|-------------|-----------------|
| Label: "Termin urlopu" | Same | ✅ Matches |

#### **Description Textarea**
| Current | Figma Design | Change Required |
|---------|-------------|-----------------|
| Label: "Chcesz coś dodać?" | Label: "Opis" | ✅ Update label |
| Shows as editable textarea | Shows filled state with lorem ipsum | ✅ Matches (filled state) |
| Min height: 126px | Same height in design | ✅ Matches |

#### **Footer Buttons** ⭐ **MAJOR CHANGE**
| Current | Figma Design | Change Required |
|---------|-------------|-----------------|
| Cancel dialog on left | "Anuluj" button on **far left** | ✅ Matches |
| Update button on right | **TWO buttons on right**: "Usuń wniosek" (red) + "Zapisz zmiany" (purple) | ❌ **MISSING** - Add delete button |
| Delete via AlertDialog | Delete button directly in footer | ✅ Change to inline button |

#### **Delete Button Styling**
| Current | Figma Design | Change Required |
|---------|-------------|-----------------|
| Trash icon + "Anuluj wniosek" in AlertDialog | Red button (#dc2626) with text "Usuń wniosek" | ✅ Update to red destructive button |
| Shows AlertDialog on click | Should show confirmation (dialog or sheet?) | ⚠️ **QUESTION**: Keep AlertDialog or use Sheet? |

---

## Summary of Major Changes Required

### ❌ **Missing Components** (High Priority)

1. **Requester Section** - Must add to:
   - LeaveRequestDetailsSheet (all statuses)
   - EditLeaveRequestSheet (admin view)
   - RejectLeaveRequestSheet

2. **Status Badges** - Replace text with colored badges:
   - Purple (#7c3aed) for "Nowy" (pending)
   - Green (#16a34a) for "Zaakceptowany" (approved)
   - Red for "Odrzucony" (rejected)
   - Gray for "Anulowany" (cancelled)

3. **Balance Cards in Details View** - Add 3-card summary to LeaveRequestDetailsSheet

4. **Delete Button in Edit Sheet** - Add "Usuń wniosek" red button to footer

5. **Close Icon** - Add X button in top-right corner of all sheets

6. **Convert Reject Dialog to Sheet** - Major redesign from AlertDialog to full Sheet

### ✅ **Text Updates** (Medium Priority)

1. AddAbsenceSheet:
   - Title: "Dodaj nieobecność" → "Dodaj urlop"
   - Leave type label: "Jaki typ nieobecności" → "Jaki urlop chcesz wykorzystać"
   - Date label: "Termin nieobecności" → "Termin urlopu"
   - Button: "Dodaj nieobecność" → "Dodaj urlop"
   - Button: "Zamknij" → "Anuluj"

2. EditLeaveRequestSheet:
   - Title: "Edytuj wniosek urlopowy" → "Edycja wniosku"
   - Leave type label: "Jaki urlop chcesz wykorzystać" → "Rodzaj urlopu"
   - Description label: "Chcesz coś dodać?" → "Opis"
   - Button: "Zaktualizuj wniosek" → "Zapisz zmiany"

3. RejectLeaveRequestSheet:
   - Title: "Anulować wniosek urlopowy?" → "Odrzuć wniosek o urlop"
   - Section heading: Add "Uzasadnienie odrzucenia wniosku"
   - Button: "Tak, anuluj wniosek" → "Odrzuć wniosek"

### ⚠️ **Styling Updates** (Low Priority)

1. Button heights: Verify all buttons are h-9 (36px)
2. Textarea height: Increase from 60px to 126px
3. Red destructive buttons: Use #dc2626 for reject/delete actions
4. Date format: Verify spacing matches "DD.MM. YYYY"
5. Separator lines: Add before footer sections where shown

---

## Questions for Clarification

### 🔴 **Critical Questions**

1. **Delete Confirmation**: When user clicks "Usuń wniosek" in Edit sheet, should we:
   - Show AlertDialog (current pattern)?
   - Show another Sheet (matching new design system)?
   - Show inline confirmation?

2. **Requester Section Access**: Should requester section show:
   - Always (even for own requests)?
   - Only for admin/manager viewing others' requests?
   - Different styling for own vs others?

3. **Balance Cards Visibility**: In LeaveRequestDetailsSheet, should balance cards show:
   - For all leave types?
   - Only for types with balance tracking?
   - Only for pending status?

### 🟡 **Medium Priority Questions**

4. **Rejection Reason**: Is "Uzasadnienie odrzucenia wniosku" required or optional?
   - Current: Optional
   - Design: Large heading suggests required

5. **Edit Sheet Access**: Can admin/manager edit approved requests?
   - Current: Only pending/cancelled by employee
   - Design shows: Edit button for approved status

6. **Status Badge Colors**: What colors for all statuses?
   - Pending: Purple #7c3aed ✅
   - Approved: Green #16a34a ✅
   - Rejected: Red #???
   - Cancelled: Gray #???
   - Completed: ??? (new status in types)

### 🟢 **Low Priority Questions**

7. **Close Icon Behavior**: Should close icon (X):
   - Just close sheet?
   - Prompt "unsaved changes" warning in edit mode?

8. **Toast Position**: Designs mention "toast in right bottom corner"
   - Current implementation uses sonner (top-right)
   - Should we move to bottom-right?

---

## Implementation Priority

### Phase 1: Critical (Breaking Changes)
1. Convert RejectLeaveRequestSheet from Dialog to Sheet
2. Add Status Badge component
3. Add Requester section to all sheets

### Phase 2: High Priority (Missing Features)
4. Add Balance Cards to LeaveRequestDetailsSheet
5. Add Delete button to EditLeaveRequestSheet footer
6. Add Close icon (X) to all sheet headers

### Phase 3: Medium Priority (Text & Layout)
7. Update all button text labels
8. Update field labels
9. Move "Data złożenia wniosku" to bottom section
10. Remove separate "Długość urlopu" section

### Phase 4: Low Priority (Polish)
11. Verify button heights (h-9)
12. Verify textarea heights (126px)
13. Verify date formats
14. Add separator lines
15. Update destructive button colors

---

## Files That Need Changes

### 🔴 Major Refactoring Required
1. [app/leave-requests/components/LeaveRequestDetailsSheet.tsx](app/leave-requests/components/LeaveRequestDetailsSheet.tsx)
2. [components/EditLeaveRequestSheet.tsx](components/EditLeaveRequestSheet.tsx)
3. Create new `RejectLeaveRequestSheet.tsx` (currently using Dialog)

### 🟡 Moderate Changes
4. [components/AddAbsenceSheet.tsx](components/AddAbsenceSheet.tsx)
5. Create new `StatusBadge.tsx` component
6. Create new `RequesterSection.tsx` component

### 🟢 Minor Changes
7. Update button text across all sheets
8. Update labels across all sheets

---

## Next Steps Recommendation

Would you like me to:

1. **Create detailed component specs** for the new components (StatusBadge, RequesterSection)?
2. **Start with Phase 1** (Convert Reject Dialog to Sheet)?
3. **Create a unified design system** for all sheet components first?
4. **Answer the critical questions** before proceeding?

The most efficient approach would be to first clarify the critical questions, then create the shared components (StatusBadge, RequesterSection), and finally update each sheet systematically.
