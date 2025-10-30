'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { PricingInfo, calculatePricing } from '@/lib/lemon-squeezy/pricing'
import { DecorativeBackground } from '@/components/auth/DecorativeBackground'
import { LanguageSwitcher } from '@/components/auth/LanguageSwitcher'
import { UserPlusIcon } from '@/components/onboarding/icons'
import { Minus, Plus } from 'lucide-react'

function AddUsersPageContent() {
  const t = useTranslations('onboarding.addUsers')
  const [userCount, setUserCount] = useState(3)
  const [selectedTier, setSelectedTier] = useState<'monthly' | 'annual'>('annual')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [organizationData, setOrganizationData] = useState<any>(null)
  const [pricingInfo, setPricingInfo] = useState<PricingInfo | null>(null)
  const [pricingLoading, setPricingLoading] = useState(true)
  const [isUpgradeFlow, setIsUpgradeFlow] = useState(false)
  const router = useRouter()

  const FREE_SEATS = 3

  useEffect(() => {
    const initializePage = async () => {
      // Check authentication
      const supabase = createClient()
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error || !user) {
        router.push('/login')
        return
      }

      // Check if this is an upgrade flow
      const urlParams = new URLSearchParams(window.location.search)
      const isUpgrade = urlParams.get('upgrade') === 'true'
      const currentOrgId = urlParams.get('current_org')
      const recommendedSeats = parseInt(urlParams.get('seats') || '4')
      
      setIsUpgradeFlow(isUpgrade)
      
      if (isUpgrade && currentOrgId) {
        // This is an upgrade - fetch existing organization
        const { data: org, error: orgError } = await supabase
          .from('organizations')
          .select('id, name, slug, country_code')
          .eq('id', currentOrgId)
          .single()
          
        if (org && !orgError) {
          setOrganizationData(org)
          setUserCount(recommendedSeats) // Set recommended seat count
          console.log('🔄 Upgrade flow initialized:', { org: org.name, seats: recommendedSeats })
        } else {
          console.error('Failed to load organization for upgrade:', orgError)
          router.push('/admin/settings?tab=billing')
          return
        }
      } else {
        // Original new workspace flow - get organization data from session storage
        if (typeof window !== 'undefined' && window.sessionStorage) {
          const storedOrgData = sessionStorage.getItem('pending_organization')
          if (storedOrgData) {
            try {
              const parsedData = JSON.parse(storedOrgData)
              setOrganizationData(parsedData)
            } catch (e) {
              console.error('Failed to parse stored organization data:', e)
              router.push('/onboarding/create-workspace')
              return
            }
          } else {
            router.push('/onboarding/create-workspace')
            return
          }
        }
      }

      // Fetch dynamic pricing from API
      try {
        setPricingLoading(true)
        const response = await fetch('/api/billing/pricing')
        const data = await response.json()
        
        if (data.success && data.pricing) {
          setPricingInfo(data.pricing)
          console.log('✅ Dynamic pricing loaded:', data.pricing)
        } else {
          console.warn('⚠️ Failed to load pricing, using fallback')
          // Set fallback pricing
          setPricingInfo({
            monthlyPricePerSeat: 12.99,
            annualPricePerSeat: 10.83,
            currency: 'PLN',
            monthlyVariantId: '972634',
            yearlyVariantId: '972635'
          })
        }
      } catch (error) {
        console.error('❌ Error loading pricing:', error)
        // Use fallback pricing
        setPricingInfo({
          monthlyPricePerSeat: 12.99,
          annualPricePerSeat: 10.83,
          currency: 'PLN',
          monthlyVariantId: '972634',
          yearlyVariantId: '972635'
        })
      } finally {
        setPricingLoading(false)
      }
    }

    initializePage()
  }, [router])

  // Get current pricing calculation
  const getCurrentPricing = () => {
    if (!pricingInfo) {
      return {
        isFree: true,
        totalUsers: userCount,
        paidSeats: 0,
        monthlyTotal: 0,
        annualTotal: 0,
        monthlyPerSeat: 0,
        annualPerSeat: 0,
        currency: 'PLN'
      }
    }
    
    return calculatePricing(userCount, pricingInfo)
  }

  const handleUserCountChange = (delta: number) => {
    const newCount = Math.max(1, Math.min(50, userCount + delta))
    setUserCount(newCount)
  }

  const calculateTotal = () => {
    const pricing = getCurrentPricing()
    
    if (pricing.isFree) {
      return { monthly: 0, annual: 0, currency: pricing.currency }
    }
    
    if (selectedTier === 'monthly') {
      return {
        monthly: pricing.monthlyTotal,
        annual: 0,
        currency: pricing.currency
      }
    }
    
    if (selectedTier === 'annual') {
      return {
        monthly: pricing.monthlyTotal,
        annual: pricing.annualTotal,
        currency: pricing.currency
      }
    }
    
    return { monthly: 0, annual: 0, currency: pricing.currency }
  }

  const handleContinue = async () => {
    if (!organizationData) {
      setError('Organization data missing')
      return
    }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      setError('User authentication required')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      if (userCount <= FREE_SEATS) {
        // Free tier handling
        if (isUpgradeFlow) {
          // For upgrades, free tier doesn't make sense - redirect back to billing
          console.log('🚫 Cannot downgrade to free tier from upgrade flow')
          router.push('/admin/settings?tab=billing')
          return
        } else {
          // For new workspace: go to confirmation page (no payment required)
          console.log('🆓 Free tier: redirecting to confirmation page')
          router.push('/onboarding/payment-success?free=true')
          return
        }
      }

      // Paid tier: create checkout session with organization data
      // Use dynamic variant IDs from pricing info
      if (!pricingInfo) {
        throw new Error('Pricing information not loaded')
      }
      
      const variantId = selectedTier === 'annual' ? 
        pricingInfo.yearlyVariantId : 
        pricingInfo.monthlyVariantId
      
      console.log('🔍 Checkout preparation:', {
        selectedTier,
        userCount,
        requiredPaidSeats: userCount - FREE_SEATS,
        variantId
      })
      
      if (!variantId) {
        throw new Error(`Missing variant ID for ${selectedTier} billing`)
      }

      // Create checkout session with organization data
      const checkoutPayload = {
        variant_id: variantId,
        organization_data: organizationData,
        user_count: userCount,
        tier: selectedTier,
        return_url: `${window.location.origin}/onboarding/payment-success${isUpgradeFlow ? '?upgrade=true' : ''}`,
        failure_url: `${window.location.origin}/onboarding/payment-failure${isUpgradeFlow ? '?upgrade=true' : ''}`
      }
      
      console.log('📤 Sending checkout payload:', checkoutPayload)
      
      const checkoutResponse = await fetch('/api/billing/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(checkoutPayload)
      })

      const checkoutData = await checkoutResponse.json()

      if (!checkoutResponse.ok) {
        throw new Error(checkoutData.error || 'Failed to create checkout session')
      }

      // Redirect to Lemon Squeezy checkout
      window.location.href = checkoutData.checkout_url

    } catch (error: any) {
      console.error('Continue error:', error)
      setError(error.message || 'Failed to continue. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const isFreeSelected = userCount <= FREE_SEATS
  const total = calculateTotal()
  const pricing = getCurrentPricing()
  
  // Show loading state while pricing loads
  if (pricingLoading || !pricingInfo) {
    return (
      <div className="bg-white relative size-full min-h-screen flex items-center justify-center">
        <DecorativeBackground />
        <div className="text-center z-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading pricing information...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white relative size-full min-h-screen">
      <DecorativeBackground />
      
      {/* Logo in top-left corner */}
      <div className="absolute left-8 top-8 z-10">
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

      <LanguageSwitcher />

      {/* Main content container with max-width 824px */}
      <div className="absolute left-1/2 top-1/2 translate-x-[-50%] translate-y-[-50%] w-full max-w-[824px] px-8 z-10">
        <div className="flex flex-col gap-10 items-start w-full">
        {/* Header with icon and text */}
        <div className="flex gap-3 items-center w-full">
          <UserPlusIcon className="size-6 text-muted-foreground" />
          <p className="flex-1 text-lg text-muted-foreground font-normal">
            {isUpgradeFlow ? t('titleUpgrade') : t('title')}
          </p>
        </div>

        <div className="flex flex-col gap-8 items-start w-full">
          <div className="flex flex-col gap-8 items-start w-full">
            {/* Main question */}
            <h1 className="text-3xl font-bold leading-9 text-foreground">
              {isUpgradeFlow ? t('questionUpgrade') : t('question')}
            </h1>

            {/* Counter section */}
            <div className="flex gap-2 items-center w-80">
              {/* Minus button */}
              <Button
                onClick={() => handleUserCountChange(-1)}
                disabled={userCount <= 1}
                variant="outline"
                className="size-16 p-0 border-foreground"
              >
                <Minus className="size-6 text-foreground" />
              </Button>

              {/* Number display */}
              <div className="flex-1 h-16 flex items-center justify-center border rounded-lg bg-white shadow-xs">
                <span className="text-[36px] font-semibold leading-none">{userCount}</span>
              </div>

              {/* Plus button */}
              <Button
                onClick={() => handleUserCountChange(1)}
                disabled={userCount >= 50}
                variant="outline"
                className="size-16 p-0 border-foreground"
              >
                <Plus className="size-6 text-foreground" />
              </Button>
            </div>
          </div>

          {/* Pricing cards */}
          <div className="grid grid-cols-2 gap-5 w-full">
            {isFreeSelected ? (
              <>
                {/* Free card - selected when user count <= 3 */}
                <div 
                  className="bg-violet-100 border-2 border-primary rounded-xl p-8 flex flex-col gap-6 cursor-pointer relative"
                  onClick={() => setSelectedTier('monthly')}
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex gap-2.5 items-center">
                      <div className="bg-white relative rounded-full size-4 border">
                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 size-2 rounded-full bg-primary" />
                      </div>
                      <span className="flex-1 text-lg font-semibold leading-7">{t('pricing.free')}</span>
                    </div>
                  </div>
                  <div className="flex gap-1.5 items-end">
                    <span className="text-3xl font-semibold leading-9">{t('pricing.free')}</span>
                    <span className="text-sm text-muted-foreground">{t('pricing.upTo3Users')}</span>
                  </div>
                </div>

                {/* Annual payment card - disabled when free */}
                <div className="bg-muted border border-border rounded-xl p-8 flex flex-col gap-6 cursor-not-allowed relative">
                  <div className="flex flex-col gap-6 opacity-50">
                    <div className="flex flex-col gap-3">
                      <div className="flex gap-2.5 items-center">
                        <div className="bg-white relative rounded-full size-4 border" />
                        <span className="flex-1 text-lg font-semibold leading-7">{t('pricing.annualPayment')}</span>
                      </div>
                    </div>
                    <div className="flex gap-1.5 items-end">
                      <span className="text-3xl font-semibold leading-9">{pricing.annualPerSeat.toFixed(2)} {pricing.currency}</span>
                      <span className="text-sm text-muted-foreground">{t('pricing.perMonthPerUser')}</span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Monthly payment card with "Most popular" badge - LEFT SIDE */}
                <div 
                  className={`${selectedTier === 'monthly' ? 'bg-violet-100 border-2 border-primary' : 'bg-card border-2 border-border'} rounded-xl p-8 flex flex-col gap-6 cursor-pointer relative ${selectedTier !== 'monthly' ? 'opacity-50' : ''}`}
                  onClick={() => setSelectedTier('monthly')}
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex gap-2.5 items-center">
                      <div className="bg-white relative rounded-full size-4 border">
                        {selectedTier === 'monthly' && (
                          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 size-2 rounded-full bg-foreground" />
                        )}
                      </div>
                      <span className="flex-1 text-lg font-semibold leading-7">{t('pricing.monthlyPayment')}</span>
                      {/* Most popular badge - inline with label */}
                      <Badge className="ml-auto">{t('pricing.mostPopular')}</Badge>
                    </div>
                  </div>
                  <div className="flex gap-1.5 items-end">
                    <span className="text-3xl font-semibold leading-9">{pricing.monthlyPerSeat.toFixed(2)} {pricing.currency}</span>
                    <span className="text-sm text-muted-foreground">{t('pricing.perMonthPerUser')}</span>
                  </div>
                </div>

                {/* Annual payment card - RIGHT SIDE */}
                <div 
                  className={`${selectedTier === 'annual' ? 'bg-violet-100 border-2 border-primary' : 'bg-card border-2 border-border'} rounded-xl p-8 flex flex-col gap-6 cursor-pointer relative ${selectedTier !== 'annual' ? 'opacity-50' : ''}`}
                  onClick={() => setSelectedTier('annual')}
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex gap-2.5 items-center">
                      <div className="bg-white relative rounded-full size-4 border">
                        {selectedTier === 'annual' && (
                          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 size-2 rounded-full bg-foreground" />
                        )}
                      </div>
                      <span className="flex-1 text-lg font-semibold leading-7">{t('pricing.annualPayment')}</span>
                    </div>
                  </div>
                  <div className="flex gap-1.5 items-end">
                    <span className="text-3xl font-semibold leading-9">{pricing.annualPerSeat.toFixed(2)} {pricing.currency}</span>
                    <span className="text-sm text-muted-foreground">{t('pricing.perMonthPerUser')}</span>
                  </div>
                </div>
              </>
            )}
          </div>
          
          {/* Currency info note */}
          {!isFreeSelected && (
            <div className="flex items-center justify-center w-full">
              <p className="text-sm text-muted-foreground text-center">
                {t('pricing.pricesNote', { currency: pricing.currency })}
              </p>
            </div>
          )}
        </div>

        <Separator />

        {/* Bottom section with total and continue button */}
        <div className="flex gap-5 items-center w-full">
          <div className="flex-1 flex gap-1.5 items-center text-lg">
            <span className="font-normal">{t('total.label')}</span>
            <span className="font-semibold">
              {total.monthly > 0 
                ? selectedTier === 'annual' 
                  ? t('total.annual', { amount: total.annual.toFixed(2), currency: total.currency })
                  : t('total.monthly', { amount: total.monthly.toFixed(2), currency: total.currency })
                : t('total.free')
              }
            </span>
          </div>
          <div className="flex gap-3">
            {/* Cancel button - only show in upgrade flow */}
            {isUpgradeFlow && (
              <Button
                variant="outline"
                onClick={() => router.push('/admin/settings?tab=billing')}
                disabled={isLoading}
                size="lg"
              >
                {t('actions.cancel')}
              </Button>
            )}
            <Button
              onClick={handleContinue}
              disabled={isLoading}
              size="lg"
            >
              {isLoading ? t('actions.processing') : t('actions.continue')}
            </Button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="w-full">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        </div>
      </div>
    </div>
  )
}

export default function AddUsersPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    }>
      <AddUsersPageContent />
    </Suspense>
  )
}