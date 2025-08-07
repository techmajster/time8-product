import { createClient, createAdminClient } from '@/lib/supabase/server'
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

  // MULTI-ORG UPDATE: Get user profile and organization details via user_organizations
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
        brand_color,
        logo_url
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
  
  // Preload employees for AddAbsenceSheet (only for managers/admins)
  let employees: any[] = []
  const hasManagerAccess = profile.role === 'manager' || profile.role === 'admin'
  
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

    // Preload employees for AddAbsenceSheet if user has manager/admin access (via user_organizations)
    if (hasManagerAccess) {
      // Use admin client to bypass RLS issues like dashboard does
      const supabaseAdmin = createAdminClient()
      let employeesQuery = supabaseAdmin
        .from('user_organizations')
        .select(`
          user_id,
          role,
          team_id,
          profiles!inner(id, email, full_name, avatar_url)
        `)
        .eq('organization_id', profile.organization_id)
        .eq('is_active', true)
        .order('profiles(full_name)', { ascending: true })

      // Filter based on role
      if (profile.role === 'manager') {
        // Get manager's team_id from user_organizations using admin client
        const { data: managerData } = await supabaseAdmin
          .from('user_organizations')
          .select('team_id')
          .eq('user_id', user.id)
          .eq('organization_id', profile.organization_id)
          .eq('is_active', true)
          .eq('is_default', true)
          .single()
        
        if (managerData?.team_id) {
          // Managers can see their team members (including themselves for AddAbsenceSheet)
          employeesQuery = employeesQuery
            .eq('team_id', managerData.team_id)
        } else {
          // Manager has no team assigned - show only themselves for AddAbsenceSheet
          employeesQuery = employeesQuery.eq('user_id', user.id)
        }
      } else if (profile.role === 'admin') {
        // Admins see everyone except themselves
        employeesQuery = employeesQuery.neq('user_id', user.id)
      }

      const { data: employeesData } = await employeesQuery
      
      console.log('🔍 app-layout.tsx - Preloading employees:', {
        hasManagerAccess,
        userRole: profile.role,
        userId: user.id,
        employeesCount: employeesData?.length,
        employeesData
      })
      
      // Transform employees data to match expected format
      employees = employeesData?.map((item: any) => {
        const profile = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles
        return {
          id: profile?.id || item.user_id,
          email: profile?.email || '',
          full_name: profile?.full_name,
          avatar_url: profile?.avatar_url,
          role: item.role,
          team_id: item.team_id
        }
      }) || []
    }
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
      preloadedEmployees={employees}
    >
      {children}
    </AppLayoutClient>
  )
} 