import { AppLayout } from '@/components/app-layout'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { AddEmployeePage } from './components/AddEmployeePage'

export default async function TeamAddPage() {
  const t = await getTranslations('team')
  const supabase = await createClient()
  const supabaseAdmin = await createAdminClient()
  
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

  // Get user's active organization from user_organizations
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
        google_domain,
        require_google_domain
      )
    `)
    .eq('user_id', user.id)
    .eq('is_active', true)
    
  // If we have an active org cookie, use that specific org, otherwise use default
  if (activeOrgId) {
    userOrgQuery = userOrgQuery.eq('organization_id', activeOrgId)
    console.log('🍪 Add Employee: Using active organization from cookie:', activeOrgId)
  } else {
    userOrgQuery = userOrgQuery.eq('is_default', true)
    console.log('🏠 Add Employee: Using default organization (no active cookie)')
  }
  
  const { data: userOrg } = await userOrgQuery.single()

  if (!userOrg) {
    redirect('/onboarding')
  }

  // Add organization context to profile for backward compatibility
  profile.organization_id = userOrg.organization_id
  profile.role = userOrg.role
  profile.organizations = userOrg.organizations

  // Only admins can access this page
  if (userOrg.role !== 'admin') {
    redirect('/dashboard')
  }

  // Get teams for the organization using admin client to bypass RLS
  const { data: teams, error: teamsError } = await supabaseAdmin
    .from('teams')
    .select(`
      id,
      name,
      color
    `)
    .eq('organization_id', profile.organization_id)
    .order('name')

  if (teamsError) {
    console.error('Teams query error:', teamsError)
  }

  // Get team member counts using admin client
  const teamMemberCounts: Record<string, number> = {}
  if (teams) {
    for (const team of teams) {
      const { count } = await supabaseAdmin
        .from('user_organizations')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', team.id)
        .eq('organization_id', profile.organization_id)
        .eq('is_active', true)
      
      teamMemberCounts[team.id] = count || 0
    }
  }

  // Add members array to match interface
  const teamsWithMembers = (teams || []).map(team => ({
    ...team,
    members: Array.from({ length: teamMemberCounts[team.id] || 0 }, (_, i) => ({ id: `member-${i}` }))
  }))

  // Get team members for CreateTeamSheet using admin client to bypass RLS
  const { data: teamMembersRaw, error: teamMembersError } = await supabaseAdmin
    .from('user_organizations')
    .select(`
      user_id,
      role,
      profiles:user_id (
        id,
        email,
        full_name
      )
    `)
    .eq('organization_id', profile.organization_id)
    .eq('is_active', true)
    .order('profiles(full_name)')

  if (teamMembersError) {
    console.error('Team members query error:', teamMembersError)
  }

  // Transform the data to match the expected interface
  const teamMembers = teamMembersRaw?.map(item => ({
    id: (item.profiles as any)?.id || item.user_id,
    email: (item.profiles as any)?.email || '',
    full_name: (item.profiles as any)?.full_name || null,
    role: item.role
  })) || []

  // Get leave types for the organization using admin client
  const { data: leaveTypes } = await supabaseAdmin
    .from('leave_types')
    .select('id, name, days_per_year, leave_category, requires_balance')
    .eq('organization_id', profile.organization_id)
    .order('name')

  return (
    <AppLayout>
      <AddEmployeePage 
        teams={teamsWithMembers}
        leaveTypes={leaveTypes || []}
        organizationId={profile.organization_id}
        teamMembers={teamMembers || []}
        organization={userOrg.organizations}
      />
    </AppLayout>
  )
} 