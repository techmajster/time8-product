'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Building2, ArrowRight, Sparkles } from 'lucide-react'
import { useTranslations } from 'next-intl'

export default function WelcomePage() {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const router = useRouter()
  const t = useTranslations('onboarding')

  useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient()
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error || !user) {
        router.push('/login')
        return
      }

      // Verify this user should be on welcome screen by checking organization status
      try {
        const response = await fetch('/api/user/organization-status')
        if (response.ok) {
          const data = await response.json()
          
          // If user has organizations, redirect to dashboard
          if (data.scenario === 'has_organizations') {
            router.push('/dashboard')
            return
          }
          
          // If user has invitations, redirect to choice screen
          if (data.scenario === 'has_invitations') {
            router.push('/onboarding/choose')
            return
          }
          
          // User belongs on welcome screen (no_invitations scenario)
        } else {
          console.error('Failed to fetch organization status')
          // Continue showing welcome screen on API error
        }
      } catch (error) {
        console.error('Error checking organization status:', error)
        // Continue showing welcome screen on error
      }
      
      setUser(user)
      setLoading(false)
    }

    checkUser()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Welcome Header */}
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-gray-900">
              {t('welcome.title', { name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'there' })}
            </h1>
            <p className="text-sm text-gray-600 max-w-sm mx-auto">
              {t('welcome.subtitle')}
            </p>
          </div>
        </div>

        {/* Welcome Card */}
        <Card className="border-0 shadow-xl bg-white/95 backdrop-blur">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-xl text-gray-900">
              {t('welcome.card.title')}
            </CardTitle>
            <CardDescription className="text-gray-600">
              {t('welcome.card.description')}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Features List */}
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-primary/60 mt-2 flex-shrink-0"></div>
                <p className="text-sm text-gray-700">
                  {t('welcome.features.manage')}
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-primary/60 mt-2 flex-shrink-0"></div>
                <p className="text-sm text-gray-700">
                  {t('welcome.features.invite')}
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-primary/60 mt-2 flex-shrink-0"></div>
                <p className="text-sm text-gray-700">
                  {t('welcome.features.track')}
                </p>
              </div>
            </div>

            {/* CTA Button */}
            <Button 
              onClick={() => router.push('/onboarding/create-workspace')}
              className="w-full h-12 text-base font-medium bg-primary hover:bg-primary/90 transition-colors"
              size="lg"
            >
              {t('welcome.cta')}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>

            {/* Footer */}
            <p className="text-xs text-center text-gray-500 mt-4">
              {t('welcome.footer')}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}