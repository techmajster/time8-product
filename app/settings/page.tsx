import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function SettingsPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  // MULTI-ORG UPDATE: Get user role from user_organizations
  const { data: userOrg } = await supabase
    .from('user_organizations')
    .select('role')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .eq('is_default', true)
    .single()

  // Only admins can access settings, redirect others to dashboard
  if (userOrg?.role !== 'admin') {
    redirect('/dashboard')
  }

  // Redirect to new admin settings location
  redirect('/admin/settings')
} 