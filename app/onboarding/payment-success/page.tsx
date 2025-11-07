'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Loader2, CircleCheck, XCircle } from 'lucide-react'
import { DecorativeBackground } from '@/components/auth/DecorativeBackground'
import { LanguageDropdown } from '@/components/auth/LanguageDropdown'
import { OnboardingLogo } from '@/components/OnboardingLogo'
import Image from 'next/image'

function PaymentSuccessPageContent() {
  const t = useTranslations('onboarding.paymentSuccess')
  const [isLoading, setIsLoading] = useState(true)
  const [subscriptionData, setSubscriptionData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [organizationData, setOrganizationData] = useState<any>(null)
  const [isCreatingOrganization, setIsCreatingOrganization] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    let isMounted = true // Prevent race conditions from double useEffect calls

    const checkPaymentAndSetup = async () => {
      const supabase = createClient()
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        router.push('/login')
        return
      }

      // Check if this is a free tier confirmation
      const isFree = searchParams.get('free') === 'true'
      
      // Check if this is an upgrade flow
      const isUpgrade = searchParams.get('upgrade') === 'true'

      // Handle upgrade flow - redirect to dashboard
      if (isUpgrade) {
        console.log('🔄 Upgrade successful, redirecting to dashboard')
        setSubscriptionData({ status: 'processing', upgraded: true })
        setIsLoading(false)
        
        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
          router.push('/dashboard')
        }, 2000)
        return
      }

      // Check if we have organization data in session storage (new workspace flow)
      const storedOrgData = sessionStorage?.getItem('pending_organization')

      if (storedOrgData) {
        try {
          const orgData = JSON.parse(storedOrgData)
          setOrganizationData(orgData)

          // First, check if organization already exists (prevents duplicate creation on page refresh)
          console.log('🔍 Checking if organization already exists with slug:', orgData.slug)
          const checkResponse = await fetch(`/api/organizations/check?slug=${encodeURIComponent(orgData.slug)}`)
          const checkResult = await checkResponse.json()

          if (checkResult.exists && checkResult.belongsToUser) {
            console.log('✅ Organization already exists, using existing:', checkResult.organization)

            // Clear session storage immediately to prevent future attempts
            sessionStorage.removeItem('pending_organization')

            // Set the existing organization as active
            setOrganizationId(checkResult.organization.id)
            setIsCreatingOrganization(false)

            // For free tier, set status as 'free', for paid tier set as 'processing'
            if (isFree) {
              setSubscriptionData({ status: 'free', seats: 3 })
            } else {
              setSubscriptionData({ status: 'processing' })
            }

            setIsLoading(false)
            return
          } else if (checkResult.exists && !checkResult.belongsToUser) {
            // Slug is taken by another user - this shouldn't happen but handle it
            throw new Error('Organization slug is already taken. Please contact support.')
          }

          // Organization doesn't exist yet, proceed with creation
          if (!isMounted) return // Check if component is still mounted
          setIsCreatingOrganization(true)

          console.log(isFree ? '🆓 Creating free tier organization' : '💳 Creating paid tier organization after payment')

          const response = await fetch('/api/organizations', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              ...orgData,
              user_id: user.id
            })
          })

          const result = await response.json()

          if (!isMounted) return // Check again after async operation

          if (!response.ok) {
            // If it's a duplicate error and we got an existing org, use it
            if (result.existing && result.organization) {
              console.log('✅ Organization already exists (API returned existing)', result.organization)
              sessionStorage.removeItem('pending_organization')
              setOrganizationId(result.organization.id)
              setIsCreatingOrganization(false)

              if (isFree) {
                setSubscriptionData({ status: 'free', seats: 3 })
              } else {
                setSubscriptionData({ status: 'processing' })
              }
              setIsLoading(false)
              return
            }
            throw new Error(result.error || 'Failed to create organization')
          }

          // Clear session storage and set organization ID
          sessionStorage.removeItem('pending_organization')
          setOrganizationId(result.organization.id)
          setIsCreatingOrganization(false)

          console.log('✅ Organization created:', result.organization)
          
          // For free tier, set status as 'free', for paid tier set as 'processing'
          if (isFree) {
            setSubscriptionData({ status: 'free', seats: 3 })
          } else {
            // Set a processing status since subscription might still be syncing
            setSubscriptionData({ status: 'processing' })
          }
          
        } catch (error: any) {
          console.error('Error creating organization:', error)
          setError('Payment successful but failed to create workspace. Please contact support.')
          setIsCreatingOrganization(false)
        }
      } else {
        // Legacy flow: Get organization_id from URL params
        const orgId = searchParams.get('org_id')
        if (!orgId) {
          router.push('/dashboard')
          return
        }
        
        setOrganizationId(orgId)

        try {
          // Check subscription status for the organization
          const subscriptionResponse = await fetch(`/api/billing/subscription?organization_id=${orgId}`)
          const subscriptionResult = await subscriptionResponse.json()

          if (subscriptionResponse.ok && subscriptionResult.subscription) {
            setSubscriptionData(subscriptionResult.subscription)
          } else {
            // If no subscription found yet, it might be processing
            console.log('Subscription not found yet, may still be processing')
            setSubscriptionData({ status: 'processing' })
          }
        } catch (error: any) {
          console.error('Error checking subscription:', error)
          setError('Unable to verify payment status. Please contact support if this persists.')
        }
      }
      
      setIsLoading(false)
    }

    checkPaymentAndSetup()

    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false
    }
  }, [router, searchParams])

  const handleContinue = () => {
    router.push('/dashboard')
  }

  if (isLoading) {
    return (
      <div className="bg-[var(--bg-default)] min-h-screen relative">
        <DecorativeBackground />
        
        {/* Logo */}
        <div className="absolute left-8 top-8 z-10">
          <OnboardingLogo width={108} height={30} />
        </div>

        <LanguageDropdown />

        {/* Centered content */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
          <Loader2 className="size-16 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-[var(--bg-default)] min-h-screen relative">
        <DecorativeBackground />
        
        {/* Logo */}
        <div className="absolute left-8 top-8 z-10">
          <OnboardingLogo width={108} height={30} />
        </div>

        <LanguageDropdown />

        {/* Centered content */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
          <div className="flex flex-col gap-8 items-center p-16">
            <XCircle className="size-16 text-destructive stroke-[1.33]" />
            <div className="flex flex-col gap-3 items-center">
              <h1 className="text-3xl font-bold leading-9 text-center text-foreground">
                {t('error.title')}
              </h1>
              <p className="text-sm text-muted-foreground text-center leading-5">
                {error}
              </p>
            </div>
            <Button onClick={() => router.push('/dashboard')}>
              {t('error.button')}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[var(--bg-default)] min-h-screen relative">
      <DecorativeBackground />
      
      {/* Logo */}
      <div className="absolute left-8 top-8 z-10">
        <OnboardingLogo width={108} height={30} />
      </div>

      <LanguageDropdown />

      {/* Centered content */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
        <div className="flex flex-col gap-8 items-center p-16">
          <CircleCheck className="size-16 text-foreground stroke-[1.33]" />
          <div className="flex flex-col gap-3 items-center">
            <h1 className="text-3xl font-bold leading-9 text-center text-foreground">
              {subscriptionData?.upgraded ? t('success.titleUpgraded') : t('success.title')}
            </h1>
            <p className="text-sm text-muted-foreground text-center leading-5">
              {subscriptionData?.upgraded 
                ? t('success.descriptionUpgraded')
                : t('success.description')}
            </p>
          </div>
          <Button onClick={handleContinue}>
            {t('success.button')}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>}>
      <PaymentSuccessPageContent />
    </Suspense>
  )
}