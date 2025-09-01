'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { Time8Logo } from '@/components/ui/time8-logo'

function PaymentSuccessPageContent() {
  const [isLoading, setIsLoading] = useState(true)
  const [subscriptionData, setSubscriptionData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [organizationData, setOrganizationData] = useState<any>(null)
  const [isCreatingOrganization, setIsCreatingOrganization] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
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
          
          // Create organization after successful payment OR free tier confirmation
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

          if (!response.ok) {
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
  }, [router, searchParams])

  const handleContinue = () => {
    router.push('/dashboard')
  }

  if (isLoading) {
    return (
      <div className="bg-white content-stretch flex flex-col gap-2.5 items-center justify-center relative min-h-screen w-full">
        <div className="box-border content-stretch flex flex-col gap-8 items-center justify-start p-16 relative rounded-3xl shrink-0">
          {/* Loading Icon */}
          <Loader2 className="w-16 h-16 animate-spin text-neutral-600" />

          {/* Text Content */}
          <div className="content-stretch flex flex-col gap-3 items-start justify-start relative shrink-0">
            <div className="content-stretch flex flex-col gap-3 items-center justify-start relative shrink-0 w-full">
              <div className="font-bold text-[30px] text-center text-neutral-950 leading-9" style={{ fontFamily: 'Geist, sans-serif', fontWeight: 700 }}>
                {isCreatingOrganization ? 'Setting up workspace...' : 'Verifying payment...'}
              </div>
            </div>
            <div className="font-normal text-[14px] text-center text-neutral-500 w-full leading-5" style={{ fontFamily: 'Geist, sans-serif', fontWeight: 400 }}>
              Please wait while we process your request
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white content-stretch flex flex-col gap-2.5 items-center justify-center relative min-h-screen w-full">
        <div className="box-border content-stretch flex flex-col gap-8 items-center justify-start p-16 relative rounded-3xl shrink-0">
          {/* Error Icon */}
          <div className="relative shrink-0 size-16">
            <div className="absolute inset-2">
              <div className="absolute inset-0" style={{ stroke: '#dc2626' }}>
                <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 55 55">
                  <path 
                    d="M54.3333 27.6667C54.3333 42.3943 42.3943 54.3333 27.6667 54.3333C12.9391 54.3333 1 42.3943 1 27.6667C1 12.9391 12.9391 1 27.6667 1C42.3943 1 54.3333 12.9391 54.3333 27.6667ZM22.3333 22.3333L33 33M33 22.3333L22.3333 33"
                    stroke="#dc2626" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth="1.33" 
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Text Content */}
          <div className="content-stretch flex flex-col gap-3 items-start justify-start relative shrink-0">
            <div className="content-stretch flex flex-col gap-3 items-center justify-start relative shrink-0 w-full">
              <div className="font-bold text-[30px] text-center text-neutral-950 leading-9" style={{ fontFamily: 'Geist, sans-serif', fontWeight: 700 }}>
                Payment Error
              </div>
            </div>
            <div className="font-normal text-[14px] text-center text-neutral-500 w-full leading-5" style={{ fontFamily: 'Geist, sans-serif', fontWeight: 400 }}>
              {error}
            </div>
          </div>

          {/* Button */}
          <Button
            onClick={() => router.push('/dashboard')}
            className="bg-neutral-900 hover:bg-neutral-800 content-stretch flex gap-2 h-10 items-center justify-center px-8 py-2 relative rounded-lg shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] shrink-0 font-medium text-[14px] text-neutral-50"
            style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500 }}
          >
            Go to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white content-stretch flex flex-col gap-2.5 items-center justify-center relative min-h-screen w-full">
      <div className="box-border content-stretch flex flex-col gap-8 items-center justify-start p-16 relative rounded-3xl shrink-0">
        {/* Success Icon */}
        <div className="relative shrink-0 size-16">
          <div className="absolute inset-2">
            <div className="absolute inset-0" style={{ stroke: '#0a0a0a' }}>
              <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 55 55">
                <path 
                  d="M19.6667 27.6667L25 33L35.6667 22.3333M54.3333 27.6667C54.3333 42.3943 42.3943 54.3333 27.6667 54.3333C12.9391 54.3333 1 42.3943 1 27.6667C1 12.9391 12.9391 1 27.6667 1C42.3943 1 54.3333 12.9391 54.3333 27.6667Z"
                  stroke="#0a0a0a" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth="1.33" 
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Text Content */}
        <div className="content-stretch flex flex-col gap-3 items-start justify-start relative shrink-0">
          <div className="content-stretch flex flex-col gap-3 items-center justify-start relative shrink-0 w-full">
            <div className="font-bold text-[30px] text-center text-neutral-950 leading-9" style={{ fontFamily: 'Geist, sans-serif', fontWeight: 700 }}>
              {subscriptionData?.upgraded ? 'Subscription upgraded!' : 'Payment success!'}
            </div>
          </div>
          <div className="font-normal text-[14px] text-center text-neutral-500 w-full leading-5" style={{ fontFamily: 'Geist, sans-serif', fontWeight: 400 }}>
            {subscriptionData?.upgraded 
              ? 'Your subscription has been upgraded. Redirecting to dashboard...' 
              : 'You can now add users to your workspace.'}
          </div>
        </div>

        {/* Button */}
        <Button
          onClick={handleContinue}
          className="bg-neutral-900 hover:bg-neutral-800 content-stretch flex gap-2 h-10 items-center justify-center px-8 py-2 relative rounded-lg shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] shrink-0 font-medium text-[14px] text-neutral-50"
          style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500 }}
        >
          Start using time8.io!
        </Button>
      </div>
    </div>
  )
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PaymentSuccessPageContent />
    </Suspense>
  )
}