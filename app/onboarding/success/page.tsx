'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { CircleCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { DecorativeBackground } from '@/components/auth/DecorativeBackground'
import { LanguageSwitcher } from '@/components/auth/LanguageSwitcher'

interface CompanyMember {
  id: string
  full_name: string
  email: string
  avatar_url?: string
}

function SuccessPageContent() {
  const t = useTranslations('onboarding.success')
  const router = useRouter()
  const searchParams = useSearchParams()
  const orgName = searchParams.get('org') || 'BB8 Team'
  const [companyMembers, setCompanyMembers] = useState<CompanyMember[]>([
    // For now, show realistic fake data since we don't have auth yet
    {
      id: '1',
      full_name: 'Simon Kowalski',
      email: 'simon@bb8.pl',
    },
    {
      id: '2', 
      full_name: 'Tech Majster',
      email: 'admin@bb8.pl',
    }
  ])

  const handleGoToDashboard = async () => {
    // Check if user is already authenticated
    const supabase = createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (user) {
      console.log('✅ User already authenticated, redirecting to dashboard')
      router.push('/dashboard')
      return
    }
    
    console.log('⚠️ User not authenticated, redirecting to login')
    router.push('/login')
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const renderAvatars = () => {
    const maxVisible = 3
    const visibleMembers = companyMembers.slice(0, maxVisible)
    const remainingCount = companyMembers.length - maxVisible

    return (
      <div className="flex items-center pr-2">
        {visibleMembers.map((member, index) => (
          <Avatar 
            key={member.id} 
            className="bg-muted h-6 w-6 border-2 border-white mr-[-8px]"
          >
            {member.avatar_url && (
              <AvatarImage 
                src={member.avatar_url} 
                alt={member.full_name}
              />
            )}
            <AvatarFallback className="text-xs">
              {getInitials(member.full_name || member.email)}
            </AvatarFallback>
          </Avatar>
        ))}
        
        {/* Only show +X if there are MORE than 3 members total */}
        {companyMembers.length > maxVisible && (
          <Avatar className="bg-muted h-6 w-6 border-2 border-white mr-[-8px]">
            <AvatarFallback className="text-xs">
              +{remainingCount}
            </AvatarFallback>
          </Avatar>
        )}
      </div>
    )
  }

  // Success screen matching Figma design (24761-15630)
  return (
    <div className="bg-white flex flex-col gap-[10px] items-start relative size-full min-h-screen">
      {/* Decorative background */}
      <DecorativeBackground />

      {/* Language Switcher */}
      <LanguageSwitcher />

      {/* Logo - Time8 */}
      <div className="absolute left-[32px] top-[32px] z-10">
        <div className="h-[30px] relative w-[108.333px]">
          <Image
            alt="time8 logo"
            className="block h-[30px] w-auto"
            src="/assets/auth/30f1f246576f6427b3a9b511194297cbba4d7ec6.svg"
            width={108}
            height={30}
            priority
          />
        </div>
      </div>

      {/* Centered content */}
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen w-full z-10">
        <div className="flex flex-col gap-8 items-center justify-start p-16 relative rounded-3xl">
          
          {/* Success Icon */}
          <CircleCheck className="size-16 text-foreground" strokeWidth={1.33} />

          {/* Content */}
          <div className="flex flex-col gap-3 items-center text-center">
            <h1 className="text-3xl font-bold leading-9">
              {t('title') || 'You have joined workspace'}
            </h1>
            <div className="flex gap-2.5 items-center justify-center">
              <p className="text-3xl font-semibold leading-9">
                {orgName}
              </p>
              {/* Avatar Group - Real Company Members */}
              {renderAvatars()}
            </div>
            <p className="text-sm text-muted-foreground">
              {t('subtitle') || 'Now you can start using Time8.io'}
            </p>
          </div>

          {/* CTA Button */}
          <Button
            size="lg"
            onClick={handleGoToDashboard}
          >
            {t('cta') || 'Go to dashboard'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SuccessPageContent />
    </Suspense>
  )
}