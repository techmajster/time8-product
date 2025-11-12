'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Loader2, ArrowLeft } from 'lucide-react'
import { DecorativeBackground } from '@/components/auth/DecorativeBackground'
import { LanguageDropdown } from '@/components/auth/LanguageDropdown'
import { OnboardingLogo } from '@/components/OnboardingLogo'
import { getDynamicPricing, calculatePricing, type PricingInfo } from '@/lib/lemon-squeezy/pricing'

function ChangeBillingPeriodContent() {
  const t = useTranslations('onboarding.createWorkspace')
  const [isLoading, setIsLoading] = useState(true)
  const [pricingInfo, setPricingInfo] = useState<PricingInfo | null>(null)
  const [currentTier, setCurrentTier] = useState<'monthly' | 'annual'>('monthly')
  const [selectedTier, setSelectedTier] = useState<'monthly' | 'annual'>('monthly')
  const [currentSeats, setCurrentSeats] = useState(0)
  const [organizationData, setOrganizationData] = useState<any>(null)
  const [subscriptionData, setSubscriptionData] = useState<any>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const loadData = async () => {
      const supabase = createClient()
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (authError || !user) {
        router.push('/login')
        return
      }

      const orgId = searchParams.get('current_org')
      const seats = searchParams.get('seats')

      if (!orgId) {
        console.error('No organization ID provided')
        router.push('/admin/settings?tab=billing')
        return
      }

      // Fetch organization
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', orgId)
        .single()

      if (orgError || !org) {
        console.error('Organization not found:', orgError)
        router.push('/admin/settings?tab=billing')
        return
      }

      setOrganizationData(org)
      setCurrentSeats(parseInt(seats || '0'))

      // Fetch current subscription
      const { data: subscription, error: subError } = await supabase
        .from('subscriptions')
        .select('lemonsqueezy_variant_id, status')
        .eq('organization_id', orgId)
        .eq('status', 'active')
        .single()

      if (subError || !subscription) {
        console.error('No active subscription found:', subError)
        router.push('/admin/settings?tab=billing')
        return
      }

      setSubscriptionData(subscription)

      // Determine current billing period
      const monthlyVariantId = process.env.NEXT_PUBLIC_LEMONSQUEEZY_MONTHLY_VARIANT_ID || '972634'
      const isMonthly = subscription.lemonsqueezy_variant_id === monthlyVariantId
      setCurrentTier(isMonthly ? 'monthly' : 'annual')
      setSelectedTier(isMonthly ? 'annual' : 'monthly') // Default to opposite

      // Fetch pricing
      const pricing = await getDynamicPricing()
      setPricingInfo(pricing)
      setIsLoading(false)
    }

    loadData()
  }, [router, searchParams])

  const handleChangeBillingPeriod = async () => {
    if (!organizationData || !subscriptionData || !pricingInfo) return

    setIsProcessing(true)

    try {
      const newVariantId = selectedTier === 'monthly'
        ? pricingInfo.monthlyVariantId
        : pricingInfo.yearlyVariantId

      console.log('🔄 Changing billing period:', {
        from: currentTier,
        to: selectedTier,
        newVariantId,
        seats: currentSeats
      })

      const response = await fetch('/api/billing/change-billing-period', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          organization_id: organizationData.id,
          new_variant_id: newVariantId,
          billing_period: selectedTier
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to change billing period')
      }

      console.log('✅ Billing period change initiated:', result)

      // Redirect to payment success page to wait for confirmation
      router.push(`/onboarding/payment-success?upgrade=true&org_id=${organizationData.id}`)
    } catch (error: any) {
      console.error('Error changing billing period:', error)
      alert(`Error: ${error.message}`)
      setIsProcessing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="bg-[var(--bg-default)] min-h-screen relative">
        <DecorativeBackground />

        <div className="absolute left-8 top-8 z-10">
          <OnboardingLogo width={108} height={30} />
        </div>

        <LanguageDropdown />

        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
          <Loader2 className="size-16 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  if (!pricingInfo) {
    return (
      <div className="bg-[var(--bg-default)] min-h-screen relative">
        <DecorativeBackground />

        <div className="absolute left-8 top-8 z-10">
          <OnboardingLogo width={108} height={30} />
        </div>

        <LanguageDropdown />

        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
          <div className="text-center">
            <p className="text-destructive">Failed to load pricing information</p>
            <Button onClick={() => router.push('/admin/settings?tab=billing')} className="mt-4">
              Back to Settings
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const currentPricing = calculatePricing(currentSeats, pricingInfo)
  const newPricing = currentTier === 'monthly'
    ? { ...currentPricing, monthlyTotal: currentPricing.annualTotal / 12 }
    : { ...currentPricing, annualTotal: currentPricing.monthlyTotal * 12 }

  return (
    <div className="bg-[var(--bg-default)] min-h-screen relative">
      <DecorativeBackground />

      {/* Logo */}
      <div className="absolute left-8 top-8 z-10">
        <OnboardingLogo width={108} height={30} />
      </div>

      <LanguageDropdown />

      {/* Back button */}
      <div className="absolute left-8 top-24 z-10">
        <Button
          variant="ghost"
          onClick={() => router.push('/admin/settings?tab=billing')}
          className="gap-2"
        >
          <ArrowLeft className="size-4" />
          Back to Settings
        </Button>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen px-4 py-20">
        <div className="w-full max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Change Billing Period
            </h1>
            <p className="text-muted-foreground">
              Switch between monthly and annual billing for {organizationData?.name}
            </p>
          </div>

          {/* Billing Period Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Monthly Card */}
            <div
              className={`${
                selectedTier === 'monthly'
                  ? 'bg-violet-100 border-2 border-primary'
                  : 'bg-card border-2 border-border'
              } rounded-xl p-8 flex flex-col gap-6 cursor-pointer relative ${
                currentTier === 'monthly' ? 'opacity-75' : ''
              }`}
              onClick={() => currentTier !== 'monthly' && setSelectedTier('monthly')}
            >
              {currentTier === 'monthly' && (
                <div className="absolute top-4 right-4 bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full">
                  Current Plan
                </div>
              )}
              <div className="flex flex-col gap-2">
                <h3 className="text-2xl font-bold text-foreground">Monthly Billing</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-foreground">
                    {pricingInfo.monthlyPricePerSeat.toFixed(2)}
                  </span>
                  <span className="text-muted-foreground">{pricingInfo.currency} / seat / month</span>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  • Billed monthly
                </p>
                <p className="text-sm text-muted-foreground">
                  • Cancel anytime
                </p>
                <p className="text-sm text-muted-foreground">
                  • {currentSeats} seats × {pricingInfo.monthlyPricePerSeat.toFixed(2)} {pricingInfo.currency}
                </p>
                <p className="text-lg font-semibold text-foreground mt-4">
                  Total: {currentPricing.monthlyTotal.toFixed(2)} {pricingInfo.currency}/month
                </p>
              </div>
            </div>

            {/* Annual Card */}
            <div
              className={`${
                selectedTier === 'annual'
                  ? 'bg-violet-100 border-2 border-primary'
                  : 'bg-card border-2 border-border'
              } rounded-xl p-8 flex flex-col gap-6 cursor-pointer relative ${
                currentTier === 'annual' ? 'opacity-75' : ''
              }`}
              onClick={() => currentTier !== 'annual' && setSelectedTier('annual')}
            >
              {currentTier === 'annual' && (
                <div className="absolute top-4 right-4 bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full">
                  Current Plan
                </div>
              )}
              <div className="absolute top-4 right-4 bg-green-100 text-green-800 text-xs font-medium px-3 py-1 rounded-full">
                Save 20%
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="text-2xl font-bold text-foreground">Annual Billing</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-foreground">
                    {pricingInfo.annualPricePerSeat.toFixed(2)}
                  </span>
                  <span className="text-muted-foreground">{pricingInfo.currency} / seat / month</span>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  • Billed annually
                </p>
                <p className="text-sm text-muted-foreground">
                  • 2 months free
                </p>
                <p className="text-sm text-muted-foreground">
                  • {currentSeats} seats × {(pricingInfo.annualPricePerSeat * 12).toFixed(2)} {pricingInfo.currency}/year
                </p>
                <p className="text-lg font-semibold text-foreground mt-4">
                  Total: {currentPricing.annualTotal.toFixed(2)} {pricingInfo.currency}/year
                </p>
                <p className="text-sm text-muted-foreground">
                  ({(currentPricing.annualTotal / 12).toFixed(2)} {pricingInfo.currency}/month)
                </p>
              </div>
            </div>
          </div>

          {/* Confirmation */}
          <div className="bg-card border border-border rounded-xl p-6 mb-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Change Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Current Plan:</span>
                <span className="font-medium text-foreground capitalize">{currentTier} Billing</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">New Plan:</span>
                <span className="font-medium text-foreground capitalize">{selectedTier} Billing</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-border">
                <span className="text-muted-foreground">Seats:</span>
                <span className="font-medium text-foreground">{currentSeats}</span>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <Button
            onClick={handleChangeBillingPeriod}
            disabled={isProcessing || currentTier === selectedTier}
            className="w-full h-12 text-base"
          >
            {isProcessing ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              `Change to ${selectedTier.charAt(0).toUpperCase() + selectedTier.slice(1)} Billing`
            )}
          </Button>

          {currentTier === selectedTier && (
            <p className="text-center text-sm text-muted-foreground mt-4">
              You are already on {currentTier} billing
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ChangeBillingPeriodPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <ChangeBillingPeriodContent />
    </Suspense>
  )
}
