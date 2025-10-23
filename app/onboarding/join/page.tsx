'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Time8Logo } from '@/components/ui/time8-logo'

interface InvitationDetails {
  id: string
  email: string
  full_name: string
  role: string
  organization_id: string
  organization_name: string
  team_id?: string | null
  team_name?: string | null
  expires_at: string
  user_exists: boolean
}

function JoinPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [invitationDetails, setInvitationDetails] = useState<InvitationDetails | null>(null)

  useEffect(() => {
    const token = searchParams.get('token')
    if (token) {
      processInvitationToken(token)
    } else {
      setError('No invitation token provided')
      setLoading(false)
    }
  }, [searchParams])

  const processInvitationToken = async (token: string) => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/invitations/lookup?token=${encodeURIComponent(token)}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        setError(errorData.error || 'Invalid or expired invitation link.')
        setLoading(false)
        return
      }
      
      const invitation = await response.json()
      
      // Check if invitation has expired
      if (new Date(invitation.expires_at) < new Date()) {
        setError('This invitation has expired. Please contact your administrator for a new invitation.')
        setLoading(false)
        return
      }

      setInvitationDetails(invitation)

      // If user already exists, redirect to login with invitation token
      if (invitation.user_exists) {
        console.log('🔄 User exists, redirecting to login with invitation token')
        router.push(`/login?invitation_token=${token}&email=${encodeURIComponent(invitation.email)}`)
        return
      }

      setLoading(false)

    } catch (error) {
      console.error('❌ Token processing error:', error)
      setError('Failed to process invitation. Please try again.')
      setLoading(false)
    }
  }

  const handleAcceptInvitation = () => {
    if (!invitationDetails) return
    
    // Navigate to registration screen (24761-15558) with invitation data
    const token = searchParams.get('token')
    router.push(`/onboarding/register?token=${token}&email=${encodeURIComponent(invitationDetails.email)}&name=${encodeURIComponent(invitationDetails.full_name)}&org=${encodeURIComponent(invitationDetails.organization_name)}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-gray-600">Processing your invitation...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  if (!invitationDetails) {
    return null
  }

  // Main invitation screen matching Figma design (24697-216007)
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
              <p className="block leading-[28px]">You've been invited as {invitationDetails.role}. Create your password to get started.</p>
            </div>
          </div>

          {/* Single Card - Invitation */}
          <div className="bg-violet-100 flex flex-col items-start justify-between p-[32px] relative rounded-[14px] w-96 max-w-sm h-[300px] border border-neutral-200">
            <div className="flex-1 flex flex-col gap-8 items-start justify-start p-0 relative w-full">
              <div className="flex-1 flex flex-col items-start justify-between p-0 relative w-full">
                <div className="flex flex-row gap-2 items-start justify-start p-0 relative w-full">
                  <div className="flex-1 font-semibold h-14 leading-[28px] relative text-[18px] text-left text-neutral-900" style={{ fontFamily: 'Geist, sans-serif', fontWeight: 600 }}>
                    <p className="block mb-0">You have been invited</p>
                    <p className="block">to workspace:</p>
                  </div>
                  <div className="overflow-hidden relative w-6 h-6 flex-shrink-0">
                    <svg className="w-full h-full text-neutral-900" fill="none" preserveAspectRatio="none" viewBox="0 0 22 19">
                      <path
                        d="M21 10V3C21 2.46957 20.7893 1.96086 20.4142 1.58579C20.0391 1.21071 19.5304 1 19 1H3C2.46957 1 1.96086 1.21071 1.58579 1.58579C1.21071 1.96086 1 2.46957 1 3V15C1 16.1 1.9 17 3 17H11M21 4L12.03 9.7C11.7213 9.89343 11.3643 9.99601 11 9.99601C10.6357 9.99601 10.2787 9.89343 9.97 9.7L1 4M15 16L17 18L21 14"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                      />
                    </svg>
                  </div>
                </div>
                <div className="flex flex-row gap-2.5 items-center justify-center p-0 relative w-full">
                  <div className="flex-1 font-semibold relative text-[30px] text-neutral-950" style={{ fontFamily: 'Geist, sans-serif', fontWeight: 600, lineHeight: '36px' }}>
                    <p className="block leading-[36px]">{invitationDetails.organization_name}</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2.5 items-start justify-start p-0 relative w-full">
                <button
                  onClick={handleAcceptInvitation}
                  className="bg-neutral-900 flex flex-row gap-2 h-10 items-center justify-center px-8 py-2 relative rounded-lg w-full shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-neutral-800 transition-colors"
                >
                  <div className="overflow-hidden relative w-4 h-4 flex-shrink-0">
                    <svg className="w-full h-full text-neutral-50" fill="none" preserveAspectRatio="none" viewBox="0 0 22 20">
                      <path
                        d="M15 19V17C15 15.9391 14.5786 14.9217 13.8284 14.1716C13.0783 13.4214 12.0609 13 11 13H5C3.93913 13 2.92172 13.4214 2.17157 14.1716C1.42143 14.9217 1 15.9391 1 17V19M21 18.9999V16.9999C20.9993 16.1136 20.7044 15.2527 20.1614 14.5522C19.6184 13.8517 18.8581 13.3515 18 13.1299M15 1.12988C15.8604 1.35018 16.623 1.85058 17.1676 2.55219C17.7122 3.2538 18.0078 4.11671 18.0078 5.00488C18.0078 5.89305 17.7122 6.75596 17.1676 7.45757C16.623 8.15918 15.8604 8.65958 15 8.87988M12 5C12 7.20914 10.2091 9 8 9C5.79086 9 4 7.20914 4 5C4 2.79086 5.79086 1 8 1C10.2091 1 12 2.79086 12 5Z"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                      />
                    </svg>
                  </div>
                  <div className="font-medium text-[14px] text-neutral-50" style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500, lineHeight: '20px' }}>
                    <p className="block leading-[20px] whitespace-pre">Accept invitation</p>
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

export default function JoinPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <JoinPageContent />
    </Suspense>
  )
}