import { AppLayout } from '@/components/app-layout'
import { createClient } from '@/lib/supabase/server'
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

  // Get user profile with organization details including country_code
  const { data: profile } = await supabase
    .from('profiles')
    .select(`
      *,
      organizations (
        id,
        name,
        country_code
      )
    `)
    .eq('id', user.id)
    .single()

  if (!profile?.organization_id) {
    redirect('/onboarding')
  }

  // Get leave types for the NewLeaveRequestSheet
  const { data: leaveTypes } = await supabase
    .from('leave_types')
    .select('*')
    .eq('organization_id', profile.organization_id)
    .order('name')

  // Get leave balances for the NewLeaveRequestSheet
  const { data: leaveBalances } = await supabase
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

  // Get colleagues' birthday data for birthday card functionality (team-filtered)
  const { data: colleagues } = await supabase
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