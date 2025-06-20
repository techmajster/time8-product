'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, Sparkles } from 'lucide-react'
import { useTranslations } from 'next-intl'

export default function OnboardingCompletePage() {
  const t = useTranslations('onboarding')
  const router = useRouter()

  useEffect(() => {
    // Auto-redirect after 5 seconds
    const timer = setTimeout(() => {
      router.push('/dashboard')
    }, 5000)

    return () => clearTimeout(timer)
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle className="text-xl font-semibold">
            {t('setupComplete')}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="pt-6 space-y-6">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-warning" />
              {t('whatsNext')}
            </h2>
            
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>• {t('nextStep1')}</p>
              <p>• {t('nextStep2')}</p>
              <p>• {t('nextStep3')}</p>
              <p>• {t('nextStep4')}</p>
            </div>
          </div>

          <div className="space-y-3">
            <Button asChild className="w-full ">
              <Link href="/dashboard">{t('goToDashboard')}</Link>
            </Button>
            
            <p className="text-center text-xs text-muted-foreground">
              {t('autoRedirect')}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 