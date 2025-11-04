'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { LanguageSwitcher } from '@/components/auth/LanguageSwitcher'
import { DecorativeBackground } from '@/components/auth/DecorativeBackground'
import { OnboardingCard } from './OnboardingCard'
import { MailCheckIcon, UserCheckIcon, UserPlusIcon, UsersIcon } from './icons'

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
  const t = useTranslations('onboarding')
  const tInvitation = useTranslations('onboarding.invitation')
  const tWorkspace = useTranslations('onboarding.workspace')
  const tWelcome = useTranslations('onboarding.welcome')
  const [accepting, setAccepting] = useState<string | null>(null)
  const [entering, setEntering] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleAcceptInvitation = async (invitation: Invitation) => {
    try {
      setAccepting(invitation.id)
      setError(null)
      console.log('🎫 Accepting invitation via API:', invitation.token)

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

  // Prepare cards array (invitations + workspaces + create card)
  const cards: Array<{
    type: 'invitation' | 'workspace' | 'create'
    data?: Invitation | Workspace
  }> = []

  // Add invitation cards
  pendingInvitations?.forEach(invitation => {
    cards.push({ type: 'invitation', data: invitation })
  })

  // Add workspace cards
  userWorkspaces?.forEach(workspace => {
    cards.push({ type: 'workspace', data: workspace })
  })

  // Add create workspace card
  cards.push({ type: 'create' })

  // Group cards into rows (max 3 per row)
  const rows: typeof cards[][] = []
  for (let i = 0; i < cards.length; i += 3) {
    rows.push(cards.slice(i, i + 3))
  }

  return (
    <div className="bg-white flex flex-col gap-[10px] items-start relative size-full min-h-screen">
      {/* Decorative background */}
      <DecorativeBackground />

      {/* Language Switcher */}
      <LanguageSwitcher />

      {/* Top header with logo */}
      <div className="absolute left-[32px] top-[32px] z-10">
        <div className="h-[30px] relative w-[108.333px]">
          <Image
            alt="time8 logo"
            className="block h-[30px] w-auto"
            src="/auth-assets/30f1f246576f6427b3a9b511194297cbba4d7ec6.svg"
            width={108}
            height={30}
            priority
          />
        </div>
      </div>
      
      {/* Main content */}
      <div className="flex flex-col gap-[24px] flex-1 items-center justify-center min-h-0 min-w-0 relative rounded-[10px] shrink-0 w-full z-10">
        <div className="flex flex-col gap-[48px] items-center relative shrink-0">
          
          {/* Header Section */}
          <div className="flex flex-col gap-[12px] h-[88px] items-start relative shrink-0 text-center w-[898px]">
            <div className="flex font-semibold gap-[12px] items-center justify-center leading-[48px] relative shrink-0 text-[48px] w-full" style={{ fontFamily: 'Geist, sans-serif', fontWeight: 600 }}>
              <p className="relative shrink-0 text-neutral-950">{tWelcome('title', { name: userName.split(' ')[0] })}</p>
            </div>
            <p className="font-normal leading-[28px] relative shrink-0 text-[18px] text-center text-muted-foreground w-full whitespace-pre-wrap" style={{ fontFamily: 'Geist, sans-serif', fontWeight: 400 }}>
              {tWelcome('subtitle')}
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="max-w-[1192px]">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Cards Grid */}
          <div className="flex flex-col gap-[24px] items-start relative shrink-0">
            {rows.map((row, rowIndex) => (
              <div key={rowIndex} className="flex flex-wrap gap-[20px] items-center relative shrink-0">
                {row.map((card, cardIndex) => {
                  if (card.type === 'invitation' && card.data) {
                    const invitation = card.data as Invitation
                    return (
                      <OnboardingCard
                        key={`invitation-${invitation.id}`}
                        variant="invitation"
                        icon={<MailCheckIcon className="text-foreground" />}
                        title={tInvitation('title')}
                        organizationName={invitation.organizationName}
                        onAction={() => handleAcceptInvitation(invitation)}
                        actionLabel={accepting === invitation.id ? tInvitation('accepting') : tInvitation('accept')}
                        actionIcon={<UsersIcon className="text-white" />}
                        isLoading={accepting === invitation.id}
                      />
                    )
                  } else if (card.type === 'workspace' && card.data) {
                    const workspace = card.data as Workspace
                    return (
                      <OnboardingCard
                        key={`workspace-${workspace.id}`}
                        variant="workspace"
                        icon={<UserCheckIcon className="text-foreground" />}
                        title={tWorkspace('title')}
                        organizationName={workspace.name}
                        avatars={workspace.memberAvatars}
                        memberCount={workspace.memberCount}
                        onAction={() => handleEnterWorkspace(workspace.id)}
                        actionLabel={entering === workspace.id ? tWorkspace('entering') : tWorkspace('enter')}
                        isLoading={entering === workspace.id}
                      />
                    )
                  } else if (card.type === 'create') {
                    return (
                      <OnboardingCard
                        key="create-workspace"
                        variant="create"
                        icon={<UserPlusIcon className="text-foreground" />}
                        title={
                          <>
                            <p className="mb-0">{tWelcome('card.title')}</p>
                            <p>{tWelcome('card.subtitle')}</p>
                          </>
                        }
                        onAction={handleCreateWorkspace}
                        actionLabel={tWelcome('cta')}
                        freeText={tWelcome('card.free')}
                        userLimitText={tWelcome('card.limit')}
                      />
                    )
                  }
                  return null
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
