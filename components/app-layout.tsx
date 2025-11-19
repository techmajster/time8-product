import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
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
        brand_color,
        country_code,
        locale,
        working_days,
        exclude_public_holidays,
        daily_start_time,
        daily_end_time,
        work_schedule_type,
        shift_count,
        work_shifts
      )
    `)
    .eq('user_id', user.id)
    .eq('is_active', true)
    
  // If we have an active org cookie, use that specific org, otherwise use default
  if (activeOrgId) {
    userOrgQuery = userOrgQuery.eq('organization_id', activeOrgId)
    console.log('🍪 Using active organization from cookie:', activeOrgId)
  } else {
    userOrgQuery = userOrgQuery.eq('is_default', true)
    console.log('🏠 Using default organization (no active cookie)')
  }
  
  const { data: userOrg } = await userOrgQuery.single()

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
          profiles!user_organizations_user_id_fkey(id, email, full_name, avatar_url)
        `)
        .eq('organization_id', profile.organization_id)
        .eq('is_active', true)

      // Filter based on role
      if (profile.role === 'manager') {
        // Get manager's team_id from user_organizations using admin client
        const { data: managerData } = await supabaseAdmin
          .from('user_organizations')
          .select('team_id')
          .eq('user_id', user.id)
          .eq('organization_id', profile.organization_id)
          .eq('is_active', true)
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
        // Admins can see everyone (including themselves to add their own absences)
        // No filter needed - they see all users in the organization
      }


      const { data: employeesData, error: employeesError } = await employeesQuery
      
      if (employeesError) {
        console.error('❌ app-layout.tsx - Error loading employees:', employeesError)
      }
      
      console.log('🔍 app-layout.tsx - Preloading employees:', {
        hasManagerAccess,
        userRole: profile.role,
        userId: user.id,
        organizationId: profile.organization_id,
        employeesCount: employeesData?.length,
        error: employeesError,
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
      }).sort((a, b) => {
        // Sort by full_name alphabetically
        const nameA = a.full_name?.toLowerCase() || ''
        const nameB = b.full_name?.toLowerCase() || ''
        return nameA.localeCompare(nameB)
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
      activeOrganizationId={profile.organization_id}
    >
      {children}
    </AppLayoutClient>
  )
} 