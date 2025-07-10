import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppLayoutClient } from './app-layout-client'
import { LeaveType, LeaveBalance, UserProfile } from '@/types/leave'

interface AppLayoutProps {
  children: React.ReactNode
}

export async function AppLayout({ children }: AppLayoutProps) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  // Get user profile with organization details including branding
  const { data: profile } = await supabase
    .from('profiles')
    .select(`
      *,
      organizations (
        id,
        name,
        brand_color,
        logo_url
      )
    `)
    .eq('id', user.id)
    .single()

  if (!profile?.organization_id) {
    redirect('/onboarding')
  }

  // Get pending team invitations count
  const { count: teamInviteCount } = await supabase
    .from('invitations')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', profile.organization_id)
    .eq('status', 'pending')

  // Get user profile for the global sheet
  let userProfile: UserProfile | undefined
  let leaveTypes: LeaveType[] = []
  let leaveBalances: LeaveBalance[] = []
  
  if (user) {
    // Create user profile for validation
    userProfile = {
      id: profile.id,
      full_name: profile.full_name,
      email: profile.email,
      role: profile.role,
      employment_start_date: profile.employment_start_date,
      organization_id: profile.organization_id
    }

    // Get leave types for the organization
    const { data: leaveTypesData } = await supabase
      .from('leave_types')
      .select('id, name, color, leave_category, requires_balance, days_per_year, requires_approval, organization_id, is_paid, can_be_split, created_at, updated_at')
      .eq('organization_id', profile.organization_id)
      .order('name')

    leaveTypes = leaveTypesData || []

    // Get leave balances for current user (only for leave types that require balances)
    const { data: leaveBalancesData } = await supabase
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

    leaveBalances = leaveBalancesData || []
  }

  return (
    <AppLayoutClient 
      userRole={profile.role}
      userId={user.id}
      organization={profile.organizations}
      userProfile={userProfile}
      teamInviteCount={teamInviteCount || 0}
      leaveTypes={leaveTypes}
      leaveBalances={leaveBalances}
    >
      {children}
    </AppLayoutClient>
  )
} 