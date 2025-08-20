'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function OnboardingRoutingPage() {
  const router = useRouter()

  useEffect(() => {
    const routeToCorrectScenario = async () => {
      try {
        // Get user authentication status
        const supabase = createClient()
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError || !user) {
          router.push('/login')
          return
        }

        // Get user's organization status to determine correct onboarding scenario
        const response = await fetch('/api/user/organization-status')
        
        if (!response.ok) {
          // If API fails, fallback to welcome screen
          router.push('/onboarding/welcome')
          return
        }

        const data = await response.json()

        // Route to appropriate scenario based on user's status
        switch (data.scenario) {
          case 'has_organizations':
            // User already has organizations, go to dashboard
            router.push('/dashboard')
            break
            
          case 'has_invitations':
            // User has pending invitations, show choice screen
            router.push('/onboarding/choose')
            break
            
          case 'no_invitations':
          default:
            // User has no organizations and no invitations, show welcome screen
            router.push('/onboarding/welcome')
            break
        }
        
      } catch (error) {
        console.error('Error determining onboarding scenario:', error)
        // Fallback to welcome screen on any error
        router.push('/onboarding/welcome')
      }
    }

    routeToCorrectScenario()
  }, [router])

  // Show loading while routing
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="text-sm text-gray-600">Setting up your onboarding experience...</p>
      </div>
    </div>
  )
}