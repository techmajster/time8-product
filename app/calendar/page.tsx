import { AppLayout } from '@/components/app-layout'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { NewLeaveRequestSheet } from '@/app/leave/components/NewLeaveRequestSheet'
import CalendarClient from './components/CalendarClient'
import { getUserTeamScope, getTeamMemberIds } from '@/lib/team-utils'

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

  // Get user's active organization from user_organizations
  const { data: userOrg } = await supabase
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
    .eq('is_default', true)
    .single()

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

  // Get team scope for filtering
  const teamScope = await getUserTeamScope(user.id)
  const teamMemberIds = await getTeamMemberIds(teamScope)

  console.log('📅 Calendar page - team member IDs:', { 
    count: teamMemberIds.length, 
    teamScope,
    organizationId: profile.organization_id
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