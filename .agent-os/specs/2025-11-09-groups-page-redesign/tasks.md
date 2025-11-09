# Spec Tasks

## Tasks

- [x] 1. Fix Server-Side N+1 Query and Add Manager Data
  - [x] 1.1 Update page.tsx query to use JOIN for member counts
  - [x] 1.2 Include manager data in query with nested select
  - [x] 1.3 Transform response to include member_count property
  - [x] 1.4 Verify single query in server logs
  - [x] 1.5 Test with org containing 0, 1, and 90+ teams

- [x] 2. Add Manager Column to Main Table
  - [x] 2.1 Add "Kierownik grupy" TableHead between Opis and Liczba pracowników
  - [x] 2.2 Create manager cell component with avatar + name + email
  - [x] 2.3 Handle null manager with "—" placeholder
  - [x] 2.4 Test avatar fallback with initials
  - [x] 2.5 Verify responsive layout and hover states

- [x] 3. Replace Page Reloads with Event-Driven Refetch
  - [x] 3.1 Import refetchTeamManagement from /lib/refetch-events
  - [x] 3.2 Add useEffect listener in AdminGroupsView for refetch events
  - [x] 3.3 Replace window.location.reload() in handleUpdateTeam (line 101)
  - [x] 3.4 Replace window.location.reload() in confirmDeleteTeam (line 136)
  - [x] 3.5 Update CreateTeamSheet to use refetch instead of callback
  - [x] 3.6 Update ManageTeamMembersSheet to use refetch instead of callback
  - [x] 3.7 Test create → refetch flow
  - [x] 3.8 Test edit → refetch flow
  - [x] 3.9 Test delete → refetch flow
  - [x] 3.10 Test manage members → refetch flow
  - [x] 3.11 Verify no page reloads occur (check browser network tab)

- [x] 4. Enhance Group Details Sheet with Member List
  - [x] 4.1 Create API endpoint /api/teams/[teamId]/members (GET)
  - [x] 4.2 Add authorization check (admin/owner only)
  - [x] 4.3 Fetch team members with user details
  - [x] 4.4 Add teamMembers state in AdminGroupsView
  - [x] 4.5 Add loadingMembers state
  - [x] 4.6 Create fetchTeamMembers function
  - [x] 4.7 Call fetchTeamMembers when sheet opens
  - [x] 4.8 Add "Członkowie grupy" section to details sheet
  - [x] 4.9 Render member list with avatars
  - [x] 4.10 Add role badges (Kierownik for manager, Pracownik for others)
  - [x] 4.11 Add loading state with Loader2 spinner
  - [x] 4.12 Add empty state for groups with no members
  - [x] 4.13 Match Figma spacing and layout exactly
  - [x] 4.14 Test with 0, 1, and 10+ members

- [x] 5. Fix Group Management Data Fetching Logic
  - [x] 5.1 Update page.tsx teamMembers query to remove role filter (remove `.in('role', ['manager', 'admin'])`)
  - [x] 5.2 Add `team_id` to the select query in page.tsx
  - [x] 5.3 Change teamMembers mapping to use actual team_id from database (change `team_id: null` to `team_id: userOrg.team_id`)
  - [x] 5.4 Verify database integrity - check existing team members have correct team_id values
  - [x] 5.5 Test group details sheet shows all members (not just 1)
  - [x] 5.6 Test manage members sheet shows manager in "Członkowie grupy" table
  - [x] 5.7 Test manage members sheet shows all available users in "Dostępni" table
  - [x] 5.8 Test adding members persists correctly after save
  - [x] 5.9 Test removing members persists correctly after save

- [x] 5a. Fix Navigation Flow Between Sheets
  - [x] 5a.1 Add origin tracking state to track where manage members sheet was opened from
  - [x] 5a.2 Update openMembersSheet to accept origin parameter ('table' | 'details')
  - [x] 5a.3 Update table dropdown to call openMembersSheet with default 'table' origin
  - [x] 5a.4 Update details sheet button to call openMembersSheet with 'details' origin
  - [x] 5a.5 Implement conditional logic in onOpenChange to only re-open details sheet if origin was 'details'
  - [x] 5a.6 Test navigation: opening from table should not redirect to details on close
  - [x] 5a.7 Test navigation: opening from details should re-open details on close
  - [x] 5a.8 Remove diagnostic logging

- [x] 6. Update Delete Confirmation Dialog
  - [x] 6.1 Change DialogTitle to "Czy na pewno chcesz usunąć tę grupę?"
  - [x] 6.2 Update DialogDescription to "Użytkownicy z tej grupy nie będą przypisani do żadnej grupy"
  - [x] 6.3 Remove member count conditional text
  - [x] 6.4 Change cancel button text to "Zamknij"
  - [x] 6.5 Change delete button text to "Usuń"
  - [x] 6.6 Verify button order: Zamknij (outline) + Usuń (destructive)
  - [x] 6.7 Match Figma spacing and typography

- [x] 7. Update Edit Group Sheet
  - [x] 7.1 Change button text from "Zaktualizuj grupę" to "Zapisz grupę"
  - [x] 7.2 Verify footer layout matches Figma
  - [x] 7.3 Confirm button order: Usuń grupę (left) + Anuluj + Zapisz grupę (right)
  - [x] 7.4 Test edit flow with refetch

- [x] 8. Polish Add Group Sheet
  - [x] 8.1 Verify "Dodaj grupę" button text is correct
  - [x] 8.2 Confirm refetch integration works
  - [x] 8.3 Test create flow end-to-end
  - [x] 8.4 Match Figma spacing and layout

- [ ] 9. End-to-End Testing and Verification
  - [ ] 9.1 Test complete create flow: open sheet → fill form → submit → verify refetch
  - [ ] 9.2 Test complete view flow: click row → see details → verify member list
  - [ ] 9.3 Test complete edit flow: details → edit → save → verify refetch
  - [ ] 9.4 Test complete delete flow: open dialog → confirm → verify refetch
  - [ ] 9.5 Test manage members flow: open sheet → add/remove → save → verify refetch
  - [ ] 9.6 Verify N+1 query fixed (check server logs for single query)
  - [ ] 9.7 Test with null manager display
  - [ ] 9.8 Test with empty group (no members)
  - [ ] 9.9 Test with large group (10+ members, verify scroll)
  - [ ] 9.10 Verify all sheets match Figma pixel-perfect
  - [ ] 9.11 Test hover states and transitions
  - [ ] 9.12 Verify no console errors or warnings
