import { AppLayout } from '@/components/app-layout'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/page-header'
import { Building2, Users, Calendar, Clock, Palette, Globe } from 'lucide-react'
import { OrganizationSettingsForm } from './components/OrganizationSettingsForm'
import { OrganizationBrandingForm } from './components/OrganizationBrandingForm'
import { LeaveTypesManager } from './components/LeaveTypesManager'
import { LeavePoliciesForm } from './components/LeavePoliciesForm'
import { HolidayCalendarSettings } from './components/HolidayCalendarSettings'

export default async function SettingsPage() {
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
  if (profile.role !== 'admin' && profile.role !== 'manager') {
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

  // Get team count
  const { count: teamCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', profile.organization_id)

  // Get leave requests count for this year
  const currentYear = new Date().getFullYear()
  const { count: leaveRequestsCount } = await supabase
    .from('leave_requests')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', profile.organization_id)
    .gte('created_at', `${currentYear}-01-01`)

  return (
    <AppLayout>
      <div className="min-h-screen bg-background">
        <div className="p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <PageHeader
              title="Ustawienia"
              description="Zarządzaj ustawieniami organizacji, rodzajami urlopów i politykami"
            />

            {/* Organization Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Organizacja</CardTitle>
                  <Building2 className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{organization?.name}</div>
                  <p className="text-xs text-muted-foreground">
                    Utworzona {organization?.created_at ? new Date(organization.created_at).toLocaleDateString('pl-PL') : 'Nieznana data'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Zespół</CardTitle>
                  <Users className="h-4 w-4 text-success" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{teamCount || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    aktywnych członków
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Wnioski w tym roku</CardTitle>
                  <Calendar className="h-4 w-4 text-warning" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{leaveRequestsCount || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    złożonych wniosków
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Settings Sections */}
            <div className="space-y-8">
              {/* Organization Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Ustawienia organizacji
                  </CardTitle>
                  <CardDescription>
                    Podstawowe informacje o organizacji i konfiguracja domeny Google
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <OrganizationSettingsForm organization={organization} />
                </CardContent>
              </Card>

              {/* Organization Branding */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="h-5 w-5" />
                    Branding organizacji
                  </CardTitle>
                  <CardDescription>
                    Logo, kolory i inne elementy wizualnej identyfikacji
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <OrganizationBrandingForm organization={organization} />
                </CardContent>
              </Card>

              {/* Holiday Calendar Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    Kalendarz świąt
                  </CardTitle>
                  <CardDescription>
                    Wybierz kalendarz narodowych świąt dla swojej organizacji
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <HolidayCalendarSettings organizationId={profile.organization_id} currentCountryCode={organization?.country_code || 'PL'} />
                </CardContent>
              </Card>

              {/* Leave Types Management */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Rodzaje urlopów
                  </CardTitle>
                  <CardDescription>
                    Zarządzaj dostępnymi rodzajami urlopów w organizacji
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <LeaveTypesManager 
                    leaveTypes={leaveTypes || []}
                    organizationId={profile.organization_id}
                  />
                </CardContent>
              </Card>

              {/* Leave Policies */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Polityki urlopowe
                  </CardTitle>
                  <CardDescription>
                    Skonfiguruj zasady zatwierdzania i ograniczenia urlopów
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <LeavePoliciesForm organizationId={profile.organization_id} />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
} 