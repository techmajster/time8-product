'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { LanguageDropdown } from '@/components/auth/LanguageDropdown'
import { DecorativeBackground } from '@/components/auth/DecorativeBackground'
import { OnboardingCard } from './OnboardingCard'
import { UserPlusIcon } from './icons'
import { OnboardingLogo } from '@/components/OnboardingLogo'

interface WelcomeScreenProps {
  userName: string
}

export function WelcomeScreen({ userName }: WelcomeScreenProps) {
  const t = useTranslations('onboarding.welcome')
  const tLogout = useTranslations('onboarding.logout')
  const [loggingOut, setLoggingOut] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

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
    <div className="bg-[var(--bg-default)] flex flex-col gap-[10px] items-start relative size-full min-h-screen">
      {/* Decorative background */}
      <DecorativeBackground />

      {/* Language Switcher */}
      <LanguageDropdown />

      {/* Top header with logo */}
      <div className="absolute left-[32px] top-[32px] z-10">
        <OnboardingLogo width={108} height={30} />
      </div>
      
      {/* Main content */}
      <div className="flex flex-col gap-[24px] flex-1 items-center justify-center min-h-0 min-w-0 relative rounded-[10px] shrink-0 w-full z-10">
        <div className="flex flex-col gap-[48px] items-center relative shrink-0">
          
          {/* Header Section */}
          <div className="flex flex-col gap-[12px] h-[88px] items-start relative shrink-0 text-center w-[898px]">
            <div className="flex font-semibold gap-[12px] items-center justify-center leading-[48px] relative shrink-0 text-[48px] w-full" style={{ fontFamily: 'Geist, sans-serif', fontWeight: 600 }}>
              <p className="relative shrink-0 text-foreground">{t('title', { name: userName.split(' ')[0] })}</p>
            </div>
            <p className="font-normal leading-[28px] relative shrink-0 text-[18px] text-muted-foreground w-full whitespace-pre-wrap" style={{ fontFamily: 'Geist, sans-serif', fontWeight: 400 }}>
              {t('subtitle')}
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="max-w-[788px]">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Single Card */}
          <OnboardingCard
            variant="create"
            icon={<UserPlusIcon className="text-foreground" />}
            title={
              <>
                <p className="mb-0">{t('card.title')}</p>
                <p>{t('card.subtitle')}</p>
              </>
            }
            onAction={handleCreateWorkspace}
            actionLabel={t('cta')}
            freeText={t('card.free')}
            userLimitText={t('card.limit')}
          />

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
