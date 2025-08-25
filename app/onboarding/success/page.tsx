'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { createClient } from '@/lib/supabase/client'

interface CompanyMember {
  id: string
  full_name: string
  email: string
  avatar_url?: string
}

function SuccessPageContent() {
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
      <div className="inline-flex items-center" style={{ marginLeft: '-8px' }}>
        {visibleMembers.map((member, index) => (
          <Avatar 
            key={member.id} 
            className="bg-neutral-100 size-6 border-2 border-white"
            style={{ marginLeft: '8px' }}
          >
            {member.avatar_url && (
              <AvatarImage 
                src={member.avatar_url} 
                alt={member.full_name}
              />
            )}
            <AvatarFallback className="bg-neutral-100 font-normal text-[12px] text-neutral-950" style={{ fontFamily: 'Geist, sans-serif', fontWeight: 400, lineHeight: '20px' }}>
              {getInitials(member.full_name || member.email)}
            </AvatarFallback>
          </Avatar>
        ))}
        
        {/* Only show +X if there are MORE than 3 members total */}
        {companyMembers.length > maxVisible && (
          <Avatar className="bg-neutral-100 size-6 border-2 border-white" style={{ marginLeft: '8px' }}>
            <AvatarFallback className="bg-neutral-100 font-normal text-[12px] text-neutral-950" style={{ fontFamily: 'Geist, sans-serif', fontWeight: 400, lineHeight: '20px' }}>
              +{remainingCount}
            </AvatarFallback>
          </Avatar>
        )}
      </div>
    )
  }

  // Success screen matching Figma design (24761-15630)
  return (
    <div className="bg-white min-h-screen relative w-full">
      {/* Centered content */}
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen w-full">
        <div className="flex flex-col gap-8 items-center justify-start p-16 relative rounded-3xl">
          
          {/* Success Icon */}
          <div className="overflow-hidden relative size-16">
            <div className="absolute inset-[8.333%]">
              <svg className="w-full h-full text-neutral-900" fill="none" preserveAspectRatio="none" viewBox="0 0 55 55">
                <path
                  d="M19.6667 27.6667L25 33L35.6667 22.3333M54.3333 27.6667C54.3333 42.3943 42.3943 54.3333 27.6667 54.3333C12.9391 54.3333 1 42.3943 1 27.6667C1 12.9391 12.9391 1 27.6667 1C42.3943 1 54.3333 12.9391 54.3333 27.6667Z"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.33"
                />
              </svg>
            </div>
          </div>

          {/* Content */}
          <div className="flex flex-col gap-3 items-start justify-start p-0 relative">
            <div className="flex flex-col gap-3 items-center justify-start p-0 relative w-full">
              <div className="font-bold leading-[36px] relative text-[30px] text-center text-neutral-950" style={{ fontFamily: 'Geist, sans-serif', fontWeight: 700 }}>
                <p className="block leading-[36px] whitespace-pre">You have joined workspace</p>
              </div>
              <div className="flex gap-2.5 items-center justify-center p-0 relative w-full">
                <div className="font-bold relative text-[30px] text-center text-neutral-950" style={{ fontFamily: 'Geist, sans-serif', fontWeight: 700, lineHeight: '36px' }}>
                  <p className="block leading-[36px] whitespace-pre">{orgName}</p>
                </div>
                {/* Avatar Group - Real Company Members */}
                {renderAvatars()}
              </div>
            </div>
            <div className="font-normal relative text-[14px] text-center text-neutral-500 w-full" style={{ fontFamily: 'Geist, sans-serif', fontWeight: 400, lineHeight: '20px' }}>
              <p className="block leading-[20px]">Now you can start using Time8.io</p>
            </div>
          </div>

          {/* CTA Button */}
          <button
            onClick={handleGoToDashboard}
            className="bg-neutral-900 flex gap-2 h-10 items-center justify-center px-8 py-2 relative rounded-lg shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-neutral-800 transition-colors"
          >
            <div className="font-medium text-[14px] text-neutral-50" style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500, lineHeight: '20px' }}>
              <p className="block leading-[20px] whitespace-pre">Go to dashboard</p>
            </div>
          </button>
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