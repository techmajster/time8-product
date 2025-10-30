'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { RefreshCw, TriangleAlert } from 'lucide-react'
import { DecorativeBackground } from '@/components/auth/DecorativeBackground'
import { LanguageSwitcher } from '@/components/auth/LanguageSwitcher'
import Image from 'next/image'

function PaymentFailurePageContent() {
  const t = useTranslations('onboarding.paymentFailure')
  const [isRetrying, setIsRetrying] = useState(false)
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error || !user) {
        router.push('/login')
        return
      }

      // Get organization_id from URL params
      const orgId = searchParams.get('org_id')
      if (orgId) {
        setOrganizationId(orgId)
      }
    }

    checkAuth()
  }, [router, searchParams])

  const handleRetryPayment = async () => {
    if (!organizationId) {
      router.push('/onboarding/add-users')
      return
    }

    setIsRetrying(true)
    // Redirect back to add-users page to retry the payment process
    router.push(`/onboarding/add-users?org_id=${organizationId}`)
  }

  const handleUseFree = () => {
    // Redirect to dashboard for free tier usage
    router.push('/dashboard')
  }

  const handleContactSupport = () => {
    // You can customize this to your support email or contact method
    window.open('mailto:support@time8.io?subject=Payment Issue - Need Help', '_blank')
  }

  return (
    <div className="bg-white min-h-screen relative">
      <DecorativeBackground />
      
      {/* Logo */}
      <div className="absolute left-8 top-8 z-10">
        <Image
          alt="time8 logo"
          className="block h-[30px] w-auto"
          src="/assets/auth/30f1f246576f6427b3a9b511194297cbba4d7ec6.svg"
          width={108}
          height={30}
          priority
        />
      </div>

      <LanguageSwitcher />

      {/* Centered content */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
        <div className="flex flex-col gap-8 items-center p-16">
          <TriangleAlert className="size-16 text-destructive stroke-[1.33]" />
          <div className="flex flex-col gap-3 items-center">
            <h1 className="text-3xl font-bold leading-9 text-center text-foreground">
              {t('title')}
            </h1>
            <p className="text-sm text-muted-foreground text-center leading-5">
              {t('description')}
            </p>
          </div>
          <Button onClick={handleRetryPayment} disabled={isRetrying}>
            {isRetrying && <RefreshCw className="w-4 h-4 animate-spin mr-2" />}
            {t('button')}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function PaymentFailurePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PaymentFailurePageContent />
    </Suspense>
  )
}