import { AppLayout } from '@/components/app-layout'
import { createClient } from '@/lib/supabase/server'
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
        slug,
        google_domain,
        require_google_domain,
        brand_color,
        logo_url,
        country_code,
        locale,
        created_at
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
    .select('id, name, color, leave_category, requires_balance, days_per_year, requires_approval, organization_id')
    .eq('organization_id', profile.organization_id)
    .order('name')

  // Get all users in the organization for admin selector
  const { data: orgUsers } = await supabase
    .from('user_organizations')
    .select(`
      user_id,
      role,
      profiles!inner (
        id,
        email,
        full_name,
        avatar_url
      )
    `)
    .eq('organization_id', profile.organization_id)
    .eq('is_active', true)
    .order('profiles(full_name)')

  // Transform the data to match the expected format
  const users = orgUsers?.map(ou => ({
    id: (ou.profiles as any).id,
    email: (ou.profiles as any).email,
    full_name: (ou.profiles as any).full_name,
    avatar_url: (ou.profiles as any).avatar_url,
    role: ou.role
  })) || []

  return (
    <AppLayout>
      <AdminSettingsClient 
        currentOrganization={organization}
        leaveTypes={leaveTypes || []}
        users={users || []}
      />
    </AppLayout>
  )
} 