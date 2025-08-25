'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Time8Logo } from '@/components/ui/time8-logo'

interface Workspace {
  id: string
  name: string
  memberCount: number
  memberAvatars: Array<{
    id: string
    avatar_url: string | null
    full_name: string
  }>
}

interface Invitation {
  id: string
  organizationId: string
  organizationName: string
  organizationInitials: string
  inviterName: string
  inviterEmail: string
  token: string
}

interface MultiOptionScreenProps {
  userName: string
  userWorkspaces: Workspace[]
  pendingInvitations: Invitation[]
}

export function MultiOptionScreen({ userName, userWorkspaces, pendingInvitations }: MultiOptionScreenProps) {
  const [accepting, setAccepting] = useState<string | null>(null)
  const [entering, setEntering] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleAcceptInvitation = async (invitation: Invitation) => {
    try {
      setAccepting(invitation.id)
      setError(null)
      console.log('🎫 Accepting invitation via API:', invitation.token)

      // Use the new accept invitation API endpoint
      const response = await fetch('/api/invitations/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: invitation.token
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to accept invitation')
      }

      console.log('✅ Invitation accepted successfully:', result)
      
      // Redirect to dashboard in the new organization
      router.push('/dashboard')
      
    } catch (error: any) {
      console.error('❌ Error accepting invitation:', error)
      setError(error.message || 'Failed to accept invitation. Please try again.')
    } finally {
      setAccepting(null)
    }
  }

  const handleEnterWorkspace = async (workspaceId: string) => {
    try {
      setEntering(workspaceId)
      setError(null)
      
      console.log('Switching to workspace ID from onboarding:', workspaceId)
      
      // Use the same workspace switch API as the working workspace-switcher
      const response = await fetch('/api/workspace/switch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ organizationId: workspaceId })
      })

      const responseData = await response.json()
      console.log('Switch workspace response from onboarding:', responseData)

      if (response.ok) {
        // Redirect to dashboard of the new workspace
        window.location.href = '/dashboard'
      } else {
        throw new Error(responseData.error || 'Failed to switch workspace')
      }
      
    } catch (error: any) {
      console.error('Error entering workspace:', error)
      setError(error.message || 'Failed to enter workspace. Please try again.')
    } finally {
      setEntering(null)
    }
  }

  const handleCreateWorkspace = () => {
    router.push('/onboarding/create-workspace')
  }

  // Create avatar group component for workspace cards - shows ACTUAL workspace members only
  const AvatarGroup = ({ memberAvatars, memberCount }: { memberAvatars: Workspace['memberAvatars'], memberCount: number }) => {
    const displayAvatars = memberAvatars?.slice(0, 3) || []
    const remainingCount = Math.max(0, memberCount - displayAvatars.length)
    

    return (
      <div className="box-border content-stretch flex items-center justify-start pl-0 pr-2 py-0 relative shrink-0">
        {/* Show only ACTUAL workspace members (up to 3) */}
        {displayAvatars.map((member, index) => (
          <div
            key={member.id}
            className="bg-neutral-100 mr-[-8px] relative rounded-[9999px] shrink-0 size-12"
            style={{ zIndex: displayAvatars.length - index }}
          >
            <div className="overflow-clip relative size-12">
              {member.avatar_url ? (
                <img
                  src={member.avatar_url}
                  alt={member.full_name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                // Show actual member's initials
                <div className="absolute flex flex-col font-normal inset-0 justify-center leading-[0] text-[14px] text-center text-neutral-950" style={{ fontFamily: 'Geist, sans-serif', fontWeight: 400 }}>
                  <p className="leading-[20px]">{member.full_name?.charAt(0)?.toUpperCase() || 'U'}</p>
                </div>
              )}
            </div>
            <div aria-hidden="true" className="absolute border-2 border-[#ffffff] border-solid inset-[-2px] pointer-events-none rounded-[10001px]" />
          </div>
        ))}
        
        {/* +X indicator when there are more members than shown */}
        {remainingCount > 0 && (
          <div className="bg-neutral-100 mr-[-8px] relative rounded-[9999px] shrink-0 size-12" style={{ zIndex: 0 }}>
            <div className="overflow-clip relative size-12">
              <div className="absolute flex flex-col font-normal inset-0 justify-center leading-[0] text-[14px] text-center text-neutral-950" style={{ fontFamily: 'Geist, sans-serif', fontWeight: 400 }}>
                <p className="leading-[20px]">+{remainingCount}</p>
              </div>
            </div>
            <div aria-hidden="true" className="absolute border-2 border-[#ffffff] border-solid inset-[-2px] pointer-events-none rounded-[10001px]" />
          </div>
        )}
      </div>
    )
  }

  // Prepare cards for the 6-card grid (max 2 rows, 3 cards each)
  const cards: Array<{
    type: 'invitation' | 'workspace' | 'create'
    data?: Invitation | Workspace | null
  }> = []

  // Add invitation cards
  pendingInvitations?.forEach(invitation => {
    cards.push({
      type: 'invitation',
      data: invitation
    })
  })

  // Add workspace cards
  userWorkspaces?.forEach(workspace => {
    cards.push({
      type: 'workspace',
      data: workspace
    })
  })

  // Add create workspace card
  cards.push({
    type: 'create',
    data: null
  })

  // Ensure we have exactly 6 slots (add empty slots if needed)
  while (cards.length < 6) {
    cards.push({
      type: 'empty',
      data: null
    })
  }

  // Take only first 6 cards
  const displayCards = cards.slice(0, 6)

  return (
    <div className="bg-[#ffffff] content-stretch flex flex-col gap-2.5 items-start justify-start relative size-full min-h-screen">
      <div className="basis-0 content-stretch flex flex-col gap-6 grow items-center justify-center min-h-px min-w-px relative rounded-[10px] shrink-0 w-full">
        <div className="content-stretch flex flex-col gap-12 items-center justify-start relative shrink-0">
          
          {/* Header Section */}
          <div className="content-stretch flex flex-col gap-3 h-[88px] items-start justify-start leading-[0] relative shrink-0 text-center w-[898px]">
            <div className="content-stretch flex font-semibold gap-3 items-center justify-center relative shrink-0 text-[48px] text-neutral-950 text-nowrap w-full" style={{ fontFamily: 'Geist, sans-serif', fontWeight: 600 }}>
              <div className="relative shrink-0">
                <p className="leading-[48px] text-nowrap whitespace-pre">Welcome</p>
              </div>
              <div className="relative shrink-0">
                <p className="leading-[48px] text-nowrap whitespace-pre">{userName}!</p>
              </div>
            </div>
            <div className="font-normal relative shrink-0 text-[18px] text-neutral-500 w-full" style={{ fontFamily: 'Geist, sans-serif', fontWeight: 400 }}>
              <p className="leading-[28px]">Let's get started with your workspace</p>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Cards Grid */}
          <div className="content-stretch flex flex-col gap-6 items-start justify-start relative shrink-0">
            {/* Row 1 */}
            <div className="content-center flex flex-wrap gap-5 items-center justify-start relative shrink-0">
              {displayCards.slice(0, 3).map((card, index) => {
                if (card.type === 'invitation' && card.data) {
                  const invitation = card.data as Invitation
                  return (
                    <div key={`invitation-${invitation.id}`} className="bg-violet-100 box-border content-stretch flex flex-col h-[300px] items-start justify-between max-w-96 p-[32px] relative rounded-[14px] shrink-0 w-96 border border-neutral-200">
                      <div className="basis-0 content-stretch flex flex-col gap-8 grow items-start justify-start min-h-px min-w-px relative shrink-0 w-full">
                        <div className="basis-0 content-stretch flex flex-col grow items-start justify-between min-h-px min-w-px relative shrink-0 w-full">
                          <div className="content-stretch flex gap-2 items-start justify-start relative shrink-0 w-full">
                            <div className="basis-0 font-semibold grow h-14 leading-[28px] min-h-px min-w-px relative shrink-0 text-[18px] text-neutral-900" style={{ fontFamily: 'Geist, sans-serif', fontWeight: 600 }}>
                              <p className="mb-0">You have been invited</p>
                              <p className="">to workspace:</p>
                            </div>
                            <div className="overflow-clip relative shrink-0 size-6">
                              <svg className="w-full h-full text-neutral-900" fill="none" viewBox="0 0 24 24">
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
                          <div className="content-stretch flex gap-2.5 items-center justify-center relative shrink-0 w-full">
                            <div className="basis-0 font-semibold grow leading-[0] min-h-px min-w-px relative shrink-0 text-[30px] text-neutral-950" style={{ fontFamily: 'Geist, sans-serif', fontWeight: 600 }}>
                              <p className="leading-[36px]">{invitation.organizationName}</p>
                            </div>
                          </div>
                        </div>
                        <div className="content-stretch flex flex-col gap-2.5 items-start justify-start relative shrink-0 w-full">
                          <button
                            onClick={() => handleAcceptInvitation(invitation)}
                            disabled={accepting === invitation.id}
                            className="bg-neutral-900 box-border content-stretch flex gap-2 h-10 items-center justify-center px-8 py-2 relative rounded-lg shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] shrink-0 w-full hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <div className="overflow-clip relative shrink-0 size-4">
                              <svg className="w-full h-full text-neutral-50" fill="none" viewBox="0 0 24 24">
                                <path
                                  d="M15 19V17C15 15.9391 14.5786 14.9217 13.8284 14.1716C13.0783 13.4214 12.0609 13 11 13H5C3.93913 13 2.92172 13.4214 2.17157 14.1716C1.42143 14.9217 1 15.9391 1 17V19M21 18.9999V16.9999C20.9993 16.1136 20.7044 15.2527 20.1614 14.5522C19.6184 13.8517 18.8581 13.3515 18 13.1299M15 1.12988C15.8604 1.35018 16.623 1.85058 17.1676 2.55219C17.7122 3.2538 18.0078 4.11671 18.0078 5.00488C18.0078 5.89305 17.7122 6.75596 17.1676 7.45757C16.623 8.15918 15.8604 8.65958 15 8.87988M12 5C12 7.20914 10.2091 9 8 9C5.79086 9 4 7.20914 4 5C4 2.79086 5.79086 1 8 1C10.2091 1 12 2.79086 12 5Z"
                                  stroke="currentColor"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                />
                              </svg>
                            </div>
                            <div className="flex flex-col font-medium justify-center leading-[0] relative shrink-0 text-[14px] text-neutral-50 text-nowrap" style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500 }}>
                              <p className="leading-[20px] whitespace-pre">
                                {accepting === invitation.id ? 'Accepting...' : 'Accept invitation'}
                              </p>
                            </div>
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                } else if (card.type === 'workspace' && card.data) {
                  const workspace = card.data as Workspace
                  return (
                    <div key={`workspace-${workspace.id}`} className="bg-neutral-100 box-border content-stretch flex flex-col h-[300px] items-start justify-between max-w-96 p-[32px] relative rounded-[14px] shrink-0 w-96 border border-neutral-200">
                      <div className="basis-0 content-stretch flex flex-col gap-8 grow items-start justify-start min-h-px min-w-px relative shrink-0 w-full">
                        <div className="basis-0 content-stretch flex flex-col grow items-start justify-between min-h-px min-w-px relative shrink-0 w-full">
                          <div className="content-stretch flex gap-2 items-start justify-start relative shrink-0 w-full">
                            <div className="basis-0 font-semibold grow leading-[0] min-h-px min-w-px relative shrink-0 text-[18px] text-neutral-900" style={{ fontFamily: 'Geist, sans-serif', fontWeight: 600 }}>
                              <p className="leading-[28px]">Your workspace:</p>
                            </div>
                            <div className="overflow-clip relative shrink-0 size-6">
                              <svg className="w-full h-full text-neutral-900" fill="none" viewBox="0 0 24 24">
                                <path
                                  d="M15 19V17C15 15.9391 14.5786 14.9217 13.8284 14.1716C13.0783 13.4214 12.0609 13 11 13H5C3.93913 13 2.92172 13.4214 2.17157 14.1716C1.42143 14.9217 1 15.9391 1 17V19M15 9L17 11L21 7M12 5C12 7.20914 10.2091 9 8 9C5.79086 9 4 7.20914 4 5C4 2.79086 5.79086 1 8 1C10.2091 1 12 2.79086 12 5Z"
                                  stroke="currentColor"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                />
                              </svg>
                            </div>
                          </div>
                          <div className="content-stretch flex flex-col gap-2.5 items-start justify-start relative shrink-0 w-full">
                            <AvatarGroup memberAvatars={workspace.memberAvatars} memberCount={workspace.memberCount} />
                            <div className="font-semibold leading-[0] min-w-full relative shrink-0 text-[30px] text-neutral-950" style={{ fontFamily: 'Geist, sans-serif', fontWeight: 600, width: 'min-content' }}>
                              <p className="leading-[36px]">{workspace.name}</p>
                            </div>
                          </div>
                        </div>
                        <div className="content-stretch flex flex-col gap-2.5 items-start justify-start relative shrink-0 w-full">
                          <button
                            onClick={() => handleEnterWorkspace(workspace.id)}
                            disabled={entering === workspace.id}
                            className="bg-neutral-900 box-border content-stretch flex gap-2 h-10 items-center justify-center px-8 py-2 relative rounded-lg shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] shrink-0 w-full hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <div className="flex flex-col font-medium justify-center leading-[0] relative shrink-0 text-[14px] text-neutral-50 text-nowrap" style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500 }}>
                              <p className="leading-[20px] whitespace-pre">
                                {entering === workspace.id ? 'Entering...' : 'Enter workspace'}
                              </p>
                            </div>
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                } else if (card.type === 'create') {
                  return (
                    <div key="create-workspace" className="bg-[#ffffff] box-border content-stretch flex flex-col h-[300px] items-start justify-between max-w-96 p-[32px] relative rounded-[14px] shrink-0 w-96 border border-neutral-200">
                      <div className="basis-0 content-stretch flex flex-col gap-8 grow items-start justify-start min-h-px min-w-px relative shrink-0 w-full">
                        <div className="basis-0 content-stretch flex flex-col grow items-start justify-between min-h-px min-w-px relative shrink-0 w-full">
                          <div className="content-stretch flex gap-2 items-start justify-start relative shrink-0 w-full">
                            <div className="basis-0 font-semibold grow h-14 leading-[28px] min-h-px min-w-px relative shrink-0 text-[18px] text-neutral-900" style={{ fontFamily: 'Geist, sans-serif', fontWeight: 600 }}>
                              <p className="mb-0">Do you want to create</p>
                              <p className="">a new workspace?</p>
                            </div>
                            <div className="overflow-clip relative shrink-0 size-6">
                              <svg className="w-full h-full text-neutral-900" fill="none" viewBox="0 0 24 24">
                                <path
                                  d="M15 19V17C15 15.9391 14.5786 14.9217 13.8284 14.1716C13.0783 13.4214 12.0609 13 11 13H5C3.93913 13 2.92172 13.4214 2.17157 14.1716C1.42143 14.9217 1 15.9391 1 17V19M18 6V12M21 9H15M12 5C12 7.20914 10.2091 9 8 9C5.79086 9 4 7.20914 4 5C4 2.79086 5.79086 1 8 1C10.2091 1 12 2.79086 12 5Z"
                                  stroke="currentColor"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                />
                              </svg>
                            </div>
                          </div>
                          <div className="content-stretch flex items-end justify-between leading-[0] relative shrink-0 text-nowrap w-full">
                            <div className="font-semibold relative shrink-0 text-[30px] text-neutral-950" style={{ fontFamily: 'Geist, sans-serif', fontWeight: 600 }}>
                              <p className="leading-[36px] text-nowrap whitespace-pre">It's free!</p>
                            </div>
                            <div className="font-normal relative shrink-0 text-[14px] text-neutral-500" style={{ fontFamily: 'Geist, sans-serif', fontWeight: 400 }}>
                              <p className="leading-[20px] text-nowrap whitespace-pre">up to 3 users</p>
                            </div>
                          </div>
                        </div>
                        <div className="content-stretch flex flex-col gap-2.5 items-start justify-start relative shrink-0 w-full">
                          <button
                            onClick={handleCreateWorkspace}
                            className="bg-[#ffffff] box-border content-stretch flex gap-2 h-10 items-center justify-center px-8 py-2 relative rounded-lg shrink-0 w-full border border-neutral-200 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex flex-col font-medium justify-center leading-[0] relative shrink-0 text-[14px] text-neutral-950 text-nowrap" style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500 }}>
                              <p className="leading-[20px] whitespace-pre">Create new workspace</p>
                            </div>
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                } else {
                  // Empty slot
                  return <div key={`empty-${index}`} className="w-96 h-[300px]"></div>
                }
              })}
            </div>

            {/* Row 2 */}
            {displayCards.length > 3 && (
              <div className="content-center flex flex-wrap gap-5 items-center justify-start relative shrink-0">
                {displayCards.slice(3, 6).map((card, index) => {
                  if (card.type === 'invitation' && card.data) {
                    const invitation = card.data as Invitation
                    return (
                      <div key={`invitation-${invitation.id}`} className="bg-violet-100 box-border content-stretch flex flex-col h-[300px] items-start justify-between max-w-96 p-[32px] relative rounded-[14px] shrink-0 w-96 border border-neutral-200">
                        <div className="basis-0 content-stretch flex flex-col gap-8 grow items-start justify-start min-h-px min-w-px relative shrink-0 w-full">
                          <div className="basis-0 content-stretch flex flex-col grow items-start justify-between min-h-px min-w-px relative shrink-0 w-full">
                            <div className="content-stretch flex gap-2 items-start justify-start relative shrink-0 w-full">
                              <div className="basis-0 font-semibold grow h-14 leading-[28px] min-h-px min-w-px relative shrink-0 text-[18px] text-neutral-900" style={{ fontFamily: 'Geist, sans-serif', fontWeight: 600 }}>
                                <p className="mb-0">You have been invited</p>
                                <p className="">to workspace:</p>
                              </div>
                              <div className="overflow-clip relative shrink-0 size-6">
                                <svg className="w-full h-full text-neutral-900" fill="none" viewBox="0 0 24 24">
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
                            <div className="content-stretch flex gap-2.5 items-center justify-center relative shrink-0 w-full">
                              <div className="basis-0 font-semibold grow leading-[0] min-h-px min-w-px relative shrink-0 text-[30px] text-neutral-950" style={{ fontFamily: 'Geist, sans-serif', fontWeight: 600 }}>
                                <p className="leading-[36px]">{invitation.organizationName}</p>
                              </div>
                            </div>
                          </div>
                          <div className="content-stretch flex flex-col gap-2.5 items-start justify-start relative shrink-0 w-full">
                            <button
                              onClick={() => handleAcceptInvitation(invitation)}
                              disabled={accepting === invitation.id}
                              className="bg-neutral-900 box-border content-stretch flex gap-2 h-10 items-center justify-center px-8 py-2 relative rounded-lg shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] shrink-0 w-full hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <div className="overflow-clip relative shrink-0 size-4">
                                <svg className="w-full h-full text-neutral-50" fill="none" viewBox="0 0 24 24">
                                  <path
                                    d="M15 19V17C15 15.9391 14.5786 14.9217 13.8284 14.1716C13.0783 13.4214 12.0609 13 11 13H5C3.93913 13 2.92172 13.4214 2.17157 14.1716C1.42143 14.9217 1 15.9391 1 17V19M21 18.9999V16.9999C20.9993 16.1136 20.7044 15.2527 20.1614 14.5522C19.6184 13.8517 18.8581 13.3515 18 13.1299M15 1.12988C15.8604 1.35018 16.623 1.85058 17.1676 2.55219C17.7122 3.2538 18.0078 4.11671 18.0078 5.00488C18.0078 5.89305 17.7122 6.75596 17.1676 7.45757C16.623 8.15918 15.8604 8.65958 15 8.87988M12 5C12 7.20914 10.2091 9 8 9C5.79086 9 4 7.20914 4 5C4 2.79086 5.79086 1 8 1C10.2091 1 12 2.79086 12 5Z"
                                    stroke="currentColor"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                  />
                                </svg>
                              </div>
                              <div className="flex flex-col font-medium justify-center leading-[0] relative shrink-0 text-[14px] text-neutral-50 text-nowrap" style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500 }}>
                                <p className="leading-[20px] whitespace-pre">
                                  {accepting === invitation.id ? 'Accepting...' : 'Accept invitation'}
                                </p>
                              </div>
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  } else if (card.type === 'workspace' && card.data) {
                    const workspace = card.data as Workspace
                    return (
                      <div key={`workspace-${workspace.id}`} className="bg-neutral-100 box-border content-stretch flex flex-col h-[300px] items-start justify-between max-w-96 p-[32px] relative rounded-[14px] shrink-0 w-96 border border-neutral-200">
                        <div className="basis-0 content-stretch flex flex-col gap-8 grow items-start justify-start min-h-px min-w-px relative shrink-0 w-full">
                          <div className="basis-0 content-stretch flex flex-col grow items-start justify-between min-h-px min-w-px relative shrink-0 w-full">
                            <div className="content-stretch flex gap-2 items-start justify-start relative shrink-0 w-full">
                              <div className="basis-0 font-semibold grow leading-[0] min-h-px min-w-px relative shrink-0 text-[18px] text-neutral-900" style={{ fontFamily: 'Geist, sans-serif', fontWeight: 600 }}>
                                <p className="leading-[28px]">Your workspace:</p>
                              </div>
                              <div className="overflow-clip relative shrink-0 size-6">
                                <svg className="w-full h-full text-neutral-900" fill="none" viewBox="0 0 24 24">
                                  <path
                                    d="M15 19V17C15 15.9391 14.5786 14.9217 13.8284 14.1716C13.0783 13.4214 12.0609 13 11 13H5C3.93913 13 2.92172 13.4214 2.17157 14.1716C1.42143 14.9217 1 15.9391 1 17V19M15 9L17 11L21 7M12 5C12 7.20914 10.2091 9 8 9C5.79086 9 4 7.20914 4 5C4 2.79086 5.79086 1 8 1C10.2091 1 12 2.79086 12 5Z"
                                    stroke="currentColor"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                  />
                                </svg>
                              </div>
                            </div>
                            <div className="content-stretch flex flex-col gap-2.5 items-start justify-start relative shrink-0 w-full">
                              <AvatarGroup memberAvatars={workspace.memberAvatars} memberCount={workspace.memberCount} />
                              <div className="font-semibold leading-[0] min-w-full relative shrink-0 text-[30px] text-neutral-950" style={{ fontFamily: 'Geist, sans-serif', fontWeight: 600, width: 'min-content' }}>
                                <p className="leading-[36px]">{workspace.name}</p>
                              </div>
                            </div>
                          </div>
                          <div className="content-stretch flex flex-col gap-2.5 items-start justify-start relative shrink-0 w-full">
                            <button
                              onClick={() => handleEnterWorkspace(workspace.id)}
                              disabled={entering === workspace.id}
                              className="bg-neutral-900 box-border content-stretch flex gap-2 h-10 items-center justify-center px-8 py-2 relative rounded-lg shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] shrink-0 w-full hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <div className="flex flex-col font-medium justify-center leading-[0] relative shrink-0 text-[14px] text-neutral-50 text-nowrap" style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500 }}>
                                <p className="leading-[20px] whitespace-pre">
                                  {entering === workspace.id ? 'Entering...' : 'Enter workspace'}
                                </p>
                              </div>
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  } else if (card.type === 'create') {
                    return (
                      <div key="create-workspace" className="bg-[#ffffff] box-border content-stretch flex flex-col h-[300px] items-start justify-between max-w-96 p-[32px] relative rounded-[14px] shrink-0 w-96 border border-neutral-200">
                        <div className="basis-0 content-stretch flex flex-col gap-8 grow items-start justify-start min-h-px min-w-px relative shrink-0 w-full">
                          <div className="basis-0 content-stretch flex flex-col grow items-start justify-between min-h-px min-w-px relative shrink-0 w-full">
                            <div className="content-stretch flex gap-2 items-start justify-start relative shrink-0 w-full">
                              <div className="basis-0 font-semibold grow h-14 leading-[28px] min-h-px min-w-px relative shrink-0 text-[18px] text-neutral-900" style={{ fontFamily: 'Geist, sans-serif', fontWeight: 600 }}>
                                <p className="mb-0">Do you want to create</p>
                                <p className="">a new workspace?</p>
                              </div>
                              <div className="overflow-clip relative shrink-0 size-6">
                                <svg className="w-full h-full text-neutral-900" fill="none" viewBox="0 0 24 24">
                                  <path
                                    d="M15 19V17C15 15.9391 14.5786 14.9217 13.8284 14.1716C13.0783 13.4214 12.0609 13 11 13H5C3.93913 13 2.92172 13.4214 2.17157 14.1716C1.42143 14.9217 1 15.9391 1 17V19M18 6V12M21 9H15M12 5C12 7.20914 10.2091 9 8 9C5.79086 9 4 7.20914 4 5C4 2.79086 5.79086 1 8 1C10.2091 1 12 2.79086 12 5Z"
                                    stroke="currentColor"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                  />
                                </svg>
                              </div>
                            </div>
                            <div className="content-stretch flex items-end justify-between leading-[0] relative shrink-0 text-nowrap w-full">
                              <div className="font-semibold relative shrink-0 text-[30px] text-neutral-950" style={{ fontFamily: 'Geist, sans-serif', fontWeight: 600 }}>
                                <p className="leading-[36px] text-nowrap whitespace-pre">It's free!</p>
                              </div>
                              <div className="font-normal relative shrink-0 text-[14px] text-neutral-500" style={{ fontFamily: 'Geist, sans-serif', fontWeight: 400 }}>
                                <p className="leading-[20px] text-nowrap whitespace-pre">up to 3 users</p>
                              </div>
                            </div>
                          </div>
                          <div className="content-stretch flex flex-col gap-2.5 items-start justify-start relative shrink-0 w-full">
                            <button
                              onClick={handleCreateWorkspace}
                              className="bg-[#ffffff] box-border content-stretch flex gap-2 h-10 items-center justify-center px-8 py-2 relative rounded-lg shrink-0 w-full border border-neutral-200 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-gray-50 transition-colors"
                            >
                              <div className="flex flex-col font-medium justify-center leading-[0] relative shrink-0 text-[14px] text-neutral-950 text-nowrap" style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500 }}>
                                <p className="leading-[20px] whitespace-pre">Create new workspace</p>
                              </div>
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  } else {
                    // Empty slot
                    return <div key={`empty-${index + 3}`} className="w-96 h-[300px]"></div>
                  }
                })}
              </div>
            )}
          </div>
        </div>
        
        {/* Logo positioned absolutely */}
        <div className="absolute content-stretch flex gap-[19.454px] items-center justify-start left-8 top-8">
          <Time8Logo />
        </div>
      </div>
    </div>
  )
}