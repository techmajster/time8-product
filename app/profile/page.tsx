import { AppLayout } from '@/components/app-layout'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/page-header'
import { User, Settings } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ProfileForm } from './components/ProfileForm'
import { PersonalSettingsForm } from './components/PersonalSettingsForm'
import { AvatarUpload } from './components/AvatarUpload'
import { ProfileDataClient } from './components/ProfileDataClient'

export default async function ProfilePage() {
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
    console.log('🍪 Profile: Using active organization from cookie:', activeOrgId)
  } else {
    userOrgQuery = userOrgQuery.eq('is_default', true)
    console.log('🏠 Profile: Using default organization (no active cookie)')
  }
  
  const { data: userOrg } = await userOrgQuery.single()

  if (!userOrg) {
    redirect('/onboarding')
  }

  // Add organization context to profile for backward compatibility
  profile.organization_id = userOrg.organization_id
  profile.role = userOrg.role
  profile.organizations = userOrg.organizations

  // Get user's leave balances for current year
  const { data: leaveBalances } = await supabase
    .from('leave_balances')
    .select(`
      *,
      leave_types (
        name,
        color
      )
    `)
    .eq('user_id', user.id)
    .eq('year', new Date().getFullYear())

  // Get user's recent leave requests
  const { data: recentRequests } = await supabase
    .from('leave_requests')
    .select(`
      id,
      start_date,
      end_date,
      status,
      leave_types!inner (
        name,
        color
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5)

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrator'
      case 'manager': return 'Menedżer'
      case 'employee': return 'Pracownik'
      default: return role
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-destructive/10 text-destructive-foreground border-destructive/20'
      case 'manager': return 'bg-primary/10 text-primary-foreground border-primary/20'
      case 'employee': return 'bg-success/10 text-success-foreground border-success/20'
      default: return 'bg-muted text-muted-foreground border-border'
    }
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-background">
        <div className="py-11">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <PageHeader
              title="Profil użytkownika"
              description="Zarządzaj swoimi danymi osobowymi i ustawieniami konta"
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column - Profile Overview */}
              <div className="lg:col-span-1 space-y-6">
                {/* Profile Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Podstawowe informacje
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Avatar Section */}
                    <div className="flex flex-col items-center space-y-4">
                      <AvatarUpload 
                        userId={user.id} 
                        currentAvatarUrl={profile.avatar_url}
                        userName={profile.full_name || user.email || ''}
                      />
                      <div className="text-center">
                        <h3 className="font-medium text-lg">
                          {profile.full_name || user.email}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </div>

                    {/* Role and Organization */}
                    <div className="space-y-3 pt-4 border-t">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Rola:</span>
                        <Badge className={getRoleBadgeColor(profile.role)}>
                          {getRoleDisplayName(profile.role)}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Organizacja:</span>
                        <span className="text-sm font-medium text-foreground">
                          {profile.organizations?.name}
                        </span>
                      </div>

                      {profile.employment_start_date && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Data zatrudnienia:</span>
                          <span className="text-sm text-foreground">
                            {new Date(profile.employment_start_date).toLocaleDateString('pl-PL')}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Konto utworzone:</span>
                          <span className="text-sm text-foreground">
                          {new Date(profile.created_at).toLocaleDateString('pl-PL')}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Leave Balance and Recent Requests - Using React Query */}
                <ProfileDataClient
                  userId={user.id}
                  initialLeaveBalances={leaveBalances || []}
                  initialRecentRequests={recentRequests || []}
                  monthNames={[]}
                />
              </div>

              {/* Right Column - Settings Forms */}
              <div className="lg:col-span-2 space-y-8">
                {/* Personal Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Dane osobowe
                    </CardTitle>
                    <CardDescription>
                      Zaktualizuj swoje podstawowe informacje
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ProfileForm profile={profile} />
                  </CardContent>
                </Card>

                {/* Personal Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      Ustawienia osobiste
                    </CardTitle>
                    <CardDescription>
                      Personalizuj swoje doświadczenie z aplikacją
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <PersonalSettingsForm userId={user.id} />
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
} 