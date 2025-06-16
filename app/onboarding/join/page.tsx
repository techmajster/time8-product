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

    // In a real app, you'd validate the invite code
    // For now, we'll show an error
    setError('Invite codes are not yet implemented. Please ask your admin to add you.')
    setLoading(false)
  }

  if (checking) {
    return <div>Checking your eligibility...</div>
  }

  return (
    <div className="space-y-6">
      <Link 
        href="/onboarding" 
        className="inline-flex items-center text-sm text-muted-foreground hover:text-gray-900"
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
                  placeholder="Enter your invite code"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Ask your HR manager or admin for this code
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