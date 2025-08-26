'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { WelcomeScreen, ChoiceScreen, MultiOptionScreen } from '@/components/onboarding'
import { OrganizationStatusResponse } from '@/app/api/user/organization-status/route'
import { Time8Logo } from '@/components/ui/time8-logo'

interface OnboardingState {
  loading: boolean
  error: string | null
  user: any | null
  organizationData: OrganizationStatusResponse | null
}

export default function OnboardingRoutingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [state, setState] = useState<OnboardingState>({
    loading: true,
    error: null,
    user: null,
    organizationData: null
  })

  useEffect(() => {
    const loadOnboardingData = async () => {
      try {
        // Get user authentication status first
        const supabase = createClient()
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        // Check for invitation token - this can trigger different scenarios based on auth status
        const token = searchParams.get('token')
        if (token) {
          console.log('🎫 Invitation token detected')
          console.log('🔍 Decoded token from searchParams:', token)
          console.log('👤 User authentication status:', user ? 'authenticated' : 'not authenticated')
          
          // Process invitation token
          try {
            const apiUrl = `/api/invitations/lookup?token=${encodeURIComponent(token)}`
            console.log('🔍 Full API URL:', apiUrl)
            const response = await fetch(apiUrl)
            console.log('📡 API response status:', response.status, response.statusText)
            
            if (!response.ok) {
              const errorData = await response.json().catch(() => ({ error: 'Invalid response from server' }))
              console.log('❌ API error response:', errorData)
              throw new Error(errorData.error || `Server error: ${response.status} ${response.statusText}`)
            }
            const invitation = await response.json()
            
            console.log('✅ Invitation lookup successful:', invitation)
            console.log('🔍 DEBUG: invitation.token =', invitation.token)
            
            // Map API response to expected format
            const mappedInvitation = {
              ...invitation,
              organizationName: invitation.organization_name,
              inviterName: invitation.full_name, // This is the invited person's name
              inviterEmail: invitation.email, // This is the invited person's email
              token: invitation.token, // Explicitly preserve the token
            }
            
            console.log('🔍 DEBUG: mappedInvitation.token =', mappedInvitation.token)
            
            // Enhanced handling based on authentication status
            if (user) {
              // User is authenticated - check if they already belong to this organization
              console.log('✅ Authenticated user accessing invitation - checking cross-workspace scenario')
              console.log('🔍 Invitation for organization ID:', invitation.organization_id)
              console.log('🔍 User email:', user.email)
              console.log('🔍 Invitation email:', invitation.email)
              
              // Check if this is a cross-workspace invitation (user email doesn't match invitation email)
              if (user.email !== invitation.email) {
                console.log('🚨 Cross-workspace invitation detected - user email mismatch')
                console.log('🔄 Redirecting to registration with invitation context')
                
                // Redirect to registration to allow user to create account for this specific email/workspace
                const registerUrl = `/onboarding/register?token=${encodeURIComponent(token)}&email=${encodeURIComponent(invitation.email)}&name=${encodeURIComponent(invitation.full_name)}&org=${encodeURIComponent(mappedInvitation.organizationName)}&cross_workspace=true`
                router.push(registerUrl)
                return
              }
              
              try {
                // Fetch user's existing workspaces via organization-status API
                const orgResponse = await fetch('/api/user/organization-status')
                if (!orgResponse.ok) {
                  throw new Error(`Failed to fetch organization status: ${orgResponse.status}`)
                }
                
                const orgData = await orgResponse.json()
                console.log('🏢 Fetched user workspaces for invitation:', orgData)
                
                // Check if user is already a member of the organization they're being invited to
                const alreadyMember = orgData.userWorkspaces.some((ws: any) => ws.organization_id === invitation.organization_id)
                if (alreadyMember) {
                  console.log('⚠️ User is already a member of this organization')
                  setState({
                    loading: false,
                    error: 'You are already a member of this organization.',
                    user,
                    organizationData: {
                      scenario: 'multi-option' as any,
                      userWorkspaces: orgData.userWorkspaces || [],
                      pendingInvitations: orgData.pendingInvitations || [],
                      canCreateWorkspace: true
                    }
                  })
                  return
                }
                
                // Enhanced scenario determination for authenticated users with invitations
                let enhancedScenario: 'choice' | 'multi-option'
                const totalInvitations = [mappedInvitation, ...(orgData.pendingInvitations || [])].filter(inv => inv.id !== undefined)
                
                if (orgData.userWorkspaces.length === 0 && totalInvitations.length === 1) {
                  // No existing workspaces, single invitation -> choice scenario
                  enhancedScenario = 'choice'
                } else {
                  // Has workspaces OR multiple invitations -> multi-option scenario
                  enhancedScenario = 'multi-option'
                }
                
                console.log('🎯 Enhanced scenario for authenticated user with invitation:', enhancedScenario)
                
                setState({
                  loading: false,
                  error: null,
                  user,
                  organizationData: {
                    scenario: enhancedScenario as any,
                    userWorkspaces: orgData.userWorkspaces || [],
                    pendingInvitations: totalInvitations,
                    canCreateWorkspace: true
                  }
                })
                return
              } catch (error) {
                console.error('❌ Error fetching user workspaces for invitation:', error)
                // Fallback to choice scenario with just the invitation if organization fetch fails
                setState({
                  loading: false,
                  error: null,
                  user,
                  organizationData: {
                    scenario: 'choice' as any,
                    userWorkspaces: [],
                    pendingInvitations: [mappedInvitation],
                    canCreateWorkspace: true
                  }
                })
                return
              }
            } else {
              // User not authenticated - redirect to registration screen with invitation data
              console.log('🔥 Unauthenticated user with invitation - redirecting to registration screen')
              const registerUrl = `/onboarding/register?token=${encodeURIComponent(token)}&email=${encodeURIComponent(invitation.email)}&name=${encodeURIComponent(invitation.full_name)}&org=${encodeURIComponent(mappedInvitation.organizationName)}`
              router.push(registerUrl)
              return
            }
          } catch (error) {
            console.error('❌ Error processing invitation token:', error)
            // For invitation token errors, show the error instead of redirecting to login
            setState({
              loading: false,
              error: error instanceof Error ? error.message : 'Invalid or expired invitation link',
              user,
              organizationData: {
                scenario: user ? 'multi-option' : 'invitation' as any,
                userWorkspaces: [],
                pendingInvitations: [],
                canCreateWorkspace: user ? true : false
              }
            })
            return
          }
        }
        
        if (userError || !user) {
          router.push('/login')
          return
        }

        // Get user's organization status to determine correct onboarding scenario
        const response = await fetch('/api/user/organization-status')
        
        if (!response.ok) {
          throw new Error(`API request failed with status ${response.status}`)
        }

        const organizationData = await response.json()

        // Validate API response structure
        if (!organizationData.scenario || !Array.isArray(organizationData.userWorkspaces) || !Array.isArray(organizationData.pendingInvitations)) {
          throw new Error('Invalid API response structure from organization-status')
        }

        console.log('🎯 API returned scenario:', organizationData.scenario)
        console.log('🏢 User workspaces:', organizationData.userWorkspaces.length)
        console.log('📧 Pending invitations:', organizationData.pendingInvitations.length)

        // Set state with user and organization data for rendering
        setState({
          loading: false,
          error: null,
          user,
          organizationData
        })
        
      } catch (error) {
        console.error('Error loading onboarding data:', error)
        setState({
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to load onboarding data',
          user: null,
          organizationData: null
        })
      }
    }

    loadOnboardingData()
  }, [router, searchParams])

  // Loading state
  if (state.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center space-y-4">
          <div 
            className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"
            role="status"
            aria-label="Loading"
          ></div>
          <p className="text-sm text-gray-600">Setting up your onboarding experience...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (state.error) {
    // If we have organizationData with invitation scenario, show invitation screen with error
    if (state.organizationData?.scenario === 'invitation') {
      return (
        <div className="bg-white min-h-screen relative w-full">
          {/* Logo - Time8 */}
          <div className="absolute left-8 top-8">
            <Time8Logo />
          </div>

          {/* Centered content */}
          <div className="flex-1 flex flex-col gap-6 items-center justify-center min-h-screen w-full">
            <div className="flex flex-col gap-12 items-center justify-start p-0 relative w-full max-w-[820px] px-8">
              
              {/* Header Section */}
              <div className="flex flex-col gap-3 items-center justify-start p-0 relative text-center w-full">
                <div className="font-semibold leading-[48px] relative text-[48px] text-center text-neutral-950" style={{ fontFamily: 'Geist, sans-serif', fontWeight: 600 }}>
                  <p className="block leading-[48px] whitespace-pre">Welcome to Time8.io</p>
                </div>
                <div className="font-normal relative text-[18px] text-center text-neutral-500 w-full" style={{ fontFamily: 'Geist, sans-serif', fontWeight: 400, lineHeight: '28px' }}>
                  <p className="block leading-[28px]">There was an issue with your invitation link.</p>
                </div>
              </div>

              {/* Error Alert */}
              <Alert variant="destructive" className="w-full max-w-sm">
                <AlertDescription>{state.error}</AlertDescription>
              </Alert>

              {/* Single Card - Error */}
              <div className="bg-red-50 flex flex-col items-start justify-between p-[32px] relative rounded-[14px] w-96 max-w-sm h-[300px] border border-red-200">
                <div className="flex-1 flex flex-col gap-8 items-center justify-center p-0 relative w-full">
                  <div className="overflow-hidden relative w-16 h-16">
                    <svg className="w-full h-full text-red-600" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
                      <path
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                      />
                    </svg>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-red-900 text-lg mb-2">Invitation Error</div>
                    <div className="font-normal text-red-700 text-sm">Please check your invitation link or contact your administrator.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    }
    
    // For other errors, show generic error state with navigation options
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="w-full max-w-md space-y-6">
          <Alert variant="destructive">
            <AlertDescription>
              {state.error || 'Unable to load onboarding data. Please try again.'}
            </AlertDescription>
          </Alert>
          
          {/* Navigation options for authenticated users */}
          {state.user && (
            <div className="flex flex-col gap-2">
              <button 
                onClick={() => router.push('/dashboard')}
                className="w-full bg-neutral-900 text-white py-2 px-4 rounded-lg hover:bg-neutral-800 transition-colors"
              >
                Go to Dashboard
              </button>
              <button 
                onClick={() => window.location.reload()}
                className="w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Retry
              </button>
            </div>
          )}
          
          {/* Fallback to welcome screen for unauthenticated users */}
          {!state.user && (
            <WelcomeScreen 
              userName="there"
            />
          )}
        </div>
      </div>
    )
  }

  // Missing data state - but allow invitation scenario without user
  if (!state.organizationData || (!state.user && state.organizationData?.scenario !== 'invitation')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="w-full max-w-md space-y-6">
          <Alert variant="destructive">
            <AlertDescription>
              Unable to load onboarding data. Please try again.
            </AlertDescription>
          </Alert>
          
          {/* Navigation options for authenticated users */}
          {state.user && (
            <div className="flex flex-col gap-2">
              <button 
                onClick={() => router.push('/dashboard')}
                className="w-full bg-neutral-900 text-white py-2 px-4 rounded-lg hover:bg-neutral-800 transition-colors"
              >
                Go to Dashboard
              </button>
              <button 
                onClick={() => window.location.reload()}
                className="w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Retry
              </button>
            </div>
          )}
          
          {/* Fallback to welcome screen for unauthenticated users */}
          {!state.user && (
            <WelcomeScreen 
              userName="there"
            />
          )}
        </div>
      </div>
    )
  }

  const { user, organizationData } = state
  const fullName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'there'
  const userName = fullName.split(' ')[0] // Extract first name only

  console.log('🚨 RENDER DECISION - Current state:', { 
    hasUser: !!user, 
    hasOrgData: !!organizationData, 
    scenario: organizationData?.scenario,
    pendingInvitations: organizationData?.pendingInvitations?.length 
  })

  // Render appropriate scenario component based on enhanced logic
  console.log('🎬 Rendering scenario:', organizationData.scenario)
  
  switch (organizationData.scenario) {
    case 'welcome':
      return <WelcomeScreen userName={userName} />
      
    case 'choice':
      if (organizationData.pendingInvitations.length > 0) {
        return (
          <ChoiceScreen 
            userName={userName}
            invitation={organizationData.pendingInvitations[0]} 
          />
        )
      }
      // Fallback to welcome if no invitation found (data inconsistency)
      console.warn('⚠️ Choice scenario but no invitations found, falling back to welcome')
      return <WelcomeScreen userName={userName} />
      
    case 'multi-option':
      // Enhanced validation for multi-option scenario
      if (organizationData.userWorkspaces.length === 0 && organizationData.pendingInvitations.length === 0) {
        console.warn('⚠️ Multi-option scenario but no workspaces or invitations, falling back to welcome')
        return <WelcomeScreen userName={userName} />
      }
      return (
        <MultiOptionScreen 
          userName={userName}
          userWorkspaces={organizationData.userWorkspaces || []}
          pendingInvitations={organizationData.pendingInvitations || []}
        />
      )

    case 'invitation':
      // This scenario should rarely be reached since unauthenticated users are redirected to /onboarding/register
      // Only authenticated users without workspaces might reach here 
      if (organizationData.pendingInvitations.length > 0 && user) {
        console.log('🔄 Authenticated user without workspaces has invitation - showing choice screen')
        return (
          <ChoiceScreen 
            userName={userName}
            invitation={organizationData.pendingInvitations[0]} 
          />
        )
      }
      // Fallback for invitation scenario without invitations or unauthenticated users
      console.warn('⚠️ Invitation scenario reached unexpectedly, falling back to welcome')
      return <WelcomeScreen userName={userName || 'there'} />
      
    default:
      // Fallback to welcome screen for unknown scenarios
      console.error('❌ Unknown scenario:', organizationData.scenario, 'falling back to welcome')
      return <WelcomeScreen userName={userName || 'there'} />
  }
}