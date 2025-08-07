'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Building2, Users, CheckCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

function OnboardingContent() {
  const searchParams = useSearchParams()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [existingOrg, setExistingOrg] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showVerificationSuccess, setShowVerificationSuccess] = useState(false)

  useEffect(() => {
    async function loadData() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        redirect('/login')
        return
      }

      setUser(user)

      // Check for email verification success from URL params or cookie
      const verified = searchParams.get('verified')
      const emailVerifiedCookie = document.cookie
        .split('; ')
        .find(row => row.startsWith('email_verified='))
        ?.split('=')[1]
      
      if (verified === 'true' || emailVerifiedCookie === 'true') {
        setShowVerificationSuccess(true)
        // Clear the cookie after reading it
        if (emailVerifiedCookie === 'true') {
          document.cookie = 'email_verified=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT'
        }
        // Auto-hide the message after 8 seconds
        setTimeout(() => setShowVerificationSuccess(false), 8000)
      }

      // MULTI-ORG UPDATE: Check if user already has an organization via API
      try {
        const orgResponse = await fetch(`/api/employees/${user.id}/organization`)
        if (orgResponse.ok) {
          const orgData = await orgResponse.json()
          console.log('✅ User has organization, redirecting to dashboard')
          redirect('/dashboard')
          return
        } else {
          console.log('❌ User has no organization, showing onboarding')
        }
      } catch (error) {
        console.log('❌ Error checking organization:', error)
        // Continue with onboarding flow
      }

      // Check if user has any pending invitations
      const emailDomain = user.email?.split('@')[1]
      const isGoogleWorkspaceUser = user.app_metadata.provider === 'google' && 
        emailDomain && 
        !['gmail.com', 'googlemail.com'].includes(emailDomain.toLowerCase())
      
      // Check for pending invitations for this user via API
      let pendingInvitations: any[] = []
      try {
        const invitationResponse = await fetch(`/api/invitations/lookup?email=${encodeURIComponent(user.email!)}`)
        if (invitationResponse.ok) {
          const invitationData = await invitationResponse.json()
          pendingInvitations = invitationData.invitations || []
        }
      } catch (error) {
        console.log('❌ Error checking pending invitations:', error)
      }

      console.log('📧 Pending invitations check:', { 
        count: pendingInvitations.length,
        invitations: pendingInvitations
      })

      // Handle pending invitations
      if (pendingInvitations && pendingInvitations.length > 0) {
        const invitation = pendingInvitations[0] as any
        setExistingOrg({
          id: invitation.organization_id,
          name: invitation.organizations?.name || 'Unknown Organization',
          hasInvitation: true
        })
      }

      setLoading(false)
    }

    loadData()
  }, [searchParams])

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  const emailDomain = user?.email?.split('@')[1]
  const isGoogleWorkspaceUser = user?.app_metadata.provider === 'google' && 
    emailDomain && 
    !['gmail.com', 'googlemail.com'].includes(emailDomain.toLowerCase())

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Welcome to SaaS Leave System!</h1>
        <p className="mt-2 text-muted-foreground">Let's get you set up with an organization</p>
      </div>

      {showVerificationSuccess && (
        <Alert className="bg-green-50 border-green-200 text-green-800">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Email verified successfully!</strong> Your account has been confirmed and you're now logged in. Choose how you'd like to continue below.
          </AlertDescription>
        </Alert>
      )}

      {existingOrg?.hasInvitation ? (
        <Alert className="bg-green-50 border-green-200">
          <AlertDescription>
            <strong>Invitation Found!</strong> You've been invited to join <strong>{existingOrg.name}</strong>. 
            You can accept the invitation and start using the system right away.
          </AlertDescription>
        </Alert>
      ) : isGoogleWorkspaceUser ? (
        <Alert className="bg-blue-50 border-blue-200">
          <AlertDescription>
            <strong>Google Workspace Account Detected!</strong> You're using a company email from @{emailDomain}. 
            You can create a new organization for your company or wait for an invitation from your admin.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="bg-gray-50 border-gray-200">
          <AlertDescription>
            <strong>Welcome!</strong> Choose how you'd like to get started with our leave management system.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {/* Create New Organization Card */}
        <Card className={`relative overflow-hidden hover:shadow-lg transition-shadow ${
          !existingOrg?.hasInvitation && isGoogleWorkspaceUser 
            ? 'ring-2 ring-primary/20 bg-primary/5' 
            : ''
        }`}>
          {!existingOrg?.hasInvitation && isGoogleWorkspaceUser && (
            <div className="absolute top-2 right-2">
              <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                Recommended
              </span>
            </div>
          )}
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
            <Button asChild className="w-full" variant={
              !existingOrg?.hasInvitation && isGoogleWorkspaceUser 
                ? "default" 
                : "outline"
            }>
              <Link href="/onboarding/create">
                Stwórz nową organizację
              </Link>
            </Button>
            <p className="mt-2 text-xs text-center text-muted-foreground">
              Best for company admins or HR managers
            </p>
          </CardContent>
        </Card>

        {/* Join Existing Organization Card */}
        <Card className={`relative overflow-hidden hover:shadow-lg transition-shadow ${
          existingOrg?.hasInvitation ? 'ring-2 ring-green-200 bg-green-50' : ''
        }`}>
          {existingOrg?.hasInvitation && (
            <div className="absolute top-2 right-2">
              <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                You're Invited!
              </span>
            </div>
          )}
          <CardHeader>
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <CardTitle>Join Existing Organization</CardTitle>
            <CardDescription>
              {existingOrg?.hasInvitation 
                ? `Accept your invitation to join ${existingOrg.name}`
                : 'Enter an invitation code or request access to your company'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full" variant={existingOrg?.hasInvitation ? "default" : "outline"}>
              <Link href="/onboarding/join">
                {existingOrg?.hasInvitation ? 'Accept Invitation' : 'Join Organization'}
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

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <OnboardingContent />
    </Suspense>
  )
}