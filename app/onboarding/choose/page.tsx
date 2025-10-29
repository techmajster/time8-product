'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Mail, Building2, Users, CheckCircle, ArrowRight, Plus } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { OrganizationStatusResponse } from '@/types/onboarding'

interface Invitation {
  id: string
  organization_id: string
  role: string
  team_id?: string | null
  organizations: {
    name: string
  }
  teams?: {
    name: string
  } | null
}

export default function ChoosePage() {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [acceptingInvitation, setAcceptingInvitation] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const t = useTranslations('onboarding')

  useEffect(() => {
    const checkUserAndInvitations = async () => {
      const supabase = createClient()
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        router.push('/login')
        return
      }

      setUser(user)

      try {
        // Check organization status to get pending invitations
        const response = await fetch('/api/user/organization-status')
        if (response.ok) {
          const data: OrganizationStatusResponse = await response.json()
          
          // If user has organizations, redirect to dashboard
          if (data.scenario === 'has_organizations') {
            router.push('/dashboard')
            return
          }
          
          // If user has no invitations, redirect to welcome screen
          if (data.scenario === 'no_invitations') {
            router.push('/onboarding/welcome')
            return
          }
          
          // User has invitations - show choice screen
          if (data.pendingInvitations) {
            setInvitations(data.pendingInvitations)
          }
        } else {
          throw new Error('Failed to check organization status')
        }
      } catch (error) {
        console.error('Error checking invitations:', error)
        setError('Failed to load invitations. Please try again.')
      }
      
      setLoading(false)
    }

    checkUserAndInvitations()
  }, [router])

  const acceptInvitation = async (invitationId: string) => {
    try {
      setAcceptingInvitation(invitationId)
      setError(null)

      const invitation = invitations.find(inv => inv.id === invitationId)
      if (!invitation) return

      // Create user organization membership
      const supabase = createClient()
      
      // Accept invitation by creating user_organizations entry
      const { error: userOrgError } = await supabase
        .from('user_organizations')
        .insert({
          user_id: user.id,
          organization_id: invitation.organization_id,
          role: invitation.role,
          team_id: invitation.team_id,
          is_active: true,
          is_default: true,
          joined_via: 'invitation'
        })

      if (userOrgError) throw userOrgError

      // Mark invitation as accepted
      const { error: invitationError } = await supabase
        .from('invitations')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString()
        })
        .eq('id', invitationId)

      if (invitationError) {
        console.error('Warning: Failed to mark invitation as accepted:', invitationError)
      }

      // Success - redirect to dashboard
      router.push('/dashboard')
      
    } catch (error: any) {
      console.error('Error accepting invitation:', error)
      setError(error.message || 'Failed to accept invitation. Please try again.')
    } finally {
      setAcceptingInvitation(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-2xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-green-50 rounded-full flex items-center justify-center">
            <Mail className="h-8 w-8 text-green-600" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">
              {t('choose.title')}
            </h1>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {t('choose.subtitle')}
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Pending Invitations */}
        <Card className="border-0 shadow-xl bg-card/95 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Mail className="h-5 w-5 text-green-600" />
              {t('choose.invitations.title')}
            </CardTitle>
            <CardDescription>
              {t('choose.invitations.description', { count: invitations.length })}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {invitations.map((invitation) => (
              <div
                key={invitation.id}
                className="flex items-center justify-between p-4 border border rounded-lg hover:border transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">
                      {invitation.organizations.name}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>Role: {invitation.role}</span>
                      {invitation.teams?.name && (
                        <>
                          <span>•</span>
                          <span>Team: {invitation.teams.name}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  onClick={() => acceptInvitation(invitation.id)}
                  disabled={acceptingInvitation === invitation.id}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {acceptingInvitation === invitation.id ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-card mr-2" />
                      {t('choose.invitations.accepting')}
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      {t('choose.invitations.accept')}
                    </>
                  )}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Alternative Option */}
        <div className="text-center space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-muted"></div>
            <span className="text-sm text-muted-foreground bg-card px-4">
              {t('choose.or')}
            </span>
            <div className="flex-1 h-px bg-muted"></div>
          </div>

          <Card className="border-2 border-dashed border hover:border transition-colors">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Plus className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground mb-2">
                    {t('choose.createOwn.title')}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {t('choose.createOwn.description')}
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => router.push('/onboarding/create-workspace')}
                    className="w-full"
                  >
                    {t('choose.createOwn.cta')}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}