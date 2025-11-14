'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PricingInfo } from '@/lib/lemon-squeezy/pricing'
import { DecorativeBackground } from '@/components/auth/DecorativeBackground'
import { LanguageDropdown } from '@/components/auth/LanguageDropdown'
import { OnboardingLogo } from '@/components/OnboardingLogo'
import { Minus, Plus, Loader2, Lock, Info } from 'lucide-react'

function UpdateSubscriptionPageContent() {
  const t = useTranslations('onboarding.updateSubscription')
  const searchParams = useSearchParams()
  const [userCount, setUserCount] = useState(3)
  const [selectedTier, setSelectedTier] = useState<'monthly' | 'yearly'>('yearly')
  const [currentTier, setCurrentTier] = useState<'monthly' | 'yearly'>('yearly')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [pricingInfo, setPricingInfo] = useState<PricingInfo | null>(null)
  const [pricingLoading, setPricingLoading] = useState(true)
  const [initialUserCount, setInitialUserCount] = useState(3)
  const [renewalDate, setRenewalDate] = useState<string | null>(null)
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const initializePage = async () => {
      // Check authentication
      const supabase = createClient()
      const { data: { user }, error } = await supabase.auth.getUser()

      if (error || !user) {
        router.push('/login')
        return
      }

      // Get organization ID and seat count from URL params
      const orgId = searchParams.get('current_org')
      const seats = parseInt(searchParams.get('seats') || '3')

      if (!orgId) {
        router.push('/admin/settings?tab=billing')
        return
      }

      setOrganizationId(orgId)
      setUserCount(seats)
      setInitialUserCount(seats)

      // Fetch current subscription to determine billing period
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('lemonsqueezy_subscription_id, lemonsqueezy_variant_id, lemonsqueezy_product_id, current_seats, renews_at')
        .eq('organization_id', orgId)
        .eq('status', 'active')
        .single()

      if (subscription) {
        setSubscriptionId(subscription.lemonsqueezy_subscription_id)

        // Determine tier based on product_id (preferred) or variant_id (fallback)
        const yearlyProductId = process.env.NEXT_PUBLIC_LEMONSQUEEZY_YEARLY_PRODUCT_ID || '693341'
        const monthlyVariantId = process.env.NEXT_PUBLIC_LEMONSQUEEZY_MONTHLY_VARIANT_ID || '972634'

        const isYearly = subscription.lemonsqueezy_product_id === yearlyProductId ||
                        subscription.lemonsqueezy_variant_id !== monthlyVariantId
        const tier = isYearly ? 'yearly' : 'monthly'

        setSelectedTier(tier)
        setCurrentTier(tier)
        setRenewalDate(subscription.renews_at)

        // Use current_seats from subscription
        if (subscription.current_seats) {
          setUserCount(subscription.current_seats)
          setInitialUserCount(subscription.current_seats)
        }

        console.log('🔄 Subscription loaded:', {
          tier,
          seats: subscription.current_seats,
          renewsAt: subscription.renews_at
        })
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
          setPricingInfo({
            monthlyPricePerSeat: 10.00,
            annualPricePerSeat: 8.00,
            currency: 'PLN',
            monthlyVariantId: '972634',
            yearlyVariantId: '1090954'
          })
        }
      } catch (error) {
        console.error('❌ Error loading pricing:', error)
        setPricingInfo({
          monthlyPricePerSeat: 10.00,
          annualPricePerSeat: 8.00,
          currency: 'PLN',
          monthlyVariantId: '972634',
          yearlyVariantId: '1090954'
        })
      } finally {
        setPricingLoading(false)
      }
    }

    initializePage()
  }, [router, searchParams])

  const handleUserCountChange = (delta: number) => {
    const newCount = Math.max(1, Math.min(50, userCount + delta))
    setUserCount(newCount)
  }

  const handleUpdateSubscription = async () => {
    if (!pricingInfo || !organizationId) return

    setIsLoading(true)
    setError(null)

    try {
      const tierChanged = selectedTier !== currentTier
      const seatsChanged = userCount !== initialUserCount

      if (currentTier === 'monthly' && selectedTier === 'yearly') {
        // Monthly → Yearly upgrade: redirect to checkout
        const response = await fetch('/api/billing/switch-to-yearly', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            seats: userCount,
            organization_id: organizationId
          })
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to switch to yearly billing')
        }

        // Redirect to checkout
        window.location.href = data.checkout_url
      } else if (seatsChanged && !tierChanged) {
        // Just update seats
        const response = await fetch('/api/billing/update-subscription-quantity', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            new_quantity: userCount
          })
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to update seat count')
        }

        // Redirect back to settings
        router.push('/admin/settings?tab=billing')
      } else if (!tierChanged && !seatsChanged) {
        // No changes made
        router.push('/admin/settings?tab=billing')
      }
    } catch (error: any) {
      console.error('Update subscription error:', error)
      setError(error.message || 'Failed to update subscription. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const isYearlyUser = currentTier === 'yearly'
  const tierChanged = selectedTier !== currentTier
  const seatsChanged = userCount !== initialUserCount
  const hasChanges = tierChanged || seatsChanged

  // Calculate pricing
  const getPricing = () => {
    if (!pricingInfo) return null

    return {
      monthlyPerSeat: pricingInfo.monthlyPricePerSeat,
      yearlyPerSeat: pricingInfo.annualPricePerSeat,
      monthlyTotal: userCount * pricingInfo.monthlyPricePerSeat,
      yearlyTotal: userCount * pricingInfo.annualPricePerSeat * 12,
      currency: pricingInfo.currency
    }
  }

  const pricing = getPricing()

  // Format renewal date
  const formatRenewalDate = (date: string | null) => {
    if (!date) return ''
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  // Show loading state while pricing loads
  if (pricingLoading || !pricingInfo || !pricing) {
    return (
      <div className="bg-[var(--bg-default)] relative size-full min-h-screen flex items-center justify-center">
        <DecorativeBackground />
        <div className="z-10">
          <Loader2 className="size-16 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[var(--bg-default)] relative size-full min-h-screen">
      <DecorativeBackground />

      {/* Logo in top-left corner */}
      <div className="absolute left-8 top-8 z-10">
        <OnboardingLogo width={108} height={30} />
      </div>

      <LanguageDropdown />

      {/* Main content container with max-width 824px */}
      <div className="absolute left-1/2 top-1/2 translate-x-[-50%] translate-y-[-50%] w-full max-w-[824px] px-8 z-10">
        <div className="flex flex-col gap-10 items-start w-full">
          {/* Header */}
          <div className="flex gap-3 items-center w-full">
            <Info className="size-6 text-muted-foreground" />
            <p className="flex-1 text-lg text-muted-foreground font-normal">
              {t('title')}
            </p>
          </div>

          <div className="flex flex-col gap-8 items-start w-full">
            {/* Yearly user banner */}
            {isYearlyUser && (
              <Alert variant="default" className="w-full border-blue-200 bg-blue-50">
                <Lock className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  {t('yearlyOnlyAtRenewal', { renewalDate: formatRenewalDate(renewalDate) })}
                </AlertDescription>
              </Alert>
            )}

            {/* Main question */}
            <h1 className="text-3xl font-bold leading-9 text-foreground">
              {t('question')}
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

            {/* Pricing cards */}
            <div className="grid grid-cols-2 gap-5 w-full">
              {/* Monthly payment card */}
              <div
                className={`
                  ${selectedTier === 'monthly' ? 'bg-violet-100 border-2 border-primary' : 'bg-card border-2 border-border'}
                  rounded-xl p-8 flex flex-col gap-6 relative
                  ${isYearlyUser ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
                  ${selectedTier !== 'monthly' && !isYearlyUser ? 'opacity-50' : ''}
                `}
                onClick={() => !isYearlyUser && setSelectedTier('monthly')}
              >
                {/* Lock overlay for yearly users */}
                {isYearlyUser && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900/10 rounded-xl">
                    <Lock className="h-8 w-8 text-gray-600" />
                  </div>
                )}

                <div className="flex flex-col gap-3">
                  <div className="flex gap-2.5 items-center">
                    <div className="bg-white relative rounded-full size-4 border">
                      {selectedTier === 'monthly' && !isYearlyUser && (
                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 size-2 rounded-full bg-foreground" />
                      )}
                    </div>
                    <span className="flex-1 text-lg font-semibold leading-7">{t('monthly')}</span>
                    <Badge className="ml-auto">{t('mostPopular')}</Badge>
                  </div>
                </div>
                <div className="flex gap-1.5 items-end">
                  <span className="text-3xl font-semibold leading-9">{pricing.monthlyPerSeat.toFixed(2)} {pricing.currency}</span>
                  <span className="text-sm text-muted-foreground">{t('perMonthPerUser')}</span>
                </div>
              </div>

              {/* Yearly payment card */}
              <div
                className={`
                  ${selectedTier === 'yearly' ? 'bg-violet-100 border-2 border-primary' : 'bg-card border-2 border-border'}
                  rounded-xl p-8 flex flex-col gap-6 cursor-pointer relative
                  ${selectedTier !== 'yearly' ? 'opacity-50' : ''}
                `}
                onClick={() => setSelectedTier('yearly')}
              >
                <div className="flex flex-col gap-3">
                  <div className="flex gap-2.5 items-center">
                    <div className="bg-white relative rounded-full size-4 border">
                      {selectedTier === 'yearly' && (
                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 size-2 rounded-full bg-foreground" />
                      )}
                    </div>
                    <span className="flex-1 text-lg font-semibold leading-7">{t('yearly')}</span>
                  </div>
                </div>
                <div className="flex gap-1.5 items-end">
                  <span className="text-3xl font-semibold leading-9">{pricing.yearlyPerSeat.toFixed(2)} {pricing.currency}</span>
                  <span className="text-sm text-muted-foreground">{t('perMonthPerUser')}</span>
                </div>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <Alert variant="destructive" className="w-full">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Action buttons */}
            <div className="flex gap-4 w-full">
              <Button
                variant="outline"
                onClick={() => router.push('/admin/settings?tab=billing')}
                disabled={isLoading}
                className="flex-1"
              >
                {t('cancel')}
              </Button>
              <Button
                onClick={handleUpdateSubscription}
                disabled={isLoading || !hasChanges}
                className="flex-1"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="size-4 animate-spin mr-2" />
                    {t('updating')}
                  </>
                ) : tierChanged && currentTier === 'monthly' ? (
                  t('switchToYearly')
                ) : (
                  t('updateSubscription')
                )}
              </Button>
            </div>

            {/* Info message */}
            <div className="w-full">
              <p className="text-xs text-blue-600 text-center font-medium">
                ℹ️ {isYearlyUser ? t('infoYearly') : t('infoMonthly')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function UpdateSubscriptionPage() {
  return (
    <Suspense fallback={
      <div className="bg-[var(--bg-default)] relative size-full min-h-screen flex items-center justify-center">
        <DecorativeBackground />
        <div className="z-10">
          <Loader2 className="size-16 animate-spin text-muted-foreground" />
        </div>
      </div>
    }>
      <UpdateSubscriptionPageContent />
    </Suspense>
  )
}
