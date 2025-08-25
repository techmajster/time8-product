import { AppLayout } from '@/components/app-layout'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { EditEmployeePage } from '../components/EditEmployeePage'

export default async function TeamEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const t = await getTranslations('team')
  const supabase = await createClient()
  const supabaseAdmin = await createAdminClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  // Get user's organization (same as add-employee)
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
    console.log('🍪 Edit Employee: Using active organization from cookie:', activeOrgId)
  } else {
    userOrgQuery = userOrgQuery.eq('is_default', true)
    console.log('🏠 Edit Employee: Using default organization (no active cookie)')
  }
  
  const { data: userOrg } = await userOrgQuery.single()

  if (!userOrg) {
    redirect('/onboarding')
  }

  profile.organization_id = userOrg.organization_id
  profile.role = userOrg.role
  profile.organizations = userOrg.organizations

  if (userOrg.role !== 'admin') {
    redirect('/dashboard')
  }

  // Get teams (same as add-employee)
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

  const teamsWithMembers = (teams || []).map(team => ({
    ...team,
    members: Array.from({ length: teamMemberCounts[team.id] || 0 }, (_, i) => ({ id: `member-${i}` }))
  }))

  // Get team members (same as add-employee)
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

  const teamMembers = teamMembersRaw?.map(item => ({
    id: (item.profiles as any)?.id || item.user_id,
    email: (item.profiles as any)?.email || '',
    full_name: (item.profiles as any)?.full_name || null,
    role: item.role
  })) || []

  // Get leave types (same as add-employee)
  const { data: leaveTypes } = await supabaseAdmin
    .from('leave_types')
    .select('id, name, days_per_year, leave_category, requires_balance')
    .eq('organization_id', profile.organization_id)
    .order('name')

  // NEW: Get the employee to edit
  const { data: employeeToEdit, error: employeeError } = await supabaseAdmin
    .from('user_organizations')
    .select(`
      user_id,
      role,
      team_id,
      employment_type,
      contract_start_date,
      profiles:user_id (
        id,
        email,
        full_name,
        birth_date
      )
    `)
    .eq('user_id', id)
    .eq('organization_id', profile.organization_id)
    .eq('is_active', true)
    .single()

  if (employeeError || !employeeToEdit) {
    redirect('/admin/team-management')
  }

  const employeeData = {
    id: (employeeToEdit.profiles as any)?.id || employeeToEdit.user_id,
    email: (employeeToEdit.profiles as any)?.email || '',
    full_name: (employeeToEdit.profiles as any)?.full_name || '',
    birth_date: (employeeToEdit.profiles as any)?.birth_date || '',
    role: employeeToEdit.role,
    team_id: employeeToEdit.team_id,
    employment_type: employeeToEdit.employment_type,
    contract_start_date: employeeToEdit.contract_start_date
  }

  return (
    <AppLayout>
      <EditEmployeePage 
        teams={teamsWithMembers}
        leaveTypes={leaveTypes || []}
        organizationId={profile.organization_id}
        teamMembers={teamMembers || []}
        employeeToEdit={employeeData}
      />
    </AppLayout>
  )
}