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
import { CheckCircle, Mail, Search, ArrowLeft, Eye, EyeOff, PartyPopper, Clock, Building2 } from 'lucide-react'
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
      
      // Use API endpoint to lookup invitation (bypasses RLS)
      const response = await fetch(`/api/invitations/lookup?token=${encodeURIComponent(token)}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        console.error('❌ Invitation lookup error:', errorData)
        setError(errorData.error || 'Invalid or expired invitation link.')
        setLoading(false)
        return
      }
      
      const invitation = await response.json()
      console.log('📧 Invitation found:', invitation)
      
      // Transform the API response to match expected format
      const invitationDetails = {
        ...invitation,
        organizations: [{ name: invitation.organization_name }],
        teams: invitation.team_name ? [{ name: invitation.team_name }] : null
      }

      console.log('📧 Processed invitation details:', invitationDetails)
      
      // Check if invitation has expired
      if (new Date(invitation.expires_at) < new Date()) {
        setError('This invitation has expired. Please contact your administrator for a new invitation.')
        setLoading(false)
        return
      }

      // Store invitation details for password creation
      setInvitationDetails(invitationDetails)
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
      <div className="bg-white min-h-screen relative w-full">
        {/* Logo - positioned in top-left corner */}
        <div className="absolute flex flex-row gap-[19.454px] items-center justify-start left-8 p-0 top-8">
          <div className="h-[30px] relative w-[123.333px]">
            <div className="absolute flex h-[17.083px] items-center justify-center left-[67.08px] top-[8.33px] w-[18.75px]">
              <div className="flex-none scale-y-[-100%]">
                <div className="h-[17.083px] relative w-[18.75px]">
                  <div className="absolute inset-[-12.2%_-11.11%]">
                    <svg className="block w-full h-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 23">
                      <path
                        d="M3 11.3333L3 15.9167C3 18.2179 4.86548 20.0833 7.16667 20.0833H17.5833C19.8845 20.0833 21.75 18.2179 21.75 15.9167V13.4167C21.75 12.2661 20.8173 11.3333 19.6667 11.3333H3ZM3 11.3333L3 7.16666C3 4.86548 4.86548 3 7.16667 3H19.25C19.4801 3 19.6667 3.18655 19.6667 3.41667V5.08333"
                        stroke="var(--stroke-0, black)"
                        strokeLinejoin="bevel"
                        strokeWidth="4.16667"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute flex h-[23.333px] items-center justify-center left-[2.5px] top-[4.17px] w-[19.583px]">
              <div className="flex-none rotate-[180deg] scale-y-[-100%]">
                <div className="h-[23.333px] relative w-[19.583px]">
                  <div className="absolute bottom-0 left-0 right-[-10.64%] top-[-8.93%]">
                    <svg className="block w-full h-full" fill="none" preserveAspectRatio="none" viewBox="0 0 22 27">
                      <path
                        d="M0 3H10.4167M10.4167 3H19.1667C19.3968 3 19.5833 3.18655 19.5833 3.41667V5.08333M10.4167 3V26.3333"
                        stroke="var(--stroke-0, black)"
                        strokeLinejoin="bevel"
                        strokeWidth="4.16667"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute flex h-[19.167px] items-center justify-center left-[36.25px] top-[8.33px] w-[22.5px]">
              <div className="flex-none rotate-[180deg] scale-y-[-100%]">
                <div className="h-[19.167px] relative w-[22.5px]">
                  <div className="absolute bottom-0 left-[-9.26%] right-[-9.26%] top-[-10.87%]">
                    <svg className="block w-full h-full" fill="none" preserveAspectRatio="none" viewBox="0 0 28 23">
                      <path
                        d="M14.25 3V22.1634M14.25 3L7.16546 3.00205C4.86475 3.00272 3 4.868 3 7.16872V22.1667M14.25 3L20.9167 3C21.1468 3 21.3333 3.18655 21.3333 3.41667V5.08623M25.5 22.1634V5.08623"
                        stroke="var(--stroke-0, black)"
                        strokeLinejoin="bevel"
                        strokeWidth="4.16667"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute flex h-[21.25px] items-center justify-center left-[27.08px] top-[6.25px] w-0">
              <div className="flex-none rotate-[180deg] scale-y-[-100%]">
                <div className="h-[21.25px] relative" style={{ width: "3.84877e-14px" }}>
                  <div className="absolute bottom-0 left-[-2.08px] right-[-2.08px] top-0">
                    <svg className="block w-full h-full" fill="none" preserveAspectRatio="none" viewBox="0 0 6 22">
                      <path
                        d="M3 0L3 21.25"
                        stroke="var(--stroke-0, black)"
                        strokeLinejoin="bevel"
                        strokeWidth="4.16667"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute inset-[12.5%_9.12%_54.17%_77.36%] rounded-[20px] border-[4.167px] border-solid border-violet-700" />
            <div className="absolute bottom-[13.89%] left-3/4 right-[6.76%] top-[45.83%]">
              <div className="absolute inset-[-17.24%_-9.26%]">
                <svg className="block w-full h-full" fill="none" preserveAspectRatio="none" viewBox="0 0 28 18">
                  <path
                    d="M19.4583 3H9.04167C5.70495 3 3 5.70495 3 9.04167C3 12.3784 5.70495 15.0833 9.04167 15.0833H19.4583C22.7951 15.0833 25.5 12.3784 25.5 9.04167C25.5 5.70495 22.7951 3 19.4583 3Z"
                    stroke="rgba(109, 40, 217, 1)"
                    strokeLinejoin="bevel"
                    strokeWidth="4.16667"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Centered content - Full width */}
        <div className="flex-1 flex flex-col gap-6 items-center justify-center min-h-screen w-full">
          <div className="flex flex-col gap-12 items-center justify-start p-0 relative w-full max-w-[820px] px-8">
            {/* Header Section */}
            <div className="flex flex-col gap-3 items-center justify-start p-0 relative text-center w-full">
              <div className="flex flex-row font-semibold gap-3 items-center justify-center p-0 relative text-[48px] text-neutral-950" style={{ fontFamily: 'Geist, sans-serif', fontWeight: 600, lineHeight: '48px' }}>
                <div className="relative">
                  <p className="block leading-[48px] whitespace-pre">Welcome</p>
                </div>
                <div className="relative">
                  <p className="block leading-[48px] whitespace-pre">{invitationDetails.full_name.split(' ')[0]}!</p>
                </div>
              </div>
              <div className="font-normal relative text-[18px] text-neutral-500 w-full" style={{ fontFamily: 'Geist, sans-serif', fontWeight: 400, lineHeight: '28px' }}>
                <p className="block leading-[28px]">You've been invited as employee. Create your password to get started.</p>
              </div>
            </div>

            {/* Cards Section - 820px max width */}
            <div className="flex flex-row gap-3 items-stretch justify-center p-0 relative w-full">
              {/* Left Card - Invitation Info */}
              <div className="bg-violet-100 flex flex-col items-start justify-between p-[32px] relative rounded-[14px] flex-1 border border-neutral-200">
                <div className="flex-1 flex flex-col gap-10 items-start justify-start p-0 relative w-full">
                  <div className="flex-1 flex flex-col items-start justify-between p-0 relative w-full">
                    <div className="flex flex-row gap-2 items-start justify-start p-0 relative w-full">
                      <div className="flex-1 font-semibold h-14 leading-[28px] relative text-[18px] text-left text-neutral-900" style={{ fontFamily: 'Geist, sans-serif', fontWeight: 600 }}>
                        <p className="block mb-0">You have been invited</p>
                        <p className="block">to workspace:</p>
                      </div>
                      <div className="overflow-hidden relative w-6 h-6 flex-shrink-0">
                        <Building2 className="w-full h-full text-neutral-900" />
                      </div>
                    </div>
                    <div className="flex flex-row gap-2.5 items-center justify-start p-0 relative w-full">
                      <div className="flex-1 font-semibold relative text-[30px] text-left text-neutral-950" style={{ fontFamily: 'Geist, sans-serif', fontWeight: 600, lineHeight: '36px' }}>
                        <p className="block leading-[36px]">{invitationDetails.organizations[0]?.name}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Card - Password Form */}
              <div className="flex-1 bg-white flex flex-col gap-8 items-start justify-start p-[32px] relative rounded-[14px] border border-neutral-200">
                <div className="flex flex-col gap-10 items-start justify-start p-0 relative w-full">
                  <div className="flex flex-col gap-6 items-start justify-start p-0 relative w-full">
                    <div className="flex flex-col gap-1 items-start justify-start p-0 relative text-[18px] text-left text-neutral-900 w-full">
                      <div className="font-normal relative w-full" style={{ fontFamily: 'Geist, sans-serif', fontWeight: 400, lineHeight: '28px' }}>
                        <p className="block leading-[28px]">Set your password for account:</p>
                      </div>
                      <div className="font-semibold relative w-full" style={{ fontFamily: 'Geist, sans-serif', fontWeight: 600, lineHeight: '28px' }}>
                        <p className="block leading-[28px]">{invitationDetails.email}</p>
                      </div>
                    </div>

                    {error && (
                      <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}

                    <form onSubmit={handleCreateAccountWithInvitation} className="flex flex-col gap-4 items-start justify-start p-0 relative w-full">
                      {/* Password Input */}
                      <div className="flex flex-col gap-2 items-start justify-start p-0 relative w-full">
                        <div className="font-medium text-[14px] text-left text-neutral-950" style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500 }}>
                          <p className="block">Password</p>
                        </div>
                        <div className="flex flex-col gap-2 items-start justify-start p-0 relative w-full">
                          <div className="bg-white h-9 relative rounded-lg w-full border border-neutral-200 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
                            <div className="flex flex-row gap-1 h-9 items-center justify-start overflow-hidden px-3 py-1 relative w-full">
                              <input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={creatingAccount}
                                required
                                className="flex-1 font-normal text-[14px] text-left text-neutral-500 bg-transparent border-none outline-none" style={{ fontFamily: 'Geist, sans-serif', fontWeight: 400, lineHeight: '20px' }}
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                disabled={creatingAccount}
                                className="ml-2 p-1 hover:bg-gray-100 rounded flex-shrink-0"
                              >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                          </div>
                          <div className="font-normal text-[14px] text-left text-neutral-500 w-full" style={{ fontFamily: 'Geist, sans-serif', fontWeight: 400, lineHeight: '20px' }}>
                            <p className="block leading-[20px]">Must be at least 8 characters</p>
                          </div>
                        </div>
                      </div>

                      {/* Confirm Password Input */}
                      <div className="flex flex-col gap-2 items-start justify-start p-0 relative w-full">
                        <div className="font-medium text-[14px] text-left text-neutral-950" style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500 }}>
                          <p className="block">Confirm password</p>
                        </div>
                        <div className="flex flex-col gap-2 items-start justify-start p-0 relative w-full">
                          <div className="bg-white h-9 relative rounded-lg w-full border border-neutral-200 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
                            <div className="flex flex-row gap-1 h-9 items-center justify-start overflow-hidden px-3 py-1 relative w-full">
                              <input
                                type="password"
                                placeholder="Password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                disabled={creatingAccount}
                                required
                                className="flex-1 font-normal text-[14px] text-left text-neutral-500 bg-transparent border-none outline-none" style={{ fontFamily: 'Geist, sans-serif', fontWeight: 400, lineHeight: '20px' }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </form>
                  </div>

                  {/* Submit Button */}
                  <button
                    onClick={handleCreateAccountWithInvitation}
                    disabled={!password || !confirmPassword || creatingAccount}
                    className="bg-neutral-900 flex flex-row gap-2 h-10 items-center justify-center px-8 py-2 relative rounded-lg shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] w-full disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-800 transition-colors"
                  >
                    <div className="overflow-hidden relative w-4 h-4 flex-shrink-0">
                      <svg className="block w-full h-full" fill="none" preserveAspectRatio="none" viewBox="0 0 15 14">
                        <path
                          d="M10.3333 13V11.6667C10.3333 10.9594 10.0524 10.2811 9.55229 9.78105C9.05219 9.28095 8.37391 9 7.66667 9H3.66667C2.95942 9 2.28115 9.28095 1.78105 9.78105C1.28095 10.2811 1 10.9594 1 11.6667V13M14.3333 12.9999V11.6666C14.3329 11.0757 14.1362 10.5018 13.7742 10.0348C13.4123 9.56783 12.9054 9.2343 12.3333 9.08659M10.3333 1.08659C10.9069 1.23346 11.4154 1.56706 11.7784 2.0348C12.1415 2.50254 12.3386 3.07781 12.3386 3.66992C12.3386 4.26204 12.1415 4.83731 11.7784 5.30505C11.4154 5.77279 10.9069 6.10639 10.3333 6.25326M8.33333 3.66667C8.33333 5.13943 7.13943 6.33333 5.66667 6.33333C4.19391 6.33333 3 5.13943 3 3.66667C3 2.19391 4.19391 1 5.66667 1C7.13943 1 8.33333 2.19391 8.33333 3.66667Z"
                          stroke="rgba(250, 250, 250, 1)"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1.33"
                        />
                      </svg>
                    </div>
                    <div className="font-medium text-[14px] text-left text-neutral-50 whitespace-nowrap" style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500, lineHeight: '20px' }}>
                      <p className="block leading-[20px]">{creatingAccount ? 'Creating Account...' : 'Create Account & Join Organization'}</p>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Original manual join interface for users without token
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full space-y-6">
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