import { AppLayout } from '@/components/app-layout'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import AdminSettingsClient from '@/app/admin/settings/components/AdminSettingsClient'

export default async function AdminSettingsPage() {
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
        brand_color,
        country_code,
        locale,
        work_mode,
        working_days,
        exclude_public_holidays,
        daily_start_time,
        daily_end_time,
        work_schedule_type,
        shift_count,
        work_shifts,
        created_at,
        restrict_calendar_by_group
      )
    `)
    .eq('user_id', user.id)
    .eq('is_active', true)
    
  // If we have an active org cookie, use that specific org, otherwise use default
  if (activeOrgId) {
    userOrgQuery = userOrgQuery.eq('organization_id', activeOrgId)
    console.log('🍪 Admin Settings: Using active organization from cookie:', activeOrgId)
  } else {
    userOrgQuery = userOrgQuery.eq('is_default', true)
    console.log('🏠 Admin Settings: Using default organization (no active cookie)')
  }
  
  const { data: userOrg } = await userOrgQuery.single()

  if (!userOrg) {
    redirect('/onboarding')
  }

  // Add organization context to profile for backward compatibility
  profile.organization_id = userOrg.organization_id
  profile.role = userOrg.role
  profile.organizations = userOrg.organizations

  // Check if user has permission to access settings
  if (profile.role !== 'admin') {
    redirect('/dashboard')
  }

  // Get organization details
  const organization = profile.organizations

  // Get leave types for this organization
  const { data: leaveTypes } = await supabase
    .from('leave_types')
    .select('id, name, color, leave_category, requires_balance, days_per_year, requires_approval, is_paid, organization_id, is_mandatory')
    .eq('organization_id', profile.organization_id)
    .order('name')

  // Get all ADMIN users in the organization for admin selector
  // Use admin client to bypass RLS (like app-layout.tsx does)
  const supabaseAdmin = createAdminClient()
  const { data: orgUsers, error: orgUsersError } = await supabaseAdmin
    .from('user_organizations')
    .select(`
      user_id,
      role,
      is_owner,
      profiles!user_organizations_user_id_fkey(id, email, full_name, avatar_url)
    `)
    .eq('organization_id', profile.organization_id)
    .eq('is_active', true)
    .eq('role', 'admin')  // Filter for admins only

  // Transform the data to match the expected format
  const users = orgUsers?.map(ou => ({
    id: (ou.profiles as any).id,
    email: (ou.profiles as any).email,
    full_name: (ou.profiles as any).full_name,
    avatar_url: (ou.profiles as any).avatar_url,
    role: ou.role,
    isOwner: Boolean(ou.is_owner)
  })) || []

  // Get all teams/groups for calendar visibility settings
  const { data: teams } = await supabase
    .from('teams')
    .select('id, name')
    .eq('organization_id', profile.organization_id)
    .order('name')

  // Get subscription data for SubscriptionWidget
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('seat_limit, renews_at, status')
    .eq('organization_id', profile.organization_id)
    .in('status', ['active', 'on_trial', 'past_due'])
    .single()

  // CRITICAL BUG FIX: Query actual user count from user_organizations
  // DO NOT use subscription.current_seats (may be 0 or outdated)
  const { count: actualUserCount } = await supabase
    .from('user_organizations')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', profile.organization_id)
    .eq('is_active', true)

  // Combine subscription and actual user count for display
  const subscriptionData = subscription ? {
    ...subscription,
    current_seats: actualUserCount || 0, // Use actual user count
    seat_limit: subscription.seat_limit || 3 // Fallback to free tier limit
  } : null

  // Get users with pending_removal status
  const { data: pendingRemovalUsers } = await supabase
    .from('user_organizations')
    .select(`
      user_id,
      status,
      removal_effective_date,
      role,
      profiles:user_id (
        id,
        email,
        full_name,
        avatar_url
      )
    `)
    .eq('organization_id', profile.organization_id)
    .eq('status', 'pending_removal')

  // Get archived users
  const { data: archivedUsers } = await supabase
    .from('user_organizations')
    .select(`
      user_id,
      status,
      role,
      profiles:user_id (
        id,
        email,
        full_name,
        avatar_url
      )
    `)
    .eq('organization_id', profile.organization_id)
    .eq('status', 'archived')

  // Transform pending removal users
  const transformedPendingUsers = pendingRemovalUsers?.map(pu => ({
    id: pu.user_id,  // Use user_id for cancel removal lookup
    email: (pu.profiles as any)?.email || '',
    full_name: (pu.profiles as any)?.full_name || null,
    avatar_url: (pu.profiles as any)?.avatar_url || null,
    removal_effective_date: pu.removal_effective_date,
    role: pu.role
  })) || []

  // Transform archived users
  const transformedArchivedUsers = archivedUsers?.map(au => ({
    id: au.user_id,  // Use user_id for reactivation lookup
    email: (au.profiles as any)?.email || '',
    full_name: (au.profiles as any)?.full_name || null,
    avatar_url: (au.profiles as any)?.avatar_url || null,
    role: au.role
  })) || []

  const canManageOwnership = Boolean((userOrg as any)?.is_owner)

  return (
    <AppLayout>
      <AdminSettingsClient
        currentOrganization={organization}
        leaveTypes={leaveTypes || []}
        users={users || []}
        teams={teams || []}
        subscription={subscriptionData}
        pendingRemovalUsers={transformedPendingUsers}
        archivedUsers={transformedArchivedUsers}
        canManageOwnership={canManageOwnership}
      />
    </AppLayout>
  )
} 