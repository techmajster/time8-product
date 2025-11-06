'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { LanguageDropdown } from '@/components/auth/LanguageDropdown'
import { DecorativeBackground } from '@/components/auth/DecorativeBackground'
import { OnboardingCard } from './OnboardingCard'
import { MailCheckIcon, UserPlusIcon, UsersIcon } from './icons'

interface ChoiceScreenProps {
  userName: string
  invitation: {
    id: string
    organizationId: string
    organizationName: string
    organizationInitials: string
    inviterName: string
    inviterEmail: string
    token: string
  }
}

export function ChoiceScreen({ userName, invitation }: ChoiceScreenProps) {
  const t = useTranslations('onboarding')
  const tInvitation = useTranslations('onboarding.invitation')
  const tWelcome = useTranslations('onboarding.welcome')
  const tLogout = useTranslations('onboarding.logout')
  const [acceptingInvitation, setAcceptingInvitation] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loggingOut, setLoggingOut] = useState(false)
  const router = useRouter()

  const handleAcceptInvitation = async () => {
    try {
      setAcceptingInvitation(true)
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
      console.error('Error accepting invitation:', error)
      setError(error.message || 'Failed to accept invitation. Please try again.')
    } finally {
      setAcceptingInvitation(false)
    }
  }

  const handleCreateWorkspace = () => {
    router.push('/onboarding/create-workspace')
  }

  const handleLogout = async () => {
    try {
      setLoggingOut(true)
      await fetch('/api/logout', { method: 'POST' })
      router.push('/login')
    } catch (error) {
      console.error('Error signing out:', error)
      setError('Failed to log out. Please try again.')
    } finally {
      setLoggingOut(false)
    }
  }

  return (
    <div className="bg-white flex flex-col gap-[10px] items-start relative size-full min-h-screen">
      {/* Decorative background */}
      <DecorativeBackground />

      {/* Language Switcher */}
      <LanguageDropdown />

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
          <div className="flex flex-col gap-[12px] h-[88px] items-start relative shrink-0 text-center w-full">
            <div className="flex font-semibold gap-[12px] items-center justify-center leading-[48px] relative shrink-0 text-[48px] w-full" style={{ fontFamily: 'Geist, sans-serif', fontWeight: 600 }}>
              <p className="relative shrink-0 text-foreground">{tWelcome('title', { name: userName.split(' ')[0] })}</p>
            </div>
            <p className="font-normal leading-[28px] relative shrink-0 text-[18px] text-center text-muted-foreground w-full whitespace-pre-wrap" style={{ fontFamily: 'Geist, sans-serif', fontWeight: 400 }}>
              {tWelcome('subtitle')}
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="max-w-[788px]">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Cards Container - 2 cards horizontal */}
          <div className="flex flex-wrap gap-[20px] items-center relative shrink-0">
            {/* Invitation Card */}
            <OnboardingCard
              variant="invitation"
              icon={<MailCheckIcon className="text-foreground" />}
              title={tInvitation('title')}
              organizationName={invitation.organizationName}
              onAction={handleAcceptInvitation}
              actionLabel={acceptingInvitation ? tInvitation('accepting') : tInvitation('accept')}
              actionIcon={<UsersIcon className="text-white" />}
              isLoading={acceptingInvitation}
            />

            {/* Create Workspace Card */}
            <OnboardingCard
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
          </div>

          {/* Logout Link */}
          <div className="text-center text-sm">
            {tLogout('prompt')}{" "}
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="text-primary underline underline-offset-4 hover:text-primary/80 hover:no-underline transition-colors cursor-pointer disabled:opacity-50"
            >
              {tLogout('action')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
