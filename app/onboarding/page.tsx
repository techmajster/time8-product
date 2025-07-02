import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Building2, Users } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default async function OnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check if user already has an organization
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (profile?.organization_id) {
    redirect('/dashboard')
  }

  // Check if user's domain already has an organization (for Google users)
  const emailDomain = user.email?.split('@')[1]
  const isGoogleUser = user.app_metadata.provider === 'google'
  
  let existingOrg = null
  if (isGoogleUser && emailDomain) {
    const { data } = await supabase
      .from('organizations')
      .select('id, name, google_domain')
      .eq('google_domain', emailDomain)
      .single()
    
    existingOrg = data
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Welcome to SaaS Leave System!</h1>
        <p className="mt-2 text-muted-foreground">Let's get you set up with an organization</p>
      </div>

      {existingOrg && (
        <Alert className="bg-success/5 border-success/20">
          <AlertDescription>
            Good news! Your company <strong>{existingOrg.name}</strong> is already using our system. 
            You can join automatically with your @{emailDomain} email.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="relative overflow-hidden hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Create New Organization</CardTitle>
            <CardDescription>
              Start fresh by setting up your company. You'll be the admin and can invite your team.
            </CardDescription>
          </CardHeader>
          <CardContent>
                            <Button asChild className="w-full">
                  <Link href="/onboarding/create">
                    Stwórz nową organizację
                  </Link>
                </Button>
            <p className="mt-2 text-xs text-center text-muted-foreground">
              Best for company admins or HR managers
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden hover:shadow-lg transition-shadow">
          {existingOrg && (
            <div className="absolute top-2 right-2">
              <span className="inline-flex items-center rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success-foreground">
                Recommended
              </span>
            </div>
          )}
          <CardHeader>
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-success/10">
              <Users className="h-6 w-6 text-success" />
            </div>
            <CardTitle>Join Existing Organization</CardTitle>
            <CardDescription>
              {existingOrg 
                ? `Join ${existingOrg.name} with your company email`
                : 'Enter an invite code or search for your company'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full" variant={existingOrg ? "default" : "outline"}>
              <Link href="/onboarding/join">
                {existingOrg ? 'Dołącz do organizacji' : 'Mam kod zaproszenia'}
              </Link>
            </Button>
            <p className="mt-2 text-xs text-center text-muted-foreground">
              For employees joining their company
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 