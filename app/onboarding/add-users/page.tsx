'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Time8Logo } from '@/components/ui/time8-logo'
import { Button } from '@/components/ui/button'
import { PricingInfo, calculatePricing } from '@/lib/lemon-squeezy/pricing'

function AddUsersPageContent() {
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
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading pricing information...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white relative size-full min-h-screen">
      {/* Logo in top-left corner */}
      <div className="absolute left-8 top-8">
        <Time8Logo />
      </div>

      {/* Main content container with max-width 824px */}
      <div className="absolute left-1/2 top-1/2 translate-x-[-50%] translate-y-[-50%] w-full max-w-[824px] px-8">
        <div className="content-stretch flex flex-col gap-10 items-start justify-start relative shrink-0 w-full">
        {/* Header with icon and text */}
        <div className="content-stretch flex gap-3 items-center justify-start relative shrink-0 w-full">
          <div className="overflow-clip relative shrink-0 size-6">
            <div className="absolute inset-[12.5%_8.33%]">
              <div className="absolute inset-[-5.56%_-5%]">
                <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 22 20">
                  <path d="M15 19V17C15 15.9391 14.5786 14.9217 13.8284 14.1716C13.0783 13.4214 12.0609 13 11 13H5C3.93913 13 2.92172 13.4214 2.17157 14.1716C1.42143 14.9217 1 15.9391 1 17V19M18 6V12M21 9H15M12 5C12 7.20914 10.2091 9 8 9C5.79086 9 4 7.20914 4 5C4 2.79086 5.79086 1 8 1C10.2091 1 12 2.79086 12 5Z" stroke="#737373" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                </svg>
              </div>
            </div>
          </div>
          <div className="basis-0 font-['Geist'] font-normal grow leading-none min-h-px min-w-px relative shrink-0 text-[18px] text-muted-foreground">
            <p className="leading-none">{isUpgradeFlow ? 'Upgrade your subscription' : 'Add users to your workspace'}</p>
          </div>
        </div>

        <div className="content-stretch flex flex-col gap-8 items-start justify-start relative shrink-0 w-full">
          <div className="content-stretch flex flex-col gap-8 items-start justify-start relative shrink-0 w-full">
            {/* Main question */}
            <div className="font-['Geist'] font-bold leading-none min-w-full relative shrink-0 text-[30px] text-foreground" style={{ width: "min-content" }}>
              <p className="leading-[36px]">{isUpgradeFlow ? 'How many seats do you need?' : 'How many users do you want to add?'}</p>
            </div>

            {/* Counter section */}
            <div className="content-stretch flex gap-2 items-center justify-start relative shrink-0 w-80">
              {/* Minus button */}
              <Button
                onClick={() => handleUserCountChange(-1)}
                disabled={userCount <= 1}
                variant="outline"
                className="size-16 p-0"
              >
                <svg className="size-6" fill="none" viewBox="0 0 24 24">
                  <path d="M5 12h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Button>

              {/* Number display */}
              <div className="basis-0 bg-white grow h-16 min-h-px min-w-px relative rounded-lg shrink-0">
                <div className="box-border content-stretch flex gap-1 h-16 items-center justify-center overflow-clip px-3 py-1 relative w-full">
                  <div className="basis-0 font-['Geist'] font-semibold grow leading-none min-h-px min-w-px overflow-ellipsis overflow-hidden relative shrink-0 text-[36px] text-center text-foreground text-nowrap">
                    <p className="leading-none overflow-inherit">{userCount}</p>
                  </div>
                </div>
                <div className="absolute border border border-solid inset-0 pointer-events-none rounded-lg shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]" />
              </div>

              {/* Plus button */}
              <Button
                onClick={() => handleUserCountChange(1)}
                disabled={userCount >= 50}
                variant="outline"
                className="size-16 p-0"
              >
                <svg className="size-6" fill="none" viewBox="0 0 24 24">
                  <path d="M12 5v14m-7-7h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Button>
            </div>
          </div>

          {/* Pricing cards */}
          <div className="content-stretch flex gap-5 items-center justify-start relative shrink-0 w-full">
            {isFreeSelected ? (
              <>
                {/* Free card - selected when user count <= 3 */}
                <div 
                  className="basis-0 bg-violet-100 box-border content-stretch flex flex-col gap-8 grow items-start justify-start min-h-px min-w-px p-[32px] relative rounded-xl shrink-0 cursor-pointer"
                  onClick={() => setSelectedTier('monthly')}
                >
                  <div className="absolute border-2 border-foreground border-solid inset-0 pointer-events-none rounded-xl" />
                  <div className="content-stretch flex flex-col gap-6 items-start justify-start relative shrink-0 w-full">
                    <div className="content-stretch flex flex-col gap-3 items-start justify-start relative shrink-0 w-full">
                      <div className="content-stretch flex gap-2.5 items-center justify-center relative shrink-0 w-full">
                        <button className="box-border content-stretch cursor-pointer flex gap-3 items-center justify-start overflow-visible p-0 relative shrink-0">
                          <div className="bg-white relative rounded-full shrink-0 size-4">
                            <div className="overflow-clip relative size-4">
                              <div className="absolute left-1/2 overflow-clip size-2 top-1/2 translate-x-[-50%] translate-y-[-50%]">
                                <div className="absolute inset-[8.333%]">
                                  <div className="absolute inset-[-9.975%]">
                                    <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 9 9">
                                      <path d="M4.33333 7.66667C6.17428 7.66667 7.66667 6.17428 7.66667 4.33333C7.66667 2.49238 6.17428 1 4.33333 1C2.49238 1 1 2.49238 1 4.33333C1 6.17428 2.49238 7.66667 4.33333 7.66667Z" fill="#171717" stroke="#171717" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33" />
                                    </svg>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="absolute border border border-solid inset-0 pointer-events-none rounded-full" />
                          </div>
                        </button>
                        <div className="basis-0 font-['Geist'] font-semibold grow leading-none min-h-px min-w-px relative shrink-0 text-[18px] text-foreground">
                          <p className="leading-[28px]">Free</p>
                        </div>
                      </div>
                    </div>
                    <div className="content-stretch flex gap-1.5 items-end justify-start leading-none relative shrink-0 text-nowrap w-full">
                      <div className="font-['Geist'] font-semibold relative shrink-0 text-[30px] text-foreground">
                        <p className="leading-[36px] text-nowrap whitespace-pre">Free</p>
                      </div>
                      <div className="font-['Geist'] font-normal relative shrink-0 text-[14px] text-muted-foreground">
                        <p className="leading-[20px] text-nowrap whitespace-pre">up to 3 users</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Annual payment card - disabled when free */}
                <div className="basis-0 bg-muted box-border content-stretch flex flex-col gap-8 grow items-start justify-start min-h-px min-w-px p-[32px] relative rounded-xl shrink-0 cursor-pointer">
                  <div className="absolute border border border-solid inset-0 pointer-events-none rounded-xl" />
                  <div className="content-stretch flex flex-col gap-6 items-start justify-start opacity-50 relative shrink-0 w-full">
                    <div className="content-stretch flex flex-col gap-3 items-start justify-start relative shrink-0 w-full">
                      <div className="content-stretch flex gap-2.5 items-center justify-center relative shrink-0 w-full">
                        <button className="box-border content-stretch cursor-pointer flex gap-3 items-center justify-start overflow-visible p-0 relative shrink-0">
                          <div className="bg-white relative rounded-full shrink-0 size-4">
                            <div className="absolute border border border-solid inset-0 pointer-events-none rounded-full" />
                          </div>
                        </button>
                        <div className="basis-0 font-['Geist'] font-semibold grow leading-none min-h-px min-w-px relative shrink-0 text-[18px] text-foreground">
                          <p className="leading-[28px]">Annual payment</p>
                        </div>
                      </div>
                    </div>
                    <div className="content-stretch flex gap-1.5 items-end justify-start leading-none relative shrink-0 text-nowrap w-full">
                      <div className="font-['Geist'] font-semibold relative shrink-0 text-[30px] text-foreground">
                        <p className="leading-[36px] text-nowrap whitespace-pre">{pricing.annualPerSeat.toFixed(2)} {pricing.currency}</p>
                      </div>
                      <div className="font-['Geist'] font-normal relative shrink-0 text-[14px] text-muted-foreground">
                        <p className="leading-[20px] text-nowrap whitespace-pre">/ month / user</p>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Annual payment card - selected by default when > 3 users */}
                <div 
                  className={`basis-0 ${selectedTier === 'annual' ? 'bg-violet-100' : 'bg-muted'} box-border content-stretch flex flex-col gap-8 grow items-start justify-start min-h-px min-w-px p-[32px] relative rounded-xl shrink-0 cursor-pointer`}
                  onClick={() => setSelectedTier('annual')}
                >
                  <div className={`absolute ${selectedTier === 'annual' ? 'border-2 border-foreground' : 'border border'} border-solid inset-0 pointer-events-none rounded-xl`} />
                  <div className={`content-stretch flex flex-col gap-6 items-start justify-start ${selectedTier !== 'annual' ? 'opacity-50' : ''} relative shrink-0 w-full`}>
                    <div className="content-stretch flex flex-col gap-3 items-start justify-start relative shrink-0 w-full">
                      <div className="content-stretch flex gap-2.5 items-center justify-center relative shrink-0 w-full">
                        <button className="box-border content-stretch cursor-pointer flex gap-3 items-center justify-start overflow-visible p-0 relative shrink-0">
                          <div className="bg-white relative rounded-full shrink-0 size-4">
                            {selectedTier === 'annual' && (
                              <div className="overflow-clip relative size-4">
                                <div className="absolute left-1/2 overflow-clip size-2 top-1/2 translate-x-[-50%] translate-y-[-50%]">
                                  <div className="absolute inset-[8.333%]">
                                    <div className="absolute inset-[-9.975%]">
                                      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 9 9">
                                        <path d="M4.33333 7.66667C6.17428 7.66667 7.66667 6.17428 7.66667 4.33333C7.66667 2.49238 6.17428 1 4.33333 1C2.49238 1 1 2.49238 1 4.33333C1 6.17428 2.49238 7.66667 4.33333 7.66667Z" fill="#171717" stroke="#171717" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33" />
                                      </svg>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                            <div className="absolute border border border-solid inset-0 pointer-events-none rounded-full" />
                          </div>
                        </button>
                        <div className="basis-0 font-['Geist'] font-semibold grow leading-none min-h-px min-w-px relative shrink-0 text-[18px] text-foreground">
                          <p className="leading-[28px]">Annual payment</p>
                        </div>
                      </div>
                    </div>
                    <div className="content-stretch flex gap-1.5 items-end justify-start leading-none relative shrink-0 text-nowrap w-full">
                      <div className="font-['Geist'] font-semibold relative shrink-0 text-[30px] text-foreground">
                        <p className="leading-[36px] text-nowrap whitespace-pre">{pricing.annualPerSeat.toFixed(2)} {pricing.currency}</p>
                      </div>
                      <div className="font-['Geist'] font-normal relative shrink-0 text-[14px] text-muted-foreground">
                        <p className="leading-[20px] text-nowrap whitespace-pre">/ month / user</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Monthly payment card with "Most popular" badge */}
                <div 
                  className={`basis-0 ${selectedTier === 'monthly' ? 'bg-violet-100' : 'bg-white'} box-border content-stretch flex flex-col gap-8 grow items-start justify-start min-h-px min-w-px p-[32px] relative rounded-xl shrink-0 cursor-pointer`}
                  onClick={() => setSelectedTier('monthly')}
                >
                  <div className={`absolute ${selectedTier === 'monthly' ? 'border-2 border-foreground' : 'border border'} border-solid inset-0 pointer-events-none rounded-xl`} />
                  <div className={`content-stretch flex flex-col gap-6 items-start justify-start ${selectedTier !== 'monthly' ? 'opacity-50' : ''} relative shrink-0 w-full`}>
                    <div className="content-stretch flex flex-col gap-3 items-start justify-start relative shrink-0 w-full">
                      <div className="content-stretch flex gap-2.5 items-center justify-center relative shrink-0 w-full">
                        <button className="box-border content-stretch cursor-pointer flex gap-3 items-center justify-start overflow-visible p-0 relative shrink-0">
                          <div className="bg-white relative rounded-full shrink-0 size-4">
                            {selectedTier === 'monthly' && (
                              <div className="overflow-clip relative size-4">
                                <div className="absolute left-1/2 overflow-clip size-2 top-1/2 translate-x-[-50%] translate-y-[-50%]">
                                  <div className="absolute inset-[8.333%]">
                                    <div className="absolute inset-[-9.975%]">
                                      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 9 9">
                                        <path d="M4.33333 7.66667C6.17428 7.66667 7.66667 6.17428 7.66667 4.33333C7.66667 2.49238 6.17428 1 4.33333 1C2.49238 1 1 2.49238 1 4.33333C1 6.17428 2.49238 7.66667 4.33333 7.66667Z" fill="#171717" stroke="#171717" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33" />
                                      </svg>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                            <div className="absolute border border border-solid inset-0 pointer-events-none rounded-full" />
                          </div>
                        </button>
                        <div className="basis-0 font-['Geist'] font-semibold grow leading-none min-h-px min-w-px relative shrink-0 text-[18px] text-foreground">
                          <p className="leading-[28px]">Monthly payment</p>
                        </div>
                      </div>
                      {/* Most popular badge */}
                      <div className="absolute bg-neutral-900 right-0 rounded-lg top-1">
                        <div className="box-border content-stretch flex gap-1 items-center justify-center overflow-clip px-2.5 py-0.5 relative">
                          <div className="font-['Geist'] font-semibold leading-none relative shrink-0 text-[12px] text-primary-foreground text-nowrap">
                            <p className="leading-[16px] whitespace-pre">Most popular</p>
                          </div>
                        </div>
                        <div className="absolute border border-transparent border-solid inset-0 pointer-events-none rounded-lg shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]" />
                      </div>
                    </div>
                    <div className="content-stretch flex gap-1.5 items-end justify-start leading-none relative shrink-0 text-nowrap w-full">
                      <div className="font-['Geist'] font-semibold relative shrink-0 text-[30px] text-foreground">
                        <p className="leading-[36px] text-nowrap whitespace-pre">{pricing.monthlyPerSeat.toFixed(2)} {pricing.currency}</p>
                      </div>
                      <div className="font-['Geist'] font-normal relative shrink-0 text-[14px] text-muted-foreground">
                        <p className="leading-[20px] text-nowrap whitespace-pre">/ month / user</p>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
          
          {/* Currency info note */}
          {!isFreeSelected && (
            <div className="content-stretch flex items-center justify-center relative shrink-0 w-full">
              <div className="font-['Geist'] font-normal text-[14px] text-muted-foreground text-center">
                <p className="leading-[20px]">
                  Prices shown in PLN. EUR pricing available at checkout for EU customers.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Separator */}
        <div className="content-stretch flex flex-col gap-2.5 items-start justify-start relative shrink-0 w-full">
          <div className="h-0 relative shrink-0 w-full">
            <div className="absolute bottom-0 left-0 right-0 top-[-1px]">
              <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 824 1">
                <line stroke="#E5E5E5" x2="824" y1="0.5" y2="0.5" />
              </svg>
            </div>
          </div>
        </div>

        {/* Bottom section with total and continue button */}
        <div className="content-stretch flex gap-5 items-center justify-start relative shrink-0 w-full">
          <div className="basis-0 content-stretch flex gap-1.5 grow items-center justify-start leading-none min-h-px min-w-px relative shrink-0 text-[18px] text-black text-nowrap">
            <div className="font-['Geist'] font-normal relative shrink-0">
              <p className="leading-none text-nowrap whitespace-pre">Today's total:</p>
            </div>
            <div className="font-['Geist'] font-semibold relative shrink-0">
              <p className="leading-none text-nowrap whitespace-pre">
                {total.monthly > 0 
                  ? selectedTier === 'annual' 
                    ? `${total.annual.toFixed(2)} ${total.currency} (billed annually)`
                    : `${total.monthly.toFixed(2)} ${total.currency} / month`
                  : 'Free'
                }
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            {/* Cancel button - only show in upgrade flow */}
            {isUpgradeFlow && (
              <Button
                variant="outline"
                onClick={() => router.push('/admin/settings?tab=billing')}
                disabled={isLoading}
                className="h-10"
              >
                Cancel
              </Button>
            )}
            <Button
              onClick={handleContinue}
              disabled={isLoading}
              className="h-10"
            >
              {isLoading ? 'Processing...' : 'Continue'}
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
    <Suspense fallback={<div>Loading...</div>}>
      <AddUsersPageContent />
    </Suspense>
  )
}