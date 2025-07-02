import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppLayoutClient } from './app-layout-client'

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

  return (
    <AppLayoutClient 
      userRole={profile.role}
      userId={user.id}
      organization={profile.organizations}
      userProfile={{
        full_name: profile.full_name,
        email: user.email || '',
        avatar_url: profile.avatar_url
      }}
      teamInviteCount={teamInviteCount || 0}
    >
      {children}
    </AppLayoutClient>
  )
} 