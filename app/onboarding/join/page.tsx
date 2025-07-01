'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, Users, CheckCircle } from 'lucide-react'
import Link from 'next/link'

export default function JoinOrganizationPage() {
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [inviteCode, setInviteCode] = useState('')
  const [autoJoinOrg, setAutoJoinOrg] = useState<any>(null)
  
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkAutoJoin()
  }, [])

  const checkAutoJoin = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) {
      setChecking(false)
      return
    }

    const emailDomain = user.email.split('@')[1]
    const isGoogleUser = user.app_metadata.provider === 'google'

    if (isGoogleUser && emailDomain) {
      const { data } = await supabase
        .from('organizations')
        .select('*')
        .eq('google_domain', emailDomain)
        .single()

      if (data) {
        setAutoJoinOrg(data)
      }
    }
    setChecking(false)
  }

  const handleAutoJoin = async () => {
    if (!autoJoinOrg) return
    
    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Update user profile with organization
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          organization_id: autoJoinOrg.id,
          role: 'employee', // Default role for new joiners
        })
        .eq('id', user.id)

      if (profileError) throw profileError

      router.push('/onboarding/complete')
    } catch (err) {
      console.error('Error joining organization:', err)
      setError(err instanceof Error ? err.message : 'Failed to join organization')
      setLoading(false)
    }
  }

  const handleManualJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Look up invitation by invitation code
      const { data: invitation, error: invitationError } = await supabase
        .from('invitations')
        .select('id, organization_id, email, role, status, expires_at')
        .eq('invitation_code', inviteCode.trim().toUpperCase())
        .eq('status', 'pending')
        .single()

      if (invitationError || !invitation) {
        if (invitationError?.code === 'PGRST116') {
          throw new Error('No invitation found with this code. Please check the code and try again.')
        }
        throw new Error('Invalid or expired invitation code. Please check the code and try again.')
      }

      // Get organization details separately
      const { data: organization } = await supabase
        .from('organizations')
        .select('id, name')
        .eq('id', invitation.organization_id)
        .single()

      // Check if invitation has expired
      if (new Date(invitation.expires_at) < new Date()) {
        throw new Error('This invitation has expired. Please contact your admin for a new invitation.')
      }

      // Check if the user's email matches the invitation
      if (invitation.email.toLowerCase() !== user.email?.toLowerCase()) {
        throw new Error(`This invitation is for ${invitation.email}. Please sign in with the correct email address or contact your admin.`)
      }

      // Update user profile with organization and role from invitation
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          organization_id: invitation.organization_id,
          role: invitation.role,
        })
        .eq('id', user.id)

      if (profileError) throw profileError

      // Mark invitation as accepted
      const { error: acceptError } = await supabase
        .from('invitations')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString()
        })
        .eq('id', invitation.id)

      if (acceptError) throw acceptError

      // Success! Redirect to completion page
      router.push('/onboarding/complete')
    } catch (err) {
      console.error('Error joining organization:', err)
      setError(err instanceof Error ? err.message : 'Failed to join organization')
      setLoading(false)
    }
  }

  if (checking) {
    return <div>Checking your eligibility...</div>
  }

  return (
    <div className="space-y-6">
      <Link 
        href="/onboarding" 
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back
      </Link>

      {autoJoinOrg ? (
        <Card>
          <CardHeader>
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-success/10">
              <CheckCircle className="h-6 w-6 text-success" />
            </div>
            <CardTitle>You're eligible to join {autoJoinOrg.name}!</CardTitle>
            <CardDescription>
              Your email domain matches this organization. You can join automatically.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm font-medium">Organization Details</p>
              <p className="text-sm text-muted-foreground mt-1">{autoJoinOrg.name}</p>
              <p className="text-xs text-muted-foreground mt-1">Domain: @{autoJoinOrg.google_domain}</p>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button 
              onClick={handleAutoJoin} 
              className="w-full" 
              disabled={loading}
            >
              {loading ? 'Joining...' : `Join ${autoJoinOrg.name}`}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Join an Organization</CardTitle>
            <CardDescription>
              Enter the invite code provided by your organization admin
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleManualJoin}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="inviteCode">Invite Code</Label>
                <Input
                  id="inviteCode"
                  placeholder="e.g., AB3CD4FG"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  maxLength={8}
                  className="font-mono text-center tracking-wider text-lg"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Ask your HR manager or admin for this 8-character code
                </p>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </CardContent>
            
            <CardContent>
              <Button type="submit" className="w-full " disabled={loading}>
                {loading ? 'Joining...' : 'Join Organization'}
              </Button>
            </CardContent>
          </form>
        </Card>
      )}
    </div>
  )
} 