'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'

function PaymentFailurePageContent() {
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
    <div className="bg-white content-stretch flex flex-col gap-2.5 items-center justify-center relative min-h-screen w-full">
      <div className="box-border content-stretch flex flex-col gap-8 items-center justify-start p-16 relative rounded-3xl shrink-0">
        {/* Warning Icon */}
        <div className="relative shrink-0 size-16">
          <div className="absolute inset-[12.44%_8.34%_12.5%_8.26%]">
            <div className="absolute inset-[-1.38%_-1.25%]" style={{ stroke: '#dc2626' }}>
              <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 56 50">
                <path 
                  d="M27.7148 17.0371V27.7038M27.7148 38.3704H27.7415M53.6613 41.0371L32.328 3.70372C31.8628 2.88294 31.1883 2.20022 30.3731 1.72524C29.558 1.25026 28.6314 1 27.688 1C26.7446 1 25.818 1.25026 25.0029 1.72524C24.1877 2.20022 23.5132 2.88294 23.048 3.70372L1.71466 41.0371C1.24448 41.8513 0.997931 42.7755 1.00001 43.7158C1.0021 44.656 1.25273 45.5791 1.72651 46.3913C2.2003 47.2035 2.88038 47.876 3.69784 48.3406C4.5153 48.8052 5.44108 49.0455 6.38132 49.0371H49.048C49.9837 49.0361 50.9027 48.789 51.7127 48.3205C52.5227 47.852 53.1952 47.1786 53.6627 46.368C54.1301 45.5574 54.3761 44.6381 54.3759 43.7024C54.3756 42.7666 54.1292 41.8474 53.6613 41.0371Z"
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
              Payment failed!
            </div>
          </div>
          <div className="font-normal text-[14px] text-center text-neutral-500 w-full leading-5" style={{ fontFamily: 'Geist, sans-serif', fontWeight: 400 }}>
            You can now add users to your workspace. 
          </div>
        </div>

        {/* Button */}
        <Button
          onClick={handleRetryPayment}
          disabled={isRetrying}
          className="bg-neutral-900 hover:bg-neutral-800 content-stretch flex gap-2 h-10 items-center justify-center px-8 py-2 relative rounded-lg shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] shrink-0 font-medium text-[14px] text-neutral-50"
          style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500 }}
        >
          {isRetrying && <RefreshCw className="w-4 h-4 animate-spin" />}
          Back to payment
        </Button>
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