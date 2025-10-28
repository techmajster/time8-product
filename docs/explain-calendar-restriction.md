# Calendar Restriction Feature - How It Works

## Current Status
✅ The switch is saving correctly to the database
✅ The calendar page is reading the setting correctly
✅ The logic is implemented correctly

## Why You're Seeing Everyone's Calendar

The calendar restriction feature works based on **group/team membership**. Currently:

**All users have `team_id: null`** - meaning no one is assigned to any groups.

## The Logic

When restriction is **ON**:
- Users IN a group → see only their group members
- Users NOT in a group → see everyone (fallback behavior)

When restriction is **OFF**:
- Everyone sees everyone

## To Test This Feature

You need to:

1. **Go to Admin → Zarządzanie Zespołem (Team Management)**
2. **Create groups/teams** (e.g., "Development Team", "Marketing Team")
3. **Assign users to groups**
4. **Then test with restriction ON**:
   - Users in groups will only see their group members
   - Users without groups will see everyone

## Example Test Scenario

1. Create "Team A" - assign Szymon and Dajana
2. Create "Team B" - assign Paweł
3. Leave admin@bb8.pl without a group
4. Turn restriction ON
5. Results:
   - Szymon sees: Szymon + Dajana calendars only
   - Dajana sees: Szymon + Dajana calendars only
   - Paweł sees: Paweł calendar only
   - admin@bb8.pl sees: Everyone (because no group = fallback)

The feature is working as designed!
