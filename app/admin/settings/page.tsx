import { AppLayout } from '@/components/app-layout'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminSettingsClient from '@/app/admin/settings/components/AdminSettingsClient'

export default async function AdminSettingsPage() {
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
    .eq('id', user.id)
    .single()

  if (!profile?.organization_id) {
    redirect('/onboarding')
  }

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
  const { data: users } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, avatar_url')
    .eq('organization_id', profile.organization_id)
    .order('full_name')

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