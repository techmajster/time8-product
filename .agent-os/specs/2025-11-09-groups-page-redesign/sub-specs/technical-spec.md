# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-11-09-groups-page-redesign/spec.md

## Technical Requirements

### 1. Server-Side Data Fetching Optimization

**Current Implementation (N+1 Query Problem):**
```typescript
// File: app/admin/groups/page.tsx
const teams = await getTeams(orgId)
const teamsWithCounts = await Promise.all(
  teams.map(async (team) => {
    const { count } = await supabase
      .from('user_organizations')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', team.id)
    return { ...team, member_count: count || 0 }
  })
)
```

**New Implementation (Single JOIN Query):**
```typescript
// Optimized query with member count aggregation
const { data: teams, error } = await supabase
  .from('teams')
  .select(`
    id,
    name,
    description,
    created_at,
    updated_at,
    organization_id,
    manager:manager_id (
      id,
      full_name,
      email,
      avatar_url,
      role
    ),
    members:user_organizations!team_id (
      count
    )
  `)
  .eq('organization_id', orgId)
  .order('created_at', { ascending: false })

// Transform the count aggregation
const teamsWithCounts = teams?.map(team => ({
  ...team,
  member_count: team.members?.[0]?.count || 0,
  members: undefined // Remove the raw members array
})) || []
```

**Performance Impact:**
- Before: 1 query for teams + N queries for counts (91+ total queries for 90 teams)
- After: 1 query total (99% reduction)
- Expected page load improvement: <100ms vs 800-1200ms

### 2. Manager Column in Main Table

**Component:** `AdminGroupsView.tsx`

**Table Structure Update:**
```tsx
<TableHeader>
  <TableRow>
    <TableHead className="font-medium text-muted-foreground">Nazwa</TableHead>
    <TableHead className="font-medium text-muted-foreground">Opis</TableHead>
    {/* NEW COLUMN */}
    <TableHead className="font-medium text-muted-foreground">Kierownik grupy</TableHead>
    <TableHead className="font-medium text-muted-foreground text-right">Liczba pracowników</TableHead>
    <TableHead className="font-medium text-muted-foreground text-right">Akcje</TableHead>
  </TableRow>
</TableHeader>
```

**Manager Cell Rendering:**
```tsx
<TableCell>
  {team.manager ? (
    <div className="flex items-center gap-3">
      <Avatar className="size-8">
        <AvatarImage src={team.manager.avatar_url || undefined} />
        <AvatarFallback className="text-sm">
          {team.manager.full_name
            ? team.manager.full_name.split(' ').map(n => n[0]).join('').toUpperCase()
            : team.manager.email.charAt(0).toUpperCase()
          }
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col">
        <div className="text-sm font-medium text-foreground leading-5">
          {team.manager.full_name || team.manager.email}
        </div>
        <div className="text-xs text-muted-foreground leading-4">
          {team.manager.email}
        </div>
      </div>
    </div>
  ) : (
    <div className="text-sm text-muted-foreground">—</div>
  )}
</TableCell>
```

### 3. Event-Driven State Management

**Replace All Page Reloads:**

**Before:**
```typescript
// AdminGroupsView.tsx - 3 instances
window.location.reload() // Line 101 - after edit
window.location.reload() // Line 136 - after delete
window.location.reload() // Line 267 - after create

// CreateTeamSheet.tsx
onTeamCreated={() => window.location.reload()}

// ManageTeamMembersSheet.tsx
onTeamUpdated={() => window.location.reload()}
```

**After:**
```typescript
// Import refetch system
import { refetchTeamManagement } from '@/lib/refetch-events'

// Replace all reload calls
refetchTeamManagement()

// AdminGroupsView.tsx - Add listener
useEffect(() => {
  const handleRefetch = () => {
    router.refresh() // Next.js server component refresh
  }

  window.addEventListener('refetchTeamManagement', handleRefetch)
  return () => window.removeEventListener('refetchTeamManagement', handleRefetch)
}, [router])
```

**Refetch Events Integration:**
- CreateTeamSheet: Call `refetchTeamManagement()` after successful create
- EditTeamSheet: Call `refetchTeamManagement()` after successful update
- DeleteTeamDialog: Call `refetchTeamManagement()` after successful delete
- ManageTeamMembersSheet: Call `refetchTeamManagement()` after member changes

### 4. Group Details Sheet Enhancement

**Fetch Team Members on Sheet Open:**

```typescript
// Add state for members
const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
const [loadingMembers, setLoadingMembers] = useState(false)

// Fetch when sheet opens
useEffect(() => {
  if (isTeamDetailsOpen && selectedTeam) {
    fetchTeamMembers(selectedTeam.id)
  }
}, [isTeamDetailsOpen, selectedTeam?.id])

const fetchTeamMembers = async (teamId: string) => {
  setLoadingMembers(true)
  try {
    const response = await fetch(`/api/teams/${teamId}/members`)
    const data = await response.json()
    if (response.ok) {
      setTeamMembers(data.members || [])
    }
  } catch (error) {
    console.error('Error fetching team members:', error)
    toast.error('Nie udało się pobrać członków grupy')
  } finally {
    setLoadingMembers(false)
  }
}
```

