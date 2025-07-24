'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle, Mail, Search, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface PendingInvitation {
  id: string
  organization_id: string
  organizations: {
    name: string
  }[]
  role: string
  team_id: string | null
  teams?: {
    name: string
  }[] | null
}

interface Organization {
  id: string
  name: string
  description?: string
}

function JoinPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  // Tab states
  const [invitationCode, setInvitationCode] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    loadUserAndInvitations()
  }, [])

  const loadUserAndInvitations = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      setUser(user)

      // Check for pending invitations
      const { data: invitations } = await supabase
        .from('invitations')
        .select(`
          id,
          organization_id,
          role,
          team_id,
          organizations(name),
          teams(name)
        `)
        .eq('email', user.email?.toLowerCase())
        .eq('status', 'pending')

      setPendingInvitations(invitations || [])
      setLoading(false)
    } catch (error) {
      console.error('Error loading data:', error)
      setError('Failed to load invitation data')
      setLoading(false)
    }
  }

  const acceptInvitation = async (invitation: PendingInvitation) => {
    setProcessing(true)
    setError(null)

    try {
      const supabase = createClient()

      // Update user's profile with organization info
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          organization_id: invitation.organization_id,
          role: invitation.role,
          team_id: invitation.team_id,
        })
        .eq('id', user.id)

      if (profileError) throw profileError

      // Mark invitation as accepted
      const { error: invitationError } = await supabase
        .from('invitations')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString()
        })
        .eq('id', invitation.id)

      if (invitationError) throw invitationError

             setSuccess(`Successfully joined ${invitation.organizations[0]?.name || 'the organization'}!`)
      
      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)

    } catch (error: any) {
      console.error('Error accepting invitation:', error)
      setError(error.message || 'Failed to accept invitation')
    } finally {
      setProcessing(false)
    }
  }

  const joinByCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!invitationCode.trim()) return

    setProcessing(true)
    setError(null)

    try {
      const response = await fetch('/api/invitations/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: invitationCode.trim() })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Invalid invitation code')
      }

      // If valid, accept the invitation
      await acceptInvitation(result)

    } catch (error: any) {
      setError(error.message || 'Failed to join with code')
    } finally {
      setProcessing(false)
    }
  }

  const searchOrganizations = async () => {
    if (!searchTerm.trim()) return

    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('organizations')
        .select('id, name, description')
        .ilike('name', `%${searchTerm.trim()}%`)
        .limit(10)

      setOrganizations(data || [])
    } catch (error) {
      console.error('Error searching organizations:', error)
    }
  }

  const requestAccess = async (organizationId: string, organizationName: string) => {
    setProcessing(true)
    setError(null)

    try {
      const response = await fetch('/api/organization/request-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          organization_id: organizationId,
          message: `User ${user.email} would like to join ${organizationName}`
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send request')
      }

      setSuccess(`Access request sent to ${organizationName}! They will review your request.`)
      setSearchTerm('')
      setOrganizations([])

    } catch (error: any) {
      setError(error.message || 'Failed to request access')
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading your invitations...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <Button variant="ghost" size="sm" asChild className="mb-4">
            <Link href="/onboarding">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Onboarding
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">Join an Organization</h1>
          <p className="text-muted-foreground">
            Accept an invitation, enter a code, or request access to your company
          </p>
        </div>

        {/* Alerts */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {/* Pending Invitations */}
        {pendingInvitations.length > 0 && (
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="text-green-800 flex items-center">
                <Mail className="h-5 w-5 mr-2" />
                You Have Pending Invitations!
              </CardTitle>
              <CardDescription>
                You've been invited to join the following organizations:
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {pendingInvitations.map((invitation) => (
                                 <div key={invitation.id} className="flex items-center justify-between p-4 bg-white rounded-lg border">
                   <div>
                     <h3 className="font-semibold">{invitation.organizations[0]?.name || 'Unknown Organization'}</h3>
                     <p className="text-sm text-muted-foreground">
                       Role: {invitation.role}
                       {invitation.teams?.[0]?.name && ` • Team: ${invitation.teams[0].name}`}
                     </p>
                  </div>
                  <Button 
                    onClick={() => acceptInvitation(invitation)}
                    disabled={processing}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {processing ? 'Joining...' : 'Accept Invitation'}
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Join Options */}
        <Tabs defaultValue="code" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="code">Invitation Code</TabsTrigger>
            <TabsTrigger value="search">Find Your Company</TabsTrigger>
          </TabsList>
          
          <TabsContent value="code" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Enter Invitation Code</CardTitle>
                <CardDescription>
                  If you have an invitation code from your company, enter it below
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={joinByCode} className="space-y-4">
                  <div>
                    <Label htmlFor="code">Invitation Code</Label>
                    <Input
                      id="code"
                      type="text"
                      placeholder="Enter your invitation code"
                      value={invitationCode}
                      onChange={(e) => setInvitationCode(e.target.value)}
                      disabled={processing}
                    />
                  </div>
                  <Button type="submit" disabled={!invitationCode.trim() || processing}>
                    {processing ? 'Joining...' : 'Join Organization'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="search" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Find Your Company</CardTitle>
                <CardDescription>
                  Search for your organization and request access
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Search for your company name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && searchOrganizations()}
                  />
                  <Button onClick={searchOrganizations} variant="outline">
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
                
                {organizations.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Found organizations:</p>
                    {organizations.map((org) => (
                      <div key={org.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <h4 className="font-medium">{org.name}</h4>
                          {org.description && (
                            <p className="text-sm text-muted-foreground">{org.description}</p>
                          )}
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => requestAccess(org.id, org.name)}
                          disabled={processing}
                        >
                          {processing ? 'Requesting...' : 'Request Access'}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                
                {searchTerm && organizations.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No organizations found. Try a different search term or contact your admin.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Help Section */}
        <Card className="bg-gray-50">
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-2">Need Help?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              If you can't find your organization or don't have an invitation code:
            </p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Contact your HR department or system administrator</li>
              <li>• Ask them to send you an invitation link</li>
              <li>• Make sure you're using the correct email address</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function JoinPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    }>
      <JoinPageContent />
    </Suspense>
  )
}