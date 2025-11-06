import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { AppLayout } from '@/components/app-layout'
import { LeaveRequestsClient } from './components/LeaveRequestsClient'
import { getTranslations } from 'next-intl/server'

async function checkAccess() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get current active organization
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

  if (!userOrg) redirect('/onboarding')

  // Only managers and admins can see leave requests
  if (userOrg.role !== 'manager' && userOrg.role !== 'admin') {
    redirect('/leave')
  }
}

export default async function LeaveRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  await checkAccess()

  const resolvedSearchParams = await searchParams
  const activeTab = resolvedSearchParams.tab || 'nowe'
  const t = await getTranslations('leaveRequestsPage')

  return (
    <AppLayout>
      <div className="py-11 flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2.5">
                <h1 className="font-semibold text-3xl leading-9 text-foreground">
                  {t('title')}
                </h1>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs and Actions */}
        <div className="flex items-center justify-between">
          <Tabs value={activeTab}>
            <TabsList>
              <TabsTrigger value="nowe" asChild>
                <a href="?tab=nowe">{t('tabs.new')}</a>
              </TabsTrigger>
              <TabsTrigger value="zaakceptowane" asChild>
                <a href="?tab=zaakceptowane">{t('tabs.accepted')}</a>
              </TabsTrigger>
              <TabsTrigger value="odrzucone" asChild>
                <a href="?tab=odrzucone">{t('tabs.rejected')}</a>
              </TabsTrigger>
              <TabsTrigger value="zrealizowane" asChild>
                <a href="?tab=zrealizowane">{t('tabs.completed')}</a>
              </TabsTrigger>
              <TabsTrigger value="wszystkie" asChild>
                <a href="?tab=wszystkie">{t('tabs.all')}</a>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              {t('actions.filters')}
            </Button>
            <Button variant="outline" size="sm">
              {t('actions.export')}
            </Button>
          </div>
        </div>

        {/* Content */}
        <LeaveRequestsClient />
      </div>
    </AppLayout>
  )
} 