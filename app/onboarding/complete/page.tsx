'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, Sparkles } from 'lucide-react'
import Link from 'next/link'

export default function OnboardingCompletePage() {
  const router = useRouter()

  useEffect(() => {
    // Auto-redirect after 5 seconds
    const timer = setTimeout(() => {
      router.push('/dashboard')
    }, 5000)

    return () => clearTimeout(timer)
  }, [router])

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 text-white">
          <div className="flex items-center justify-center">
            <div className="rounded-full bg-white/20 p-3">
              <CheckCircle className="h-12 w-12" />
            </div>
          </div>
          <h1 className="mt-4 text-center text-2xl font-bold">You're all set!</h1>
                      <p className="mt-2 text-center text-success-foreground">
            Welcome to your new leave management system
          </p>
        </div>
        
        <CardContent className="pt-6 space-y-6">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-warning" />
              What's next?
            </h2>
            
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>• Set up your leave policies and types</p>
              <p>• Invite your team members</p>
              <p>• Configure holiday calendars</p>
              <p>• Start managing leave requests!</p>
            </div>
          </div>

          <div className="space-y-3">
            <Button asChild className="w-full ">
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
            
            <p className="text-center text-xs text-muted-foreground">
              Redirecting automatically in 5 seconds...
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 