import { AppLayout } from '@/components/app-layout'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { AdminGroupsView } from './components/AdminGroupsView'

export default async function GroupsPage() {
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
    console.log('🍪 Groups: Using active organization from cookie:', activeOrgId)
  } else {
    userOrgQuery = userOrgQuery.eq('is_default', true)
    console.log('🏠 Groups: Using default organization (no active cookie)')
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
  if (profile.role !== 'admin') {
    redirect('/dashboard')
  }

  // Use admin client for fetching teams data
  const supabaseAdmin = createAdminClient()

  // Get all teams for the organization
  const { data: teams } = await supabaseAdmin
    .from('teams')
    .select(`
      id,
      name,
      description,
      organization_id,
      manager_id,
      manager:profiles!teams_manager_id_fkey (
        id,
        email,
        full_name,
        avatar_url
      )
    `)
    .eq('organization_id', profile.organization_id)
    .order('name')

  // Get team member counts
  const teamsWithCounts = await Promise.all(
    (teams || []).map(async (team) => {
      const { count } = await supabaseAdmin
        .from('user_organizations')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', team.id)
        .eq('is_active', true)

      return {
        ...team,
        member_count: count || 0
      }
    })
  )

  // Get all potential managers (users with manager or admin role in this org)
  const { data: potentialManagers } = await supabaseAdmin
    .from('user_organizations')
    .select(`
      user_id,
      role,
      profiles!user_organizations_user_id_fkey (
        id,
        email,
        full_name,
        avatar_url
      )
    `)
    .eq('organization_id', profile.organization_id)
    .eq('is_active', true)
    .in('role', ['manager', 'admin'])

  const teamMembers = potentialManagers?.map(userOrg => {
    const userProfile = Array.isArray(userOrg.profiles) ? userOrg.profiles[0] : userOrg.profiles
    return {
      id: userProfile?.id || userOrg.user_id,
      email: userProfile?.email || '',
      full_name: userProfile?.full_name,
      role: userOrg.role,
      avatar_url: userProfile?.avatar_url
    }
  }) || []

  // Admin-only view with full edit capabilities
  return (
    <AppLayout>
      <AdminGroupsView
        teams={teamsWithCounts}
        teamMembers={teamMembers}
      />
    </AppLayout>
  )
}
