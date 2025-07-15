import { AppLayout } from '@/components/app-layout'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ManagerTeamView } from './components/ManagerTeamView'
import { AdminTeamView } from './components/AdminTeamView'
import { getUserTeamScope, getTeamMemberIds } from '@/lib/team-utils'
import { getTranslations } from 'next-intl/server'

export default async function TeamPage() {
  const t = await getTranslations('team')
  const tCommon = await getTranslations('common')
  
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  // Get user profile with organization details
  const { data: profile } = await supabase
    .from('profiles')
    .select(`
      *,
      organizations (
        id,
        name
      )
    `)
    .eq('id', user.id)
    .single()

  if (!profile?.organization_id) {
    redirect('/onboarding')
  }

  // Only managers and admins can access this page
  if (profile.role !== 'manager' && profile.role !== 'admin') {
    redirect('/dashboard')
  }

  // Admin view - can see all teams with dropdown selector
  if (profile.role === 'admin') {
    // Get all teams
    const { data: teams } = await supabase
      .from('teams')
      .select(`
        id,
        name,
        color
      `)
      .eq('organization_id', profile.organization_id)
      .order('name')

    // Get all team members
    const { data: rawTeamMembers } = await supabase
      .from('profiles')
      .select(`
        id, 
        email, 
        full_name, 
        role, 
        avatar_url,
        team_id,
        teams!profiles_team_id_fkey (
          id,
          name,
          color
        )
      `)
      .eq('organization_id', profile.organization_id)
      .order('full_name', { ascending: true })

    // Transform the data
    const teamMembers = rawTeamMembers?.map(member => ({
      ...member,
      teams: Array.isArray(member.teams) ? member.teams[0] : member.teams
    })) || []

    // Get leave balances for all members
    const memberIds = teamMembers.map(member => member.id)
    const { data: leaveBalances } = await supabase
      .from('leave_balances')
      .select(`
        *,
        leave_types!inner (
          id,
          name,
          color,
          requires_balance
        )
      `)
      .in('user_id', memberIds)
      .eq('year', new Date().getFullYear())
      .eq('leave_types.requires_balance', true)

    return (
      <AppLayout>
        <AdminTeamView 
          teamMembers={teamMembers}
          leaveBalances={leaveBalances || []}
          teams={teams || []}
          currentUser={profile}
        />
      </AppLayout>
    )
  }

  // Manager view - only their team
  // Get team scope for manager (only their team)
  const teamScope = await getUserTeamScope(user.id)
  const teamMemberIds = await getTeamMemberIds(teamScope)

  // Get team members (team-scoped)
  const { data: rawTeamMembers } = await supabase
    .from('profiles')
    .select(`
      id, 
      email, 
      full_name, 
      role, 
      avatar_url,
      team_id,
      teams!profiles_team_id_fkey (
        id,
        name,
        color
      )
    `)
    .in('id', teamMemberIds)
    .order('full_name', { ascending: true })

  // Transform the data to match interface (teams is array, need single object)
  const teamMembers = rawTeamMembers?.map(member => ({
    ...member,
    teams: Array.isArray(member.teams) ? member.teams[0] : member.teams
  })) || []

  // Get leave balances for team members
  const { data: leaveBalances } = await supabase
    .from('leave_balances')
    .select(`
      *,
      leave_types!inner (
        id,
        name,
        color,
        requires_balance
      )
    `)
    .in('user_id', teamMemberIds)
    .eq('year', new Date().getFullYear())
    .eq('leave_types.requires_balance', true)

  // Get leave requests for team members
  const { data: rawLeaveRequests } = await supabase
    .from('leave_requests')
    .select(`
      id,
      user_id,
      start_date,
      end_date,
      status,
      created_at,
      leave_types (
        name,
        color
      ),
      user_profile:profiles!leave_requests_user_id_fkey (
        full_name,
        email,
        avatar_url
      )
    `)
    .in('user_id', teamMemberIds)
    .order('created_at', { ascending: false })
    .limit(20)

  // Transform leave requests data to match interface
  const leaveRequests = rawLeaveRequests?.map(request => ({
    ...request,
    leave_types: Array.isArray(request.leave_types) ? request.leave_types[0] : request.leave_types,
    user_profile: Array.isArray(request.user_profile) ? request.user_profile[0] : request.user_profile
  })) || []

  return (
    <AppLayout>
      <ManagerTeamView 
        teamMembers={teamMembers}
        leaveBalances={leaveBalances || []}
        leaveRequests={leaveRequests}
        managerName={profile.full_name || 'Manager'}
      />
    </AppLayout>
  )
} 