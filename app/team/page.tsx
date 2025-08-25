import { AppLayout } from '@/components/app-layout'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
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

  // MULTI-ORG UPDATE: Get user profile and organization via user_organizations
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect('/login')
  }

  // Get current active organization (respect workspace switching cookie)
  const cookieStore = await cookies()
  const activeOrgId = cookieStore.get('active-organization-id')?.value
  
  let userOrgQuery = supabase
    .from('user_organizations')
    .select(`
      *,
      organizations (
        id,
        name
      )
    `)
    .eq('user_id', user.id)
    .eq('is_active', true)
    
  // If we have an active org cookie, use that specific org, otherwise use default
  if (activeOrgId) {
    userOrgQuery = userOrgQuery.eq('organization_id', activeOrgId)
    console.log('🍪 Team: Using active organization from cookie:', activeOrgId)
  } else {
    userOrgQuery = userOrgQuery.eq('is_default', true)
    console.log('🏠 Team: Using default organization (no active cookie)')
  }
  
  const { data: userOrg } = await userOrgQuery.single()

  if (!userOrg) {
    redirect('/onboarding')
  }

  // Add organization context to profile for backward compatibility
  profile.organization_id = userOrg.organization_id
  profile.role = userOrg.role
  profile.organizations = userOrg.organizations

  // Only managers and admins can access this page
  if (profile.role !== 'manager' && profile.role !== 'admin') {
    redirect('/dashboard')
  }

  // Admin view - can see all teams with dropdown selector
  if (profile.role === 'admin') {
    // Use admin client for bypassing RLS issues
    const supabaseAdmin = createAdminClient()
    
    // Get all teams
    const { data: teams } = await supabaseAdmin
      .from('teams')
      .select(`
        id,
        name,
        color
      `)
      .eq('organization_id', profile.organization_id)
      .order('name')

    // MULTI-ORG UPDATE: Get all team members via user_organizations using admin client
    const { data: rawTeamMembers } = await supabaseAdmin
      .from('user_organizations')
      .select(`
        user_id,
        role,
        team_id,
        profiles!user_organizations_user_id_fkey (
          id,
          email,
          full_name,
          avatar_url
        ),
        teams!user_organizations_team_id_fkey (
          id,
          name,
          color
        )
      `)
      .eq('organization_id', profile.organization_id)
      .eq('is_active', true)
      .order('profiles(full_name)', { ascending: true })

    console.log('👥 Admin team view - raw team members:', { 
      count: rawTeamMembers?.length || 0, 
      organizationId: profile.organization_id 
    })

    // Transform the data to match the expected interface
    const teamMembers = rawTeamMembers?.map(userOrg => {
      const profile = Array.isArray(userOrg.profiles) ? userOrg.profiles[0] : userOrg.profiles
      return {
        id: profile?.id || userOrg.user_id,
        email: profile?.email || '',
        full_name: profile?.full_name,
        role: userOrg.role,
        avatar_url: profile?.avatar_url,
        team_id: userOrg.team_id,
        teams: Array.isArray(userOrg.teams) ? userOrg.teams[0] : userOrg.teams
      }
    }) || []

    // Get leave balances for all members using admin client
    const memberIds = teamMembers.map(member => member.id)
    const { data: leaveBalances } = await supabaseAdmin
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

  // MULTI-ORG UPDATE: Get team members via user_organizations (team-scoped)
  const { data: rawTeamMembers } = await supabase
    .from('user_organizations')
    .select(`
      user_id,
      role,
      team_id,
      profiles!user_organizations_user_id_fkey (
        id,
        email,
        full_name,
        avatar_url
      ),
      teams!user_organizations_team_id_fkey (
        id,
        name,
        color
      )
    `)
    .in('user_id', teamMemberIds)
    .eq('is_active', true)
    .order('profiles(full_name)', { ascending: true })

  // Transform the data to match interface
  const teamMembers = rawTeamMembers?.map(userOrg => {
    const profile = Array.isArray(userOrg.profiles) ? userOrg.profiles[0] : userOrg.profiles
    return {
      id: profile?.id || userOrg.user_id,
      email: profile?.email || '',
      full_name: profile?.full_name,
      role: userOrg.role,
      avatar_url: profile?.avatar_url,
      team_id: userOrg.team_id,
      teams: Array.isArray(userOrg.teams) ? userOrg.teams[0] : userOrg.teams
    }
  }) || []

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