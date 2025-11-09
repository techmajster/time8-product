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

- [ ] 4. Enhance Group Details Sheet with Member List
  - [ ] 4.1 Create API endpoint /api/teams/[teamId]/members (GET)
  - [ ] 4.2 Add authorization check (admin/owner only)
  - [ ] 4.3 Fetch team members with user details
  - [ ] 4.4 Add teamMembers state in AdminGroupsView
  - [ ] 4.5 Add loadingMembers state
  - [ ] 4.6 Create fetchTeamMembers function
  - [ ] 4.7 Call fetchTeamMembers when sheet opens
  - [ ] 4.8 Add "Członkowie grupy" section to details sheet
  - [ ] 4.9 Render member list with avatars
  - [ ] 4.10 Add role badges (Kierownik for manager, Pracownik for others)
  - [ ] 4.11 Add loading state with Loader2 spinner
  - [ ] 4.12 Add empty state for groups with no members
  - [ ] 4.13 Match Figma spacing and layout exactly
  - [ ] 4.14 Test with 0, 1, and 10+ members

- [ ] 5. Update Delete Confirmation Dialog
  - [ ] 5.1 Change DialogTitle to "Czy na pewno chcesz usunąć tę grupę?"
  - [ ] 5.2 Update DialogDescription to "Użytkownicy z tej grupy nie będą przypisani do żadnej grupy"
  - [ ] 5.3 Remove member count conditional text
  - [ ] 5.4 Change cancel button text to "Zamknij"
  - [ ] 5.5 Change delete button text to "Usuń"
  - [ ] 5.6 Verify button order: Zamknij (outline) + Usuń (destructive)
  - [ ] 5.7 Match Figma spacing and typography

- [ ] 6. Update Edit Group Sheet
  - [ ] 6.1 Change button text from "Zaktualizuj grupę" to "Zapisz grupę"
  - [ ] 6.2 Verify footer layout matches Figma
  - [ ] 6.3 Confirm button order: Usuń grupę (left) + Anuluj + Zapisz grupę (right)
  - [ ] 6.4 Test edit flow with refetch

- [ ] 7. Polish Add Group Sheet
  - [ ] 7.1 Verify "Dodaj grupę" button text is correct
  - [ ] 7.2 Confirm refetch integration works
  - [ ] 7.3 Test create flow end-to-end
  - [ ] 7.4 Match Figma spacing and layout

- [ ] 8. End-to-End Testing and Verification
  - [ ] 8.1 Test complete create flow: open sheet → fill form → submit → verify refetch
  - [ ] 8.2 Test complete view flow: click row → see details → verify member list
  - [ ] 8.3 Test complete edit flow: details → edit → save → verify refetch
  - [ ] 8.4 Test complete delete flow: open dialog → confirm → verify refetch
  - [ ] 8.5 Test manage members flow: open sheet → add/remove → save → verify refetch
  - [ ] 8.6 Verify N+1 query fixed (check server logs for single query)
  - [ ] 8.7 Test with null manager display
  - [ ] 8.8 Test with empty group (no members)
  - [ ] 8.9 Test with large group (10+ members, verify scroll)
  - [ ] 8.10 Verify all sheets match Figma pixel-perfect
  - [ ] 8.11 Test hover states and transitions
  - [ ] 8.12 Verify no console errors or warnings
