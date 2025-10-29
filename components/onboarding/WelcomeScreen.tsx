'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Time8Logo } from '@/components/ui/time8-logo'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'

interface WelcomeScreenProps {
  userName: string
}

export function WelcomeScreen({ userName }: WelcomeScreenProps) {
  const t = useTranslations('onboarding.welcome')
  const router = useRouter()

  const handleCreateWorkspace = () => {
    router.push('/onboarding/create-workspace')
  }

  return (
    <div className="bg-white content-stretch flex flex-col gap-2.5 items-start justify-start relative size-full min-h-screen">
      {/* Top header with logo and language selector */}
      <div className="flex justify-between items-center w-full p-6">
        <Time8Logo />
        <LanguageSwitcher />
      </div>
      
      <div className="basis-0 content-stretch flex flex-col gap-6 grow items-center justify-center min-h-px min-w-px relative rounded-[10px] shrink-0 w-full">
        <div className="content-stretch flex flex-col gap-12 items-center justify-start relative shrink-0 w-[898px]">
          
          {/* Header Section */}
          <div className="content-stretch flex flex-col gap-3 items-start justify-start leading-[0] relative shrink-0 text-center w-[898px]">
            <div className="content-stretch flex font-semibold gap-3 items-center justify-center relative shrink-0 text-[48px] text-foreground text-nowrap w-full" style={{ fontFamily: 'Geist, sans-serif', fontWeight: 600 }}>
              <div className="relative shrink-0">
                <p className="leading-[48px] text-nowrap whitespace-pre">{t('title', { name: userName })}</p>
              </div>
            </div>
            <div className="font-normal relative shrink-0 text-[18px] text-muted-foreground w-full" style={{ fontFamily: 'Geist, sans-serif', fontWeight: 400 }}>
              <p className="leading-[28px]">{t('subtitle')}</p>
            </div>
          </div>
          
          {/* Card Container */}
          <div className="content-stretch flex gap-3 items-center justify-start relative shrink-0">
            <div className="bg-white box-border content-stretch flex flex-col h-[280px] items-start justify-between max-w-96 p-[32px] relative rounded-[14px] shrink-0 w-96 border border-neutral-200">
              <div className="basis-0 content-stretch flex flex-col gap-8 grow items-start justify-start min-h-px min-w-px relative shrink-0 w-full">
                <div className="basis-0 content-stretch flex flex-col grow items-start justify-between min-h-px min-w-px relative shrink-0 w-full">
                  <div className="content-stretch flex gap-2 items-start justify-start relative shrink-0 w-full">
                    <div className="basis-0 font-semibold grow h-14 leading-[28px] min-h-px min-w-px relative shrink-0 text-[18px] text-neutral-900" style={{ fontFamily: 'Geist, sans-serif', fontWeight: 600 }}>
                      <p className="mb-0">{t('card.title')}</p>
                      <p className="">{t('card.subtitle')}</p>
                    </div>
                    <div className="overflow-clip relative shrink-0 size-6">
                      {/* UserPlus Icon */}
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
                    <div className="font-semibold relative shrink-0 text-[30px] text-foreground" style={{ fontFamily: 'Geist, sans-serif', fontWeight: 600 }}>
                      <p className="leading-[36px] text-nowrap whitespace-pre">{t('card.free')}</p>
                    </div>
                    <div className="font-normal relative shrink-0 text-[14px] text-muted-foreground" style={{ fontFamily: 'Geist, sans-serif', fontWeight: 400 }}>
                      <p className="leading-[20px] text-nowrap whitespace-pre">{t('card.limit')}</p>
                    </div>
                  </div>
                </div>
                <div className="content-stretch flex flex-col gap-2.5 items-start justify-start relative shrink-0 w-full">
                  <button
                    onClick={handleCreateWorkspace}
                    className="bg-neutral-900 box-border content-stretch flex gap-2 h-9 items-center justify-center px-4 py-2 relative rounded-lg shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] shrink-0 w-full hover:bg-neutral-800 transition-colors cursor-pointer"
                  >
                    <div className="flex flex-col font-medium justify-center leading-[0] relative shrink-0 text-[14px] text-neutral-50 text-nowrap" style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500 }}>
                      <p className="leading-[20px] whitespace-pre">{t('cta')}</p>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
      </div>
    </div>
  )
}