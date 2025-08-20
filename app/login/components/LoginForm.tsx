'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { GoogleAuthButton } from "@/components/google-auth-button"
import { createClient } from '@/lib/supabase/client'

interface LoginFormProps {
  onModeChange: (mode: 'login' | 'signup' | 'forgot-password' | 'reset-password') => void
  className?: string
}

export function LoginForm({ onModeChange, className }: LoginFormProps) {
  const t = useTranslations('auth')
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Check for verification status in URL params and cookies (client-side only)
  useEffect(() => {
    const verified = searchParams.get('verified')
    const emailParam = searchParams.get('email')
    const error = searchParams.get('error')
    
    if (verified === 'true') {
      setSuccess('Email verified successfully! You can now log in.')
      // Auto-fill email if available
      if (emailParam) {
        setEmail(decodeURIComponent(emailParam))
      }
    } else if (error) {
      switch (error) {
        case 'invalid_token':
          setError('Invalid or expired verification link.')
          break
        case 'missing_token':
          setError('Verification link is missing required information.')
          break
        case 'confirmation_failed':
          setError('Failed to confirm email. Please try again.')
          break
        default:
          setError('Verification failed. Please try again.')
      }
    }
  }, [searchParams])

  // Check cookies separately to avoid hydration mismatch
  useEffect(() => {
    // Only run on client side after hydration
    if (typeof window !== 'undefined') {
      const emailVerified = document.cookie.includes('email_verified=true')
      const verifiedEmail = document.cookie.split('; ').find(row => row.startsWith('verified_email='))?.split('=')[1]
      
      if (emailVerified) {
        setSuccess('Email verified successfully! You can now log in.')
        if (verifiedEmail && !email) {
          setEmail(decodeURIComponent(verifiedEmail))
        }
        
        // Clear the verification cookies
        document.cookie = 'email_verified=; Max-Age=0; path=/'
        document.cookie = 'verified_email=; Max-Age=0; path=/'
      }
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        throw authError
      }

      // Redirect to dashboard - middleware will handle proper routing based on user's organization status
      // This will redirect to either /dashboard, /onboarding/welcome, or /onboarding/choose
      router.push('/dashboard')
      router.refresh()
    } catch (error: any) {
      console.error('Login error:', error)
      
      // Handle specific error cases
      if (error?.message?.includes('Email not confirmed')) {
        setError('Please check your email and click the verification link before logging in. Check your spam folder if you don\'t see the email.')
      } else {
        setError(error?.message || 'An error occurred during login')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className={cn("flex flex-col gap-6", className)} onSubmit={handleSubmit}>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {success && (
        <Alert variant="default" className="border-green-200 bg-green-50 text-green-800">
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6">
        <div className="grid gap-3">
          <Label htmlFor="email">{t('email')}</Label>
          <Input 
            id="email" 
            type="email" 
            placeholder={t('emailPlaceholder')}
            required 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />
        </div>
        <div className="grid gap-3">
          <div className="flex items-center">
            <Label htmlFor="password">{t('password')}</Label>
            <button
              type="button"
              onClick={() => onModeChange('forgot-password')}
              className="ml-auto text-sm underline-offset-4 hover:underline"
            >
              {t('forgotPassword')}
            </button>
          </div>
          <Input 
            id="password" 
            type="password" 
            required 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? t('signingIn') : t('login')}
        </Button>
        <div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
          <span className="bg-background text-muted-foreground relative z-10 px-2">
            {t('orContinueWith')}
          </span>
        </div>
        <GoogleAuthButton mode="signin" />
      </div>
      <div className="text-center text-sm">
        {t('noAccount')}{" "}
        <button
          type="button"
          onClick={() => onModeChange('signup')}
          className="underline underline-offset-4"
        >
          {t('signup')}
        </button>
      </div>
    </form>
  )
} 