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
import { CheckCircle, Mail, Search, ArrowLeft, Eye, EyeOff, PartyPopper, Clock } from 'lucide-react'
import Link from 'next/link'

interface InvitationDetails {
  id: string
  email: string
  full_name: string
  role: string
  organization_id: string
  organizations: {
    name: string
  }[]
  team_id?: string | null
  teams?: {
    name: string
  }[] | null
}

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
  
  // Invitation token flow state
  const [invitationDetails, setInvitationDetails] = useState<InvitationDetails | null>(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [creatingAccount, setCreatingAccount] = useState(false)
  const [accountCreated, setAccountCreated] = useState(false)
  const [redirectCountdown, setRedirectCountdown] = useState(5)
  
  // Tab states for manual join
  const [invitationCode, setInvitationCode] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [processing, setProcessing] = useState(false)

  // Process invitation token from URL
  useEffect(() => {
    const token = searchParams.get('token')
    console.log('🔍 URL search params:', Object.fromEntries(searchParams.entries()))
    console.log('🎫 Token from URL:', token)
    
    // FORCE DEPLOYMENT - Production not updating properly
    if (token) {
      console.log('🎫 Processing invitation token:', token)
      processInvitationToken(token)
      return
    }
    
    console.log('⚠️ No token found, showing manual join interface')
    // If no token, load user and their pending invitations
    loadUserAndInvitations()
  }, [searchParams])

  // Countdown timer for redirect
  useEffect(() => {
    if (accountCreated && redirectCountdown > 0) {
      const timer = setTimeout(() => {
        setRedirectCountdown(redirectCountdown - 1)
      }, 1000)
      return () => clearTimeout(timer)
    } else if (accountCreated && redirectCountdown === 0) {
      router.push('/dashboard')
    }
  }, [accountCreated, redirectCountdown, router])

  const processInvitationToken = async (token: string) => {
    try {
      setLoading(true)
      setError(null)
      
      const supabase = createClient()
      
      // Look up invitation by token
      const { data: invitation, error: invitationError } = await supabase
        .from('invitations')
        .select(`
          *,
          organizations (name),
          teams (name)
        `)
        .eq('token', token)
        .eq('status', 'pending')
        .single()

      if (invitationError || !invitation) {
        console.error('❌ Invitation lookup error:', invitationError)
        setError('Invalid or expired invitation link.')
        setLoading(false)
        return
      }

      console.log('📧 Invitation found:', invitation)
      
      // Check if invitation has expired
      if (new Date(invitation.expires_at) < new Date()) {
        setError('This invitation has expired. Please contact your administrator for a new invitation.')
        setLoading(false)
        return
      }

      // Store invitation details for password creation
      setInvitationDetails(invitation)
      setLoading(false)
      
    } catch (error) {
      console.error('❌ Token processing error:', error)
      setError('Failed to process invitation. Please try again.')
      setLoading(false)
    }
  }

  const handleCreateAccountWithInvitation = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!invitationDetails) return
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.')
      return
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    
    try {
      setCreatingAccount(true)
      setError(null)
      
      // Create account via custom API that handles both signup and invitation acceptance
      const response = await fetch('/api/auth/signup-with-invitation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: invitationDetails.email,
          password: password,
          full_name: invitationDetails.full_name,
          invitation_id: invitationDetails.id,
          organization_id: invitationDetails.organization_id,
          role: invitationDetails.role,
          team_id: invitationDetails.team_id
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create account')
      }

      console.log('✅ Account created and invitation accepted:', result)
      
      // Auto-login the new user if magic link is provided
      if (result.magicLink) {
        console.log('🔐 Auto-logging in with magic link')
        // Redirect to the magic link which will log the user in
        window.location.href = result.magicLink
        return
      }
      
      // Show success screen
      setAccountCreated(true)
      
    } catch (error: any) {
      console.error('❌ Account creation error:', error)
      setError(error.message || 'Failed to create account. Please try again.')
    } finally {
      setCreatingAccount(false)
    }
  }

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

  const acceptInvitation = async (invitationId: string) => {
    setProcessing(true)
    setError(null)

    try {
      const supabase = createClient()

      // Update user's profile with organization info
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          organization_id: invitationDetails?.organization_id, // Use invitationDetails here
          role: invitationDetails?.role, // Use invitationDetails here
          team_id: invitationDetails?.team_id, // Use invitationDetails here
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
        .eq('id', invitationId)

      if (invitationError) throw invitationError

             setSuccess(`Successfully joined ${invitationDetails?.organizations[0]?.name || 'the organization'}!`)
      
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
      await acceptInvitation(result.id) // Assuming result.id is the invitation ID

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

  const requestAccess = async (organizationId: string) => {
    setProcessing(true)
    setError(null)

    try {
      const response = await fetch('/api/organization/request-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          organization_id: organizationId,
          message: `User ${user.email} would like to join ${organizations.find(org => org.id === organizationId)?.name || 'this organization'}`
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send request')
      }

      setSuccess(`Access request sent to ${organizations.find(org => org.id === organizationId)?.name || 'this organization'}! They will review your request.`)
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">
            {searchParams.get('token') ? 'Processing your invitation...' : 'Loading...'}
          </p>
        </div>
      </div>
    )
  }

  // Show success screen after account creation
  if (accountCreated && invitationDetails) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <PartyPopper className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-green-800">Account Created Successfully!</h1>
            <p className="text-muted-foreground">
              Welcome to {invitationDetails.organizations[0]?.name}! Your account has been set up.
            </p>
          </div>

          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-green-800 font-medium">Account created and verified</span>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-green-800 font-medium">Added to {invitationDetails.organizations[0]?.name} as {invitationDetails.role}</span>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-green-800 font-medium">Invitation accepted</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Alert className="bg-blue-50 border-blue-200">
            <Mail className="h-4 w-4" />
            <AlertDescription className="text-blue-800">
              <strong>Important:</strong> Please check your email ({invitationDetails.email}) for important account information and welcome details.
            </AlertDescription>
          </Alert>

          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Redirecting to dashboard in {redirectCountdown} seconds...</span>
            </div>
            
            <Button 
              onClick={() => router.push('/dashboard')} 
              className="w-full bg-green-600 hover:bg-green-700"
            >
              Go to Dashboard Now
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Show invitation password creation form if we have invitation details
  if (invitationDetails) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold">Welcome to {invitationDetails.organizations[0]?.name}!</h1>
            <p className="text-muted-foreground">
              You've been invited as {invitationDetails.role}. Create your password to get started.
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Set Your Password</CardTitle>
              <CardDescription>
                Creating account for {invitationDetails.email}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateAccountWithInvitation} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Create a strong password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={creatingAccount}
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={creatingAccount}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Must be at least 6 characters long
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={creatingAccount}
                    required
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={!password || !confirmPassword || creatingAccount}
                >
                  {creatingAccount ? 'Creating Account...' : 'Create Account & Join Organization'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link href="/login" className="underline">
                Sign in instead
              </Link>
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Original manual join interface for users without token
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Pending Invitations
              </CardTitle>
              <CardDescription>
                You have invitations waiting for you
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {pendingInvitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div>
                    <h3 className="font-medium">
                      {invitation.organizations[0]?.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Role: {invitation.role}
                      {invitation.teams?.[0]?.name && ` • Team: ${invitation.teams[0].name}`}
                    </p>
                  </div>
                  <Button
                    onClick={() => acceptInvitation(invitation.id)}
                    disabled={processing}
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
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Find Your Company
                </CardTitle>
                <CardDescription>
                  Search for your organization and request access
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="search">Company Name</Label>
                  <Input
                    id="search"
                    type="text"
                    placeholder="Search for your company..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    disabled={processing}
                  />
                </div>

                {organizations.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Search Results</h4>
                    {organizations.map((org) => (
                      <div
                        key={org.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div>
                          <h5 className="font-medium">{org.name}</h5>
                          {org.description && (
                            <p className="text-sm text-muted-foreground">{org.description}</p>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          onClick={() => requestAccess(org.id)}
                          disabled={processing}
                        >
                          Request Access
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Help Section */}
        <Card>
          <CardHeader>
            <CardTitle>Need Help?</CardTitle>
          </CardHeader>
          <CardContent>
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
    <Suspense fallback={<div>Loading...</div>}>
      <JoinPageContent />
    </Suspense>
  )
}