**Member List Rendering:**
```tsx
{/* Członkowie grupy Section */}
<div className="flex flex-col gap-2">
  <div className="text-sm font-medium text-foreground">
    Członkowie grupy
  </div>
  {loadingMembers ? (
    <div className="flex items-center gap-2 text-muted-foreground">
      <Loader2 className="size-4 animate-spin" />
      <span className="text-sm">Ładowanie członków...</span>
    </div>
  ) : teamMembers.length === 0 ? (
    <div className="text-base text-muted-foreground">Brak członków</div>
  ) : (
    <div className="flex flex-col gap-3">
      {teamMembers.map((member) => (
        <div key={member.id} className="flex items-center gap-3">
          <Avatar className="size-10">
            <AvatarImage src={member.avatar_url || undefined} />
            <AvatarFallback className="text-sm">
              {member.full_name
                ? member.full_name.split(' ').map(n => n[0]).join('').toUpperCase()
                : member.email.charAt(0).toUpperCase()
              }
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col flex-1">
            <div className="text-sm font-medium text-foreground leading-5">
              {member.full_name || member.email}
            </div>
            <div className="text-sm text-muted-foreground leading-5">
              {member.email}
            </div>
          </div>
          {member.id === selectedTeam?.manager?.id ? (
            <div className="px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium">
              Kierownik
            </div>
          ) : (
            <div className="px-2 py-1 rounded-md bg-muted text-muted-foreground text-xs font-medium">
              Pracownik
            </div>
          )}
        </div>
      ))}
    </div>
  )}
</div>
```

### 5. Delete Dialog Updates

**Update Dialog Content:**
```tsx
<Dialog open={isDeleteTeamDialogOpen} onOpenChange={setIsDeleteTeamDialogOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Czy na pewno chcesz usunąć tę grupę?</DialogTitle>
      <DialogDescription>
        Użytkownicy z tej grupy nie będą przypisani do żadnej grupy
      </DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button
        variant="outline"
        onClick={() => setIsDeleteTeamDialogOpen(false)}
        disabled={loading}
      >
        Zamknij
      </Button>
      <Button
        variant="destructive"
        onClick={confirmDeleteTeam}
        disabled={loading}
      >
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Usuń
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### 6. Edit Sheet Button Update

**Update Button Text:**
```tsx
{/* Edit Group Sheet Footer */}
<Button
  onClick={handleUpdateTeam}
  disabled={loading}
  className="h-9"
>
  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
  Zapisz grupę {/* Changed from "Zaktualizuj grupę" */}
</Button>
```

### 7. API Endpoint for Team Members

**New Endpoint (if not exists):**
```typescript
// File: app/api/teams/[teamId]/members/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: { teamId: string } }
) {
  const supabase = await createClient()

  // Get current user and org
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('user_organizations')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .single()

  if (!profile || !['admin', 'owner'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Fetch team members
  const { data: members, error } = await supabase
    .from('user_organizations')
    .select(`
      user_id,
      role,
      users:user_id (
        id,
        email,
        full_name,
        avatar_url
      )
    `)
    .eq('team_id', params.teamId)
    .eq('organization_id', profile.organization_id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Transform data
  const transformedMembers = members?.map(m => ({
    id: m.users.id,
    email: m.users.email,
    full_name: m.users.full_name,
    avatar_url: m.users.avatar_url,
    role: m.role
  })) || []

  return NextResponse.json({ members: transformedMembers })
}
```

## UI/UX Requirements

### Typography
- **Sheet Titles:** text-xl font-semibold
- **Section Labels:** text-sm font-medium
- **Large Headings:** text-xl font-semibold leading-7
- **Body Text:** text-base font-normal leading-6
- **Small Text:** text-sm font-normal leading-5
- **Tiny Text:** text-xs font-normal leading-4

### Spacing
- **Sheet Padding:** p-6
- **Section Gaps:** gap-6 or gap-8
- **Item Gaps:** gap-2 or gap-3
- **Footer Gaps:** gap-2

### Colors (from Figma)
- **Manager Badge (Kierownik):** bg-primary/10 text-primary
- **Member Badge (Pracownik):** bg-muted text-muted-foreground
- **Destructive Buttons:** variant="destructive" (red)
- **Outline Buttons:** variant="outline"
- **Primary Buttons:** default variant (purple)

### Avatar Sizing
- **Table Manager:** size-8 (32px)
- **Details Sheet Members:** size-10 (40px)
- **Fallback Text:** text-sm for both

## Performance Requirements

- Page load time: <100ms (server-side rendering)
- Sheet open animation: <200ms
- Member list load: <300ms
- Refetch after action: <500ms total (API + UI update)
- No full page reloads for any operation

## Testing Requirements

### Unit Tests
- Manager column rendering with null/valid manager
- Member list rendering with 0/1/many members
- Role badge display logic (Kierownik vs Pracownik)
- Refetch event triggering and handling

### Integration Tests
- Full CRUD flow without page reloads
- N+1 query elimination (verify single query in logs)
- Member list API endpoint authorization
- Dialog/sheet open/close state management

### Visual Regression Tests
- Compare all sheets against Figma screenshots
- Verify spacing and typography matches exactly
- Test hover states and transitions
- Verify responsive layout (if applicable)
