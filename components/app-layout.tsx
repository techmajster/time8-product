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
    redirect('/auth/login')
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

  return (
    <AppLayoutClient 
      userRole={profile.role}
      userId={user.id}
    >
      {children}
    </AppLayoutClient>
  )
} 