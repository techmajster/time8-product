import { AppLayout } from '@/components/app-layout'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { ProfilePageClient } from './components/ProfilePageClient'

export default async function ProfilePage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect('/login')
  }

  // Get current active organization (for compatibility, even if not displaying)
  const cookieStore = await cookies()
  const activeOrgId = cookieStore.get('active-organization-id')?.value
  
  let userOrgQuery = supabase
    .from('user_organizations')
    .select(`
      *,
      organizations (
        id,
        name
      )
    `)
    .eq('user_id', user.id)
    .eq('is_active', true)
    
  if (activeOrgId) {
    userOrgQuery = userOrgQuery.eq('organization_id', activeOrgId)
  } else {
    userOrgQuery = userOrgQuery.eq('is_default', true)
  }
  
  const { data: userOrg } = await userOrgQuery.single()

  if (!userOrg) {
    redirect('/onboarding')
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-background">
        <div className="py-11 space-y-9">
          {/* Header */}
          <h1 className="text-3xl font-semibold text-foreground">Profil użytkownika</h1>

          {/* Client Component with all interactive functionality */}
          <ProfilePageClient
            user={{
              id: user.id,
              email: user.email || null
            }}
            profile={{
              id: profile.id,
              full_name: profile.full_name,
              birth_date: profile.birth_date,
              avatar_url: profile.avatar_url
            }}
          />
        </div>
      </div>
    </AppLayout>
  )
}
