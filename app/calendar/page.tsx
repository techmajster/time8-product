import { AppLayout } from '@/components/app-layout'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { NewLeaveRequestSheet } from '@/app/leave/components/NewLeaveRequestSheet'
import CalendarClient from './components/CalendarClient'

export default async function CalendarPage() {
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
        name,
        country_code
      )
    `)
    .eq('user_id', user.id)
    .eq('is_active', true)
    
  // If we have an active org cookie, use that specific org, otherwise use default
  if (activeOrgId) {
    userOrgQuery = userOrgQuery.eq('organization_id', activeOrgId)
    console.log('🍪 Calendar: Using active organization from cookie:', activeOrgId)
  } else {
    userOrgQuery = userOrgQuery.eq('is_default', true)
    console.log('🏠 Calendar: Using default organization (no active cookie)')
  }
  
  const { data: userOrg } = await userOrgQuery.single()

  if (!userOrg) {
    redirect('/onboarding')
  }

  // Add organization context to profile for backward compatibility
  profile.organization_id = userOrg.organization_id
  profile.role = userOrg.role
  profile.organizations = userOrg.organizations

  // Use admin client for better RLS handling
  const supabaseAdmin = createAdminClient()

  // Get leave types for the NewLeaveRequestSheet
  const { data: leaveTypes } = await supabaseAdmin
    .from('leave_types')
    .select('*')
    .eq('organization_id', profile.organization_id)
    .order('name')

  // Get leave balances for the NewLeaveRequestSheet
  const { data: leaveBalances } = await supabaseAdmin
    .from('leave_balances')
    .select(`
      *,
      leave_types!inner (
        id,
        name,
        color,
        leave_category,
        requires_balance
      )
    `)
    .eq('user_id', user.id)
    .eq('year', new Date().getFullYear())
    .eq('leave_types.requires_balance', true)

  // Get team scope for filtering - use same logic as dashboard (bypasses team-utils)
  let teamScope: any
  let teamMemberIds: string[] = []
  
  // Determine team scope using admin client to bypass RLS (same as dashboard)
  if (profile.role === 'admin') {
    // Admin sees all organization members
    teamScope = { type: 'organization', organizationId: profile.organization_id }
    
    const { data: allOrgMembers } = await supabaseAdmin
      .from('user_organizations')
      .select('user_id')
      .eq('organization_id', profile.organization_id)
      .eq('is_active', true)
    
    teamMemberIds = allOrgMembers?.map(m => m.user_id) || []
  } else if (userOrg.team_id) {
    // Team members see only their team
    teamScope = { type: 'team', teamId: userOrg.team_id, organizationId: profile.organization_id }
    
    const { data: teamMembers } = await supabaseAdmin
      .from('user_organizations')
      .select('user_id')
      .eq('team_id', userOrg.team_id)
      .eq('is_active', true)
    
    teamMemberIds = teamMembers?.map(m => m.user_id) || []
  } else {
    // Fallback: show all organization members
    teamScope = { type: 'organization', organizationId: profile.organization_id }
    
    const { data: allOrgMembers } = await supabaseAdmin
      .from('user_organizations')
      .select('user_id')
      .eq('organization_id', profile.organization_id)
      .eq('is_active', true)
    
    teamMemberIds = allOrgMembers?.map(m => m.user_id) || []
  }

  console.log('📅 Calendar page - team member IDs (dashboard logic):', { 
    count: teamMemberIds.length, 
    teamScope,
    organizationId: profile.organization_id,
    userRole: profile.role,
    userTeamId: userOrg.team_id,
    memberIds: teamMemberIds
  })

  // Get colleagues' birthday data for birthday card functionality (team-filtered)
  const { data: colleagues } = await supabaseAdmin
    .from('profiles')
    .select(`
      id,
      full_name,
      birth_date,
      avatar_url
    `)
    .in('id', teamMemberIds)
    .not('birth_date', 'is', null)
    .order('full_name')

  return (
    <AppLayout>
      {/* NewLeaveRequestSheet component for calendar functionality */}
      <NewLeaveRequestSheet 
        leaveTypes={leaveTypes || []} 
        leaveBalances={leaveBalances || []} 
        userProfile={profile} 
      />
      
      <CalendarClient 
        organizationId={profile.organization_id}
        countryCode={profile.organizations?.country_code || 'PL'}
        userId={user.id}
        colleagues={colleagues || []}
        teamMemberIds={teamMemberIds}
        teamScope={teamScope}
      />
    </AppLayout>
  )
} 