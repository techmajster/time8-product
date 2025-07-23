import { AppLayout } from '@/components/app-layout'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { AddEmployeePage } from './components/AddEmployeePage'

export default async function TeamAddPage() {
  const t = await getTranslations('team')
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

  // Only admins can access this page
  if (profile.role !== 'admin') {
    redirect('/dashboard')
  }

  // Get teams for the organization with member counts
  const { data: teams } = await supabase
    .from('teams')
    .select(`
      id,
      name,
      color,
      members:profiles!profiles_team_id_fkey (id)
    `)
    .eq('organization_id', profile.organization_id)
    .order('name')

  // Get team members for CreateTeamSheet
  const { data: teamMembers } = await supabase
    .from('profiles')
    .select('id, email, full_name, role')
    .eq('organization_id', profile.organization_id)
    .order('full_name')

  // Get leave types for the organization
  const { data: leaveTypes } = await supabase
    .from('leave_types')
    .select('id, name, days_per_year, leave_category, requires_balance')
    .eq('organization_id', profile.organization_id)
    .order('name')

  return (
    <AppLayout>
      <AddEmployeePage 
        teams={teams || []}
        leaveTypes={leaveTypes || []}
        organizationId={profile.organization_id}
        teamMembers={teamMembers || []}
      />
    </AppLayout>
  )
} 