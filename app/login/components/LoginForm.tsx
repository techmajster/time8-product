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
  const [invitationToken, setInvitationToken] = useState<string | null>(null)

  // Check for verification status in URL params and cookies (client-side only)
  useEffect(() => {
    const verified = searchParams.get('verified')
    const emailParam = searchParams.get('email')
    const error = searchParams.get('error')
    const invToken = searchParams.get('invitation_token')

    // Handle invitation token
    if (invToken) {
      setInvitationToken(invToken)
      setSuccess('Please log in to accept your workspace invitation.')
      // Auto-fill email if available
      if (emailParam) {
        setEmail(decodeURIComponent(emailParam))
      }
    }

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
      // First, check if user exists and what provider they use
      const providerCheck = await fetch('/api/auth/check-provider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })

      if (providerCheck.ok) {
        const providerData = await providerCheck.json()

        if (providerData.exists && providerData.provider === 'google') {
          setError('This account was created with Google. Please use the "Continue with Google" button to log in.')
          return
        }

        if (providerData.exists && !providerData.emailConfirmed) {
          setError('Please verify your email before logging in. Check your inbox for the verification link.')
          return
        }
      }

      const supabase = createClient()

      console.log('🔐 Attempting login with email:', email)

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        console.error('❌ Supabase auth error:', {
          message: authError.message,
          status: authError.status,
          name: authError.name,
          code: (authError as any).code
        })
        throw authError
      }

      console.log('✅ Login successful:', data.user?.email)

      // If invitation token exists, accept the invitation
      if (invitationToken) {
        try {
          console.log('🎫 Processing invitation token after login:', invitationToken)

          // Accept invitation using the token
          const acceptResponse = await fetch('/api/invitations/accept', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              token: invitationToken,
            }),
          })

          if (acceptResponse.ok) {
            const result = await acceptResponse.json()
            console.log('✅ Invitation accepted successfully:', result)
            // Force a full page navigation to ensure the new workspace context is loaded
            // The API has already set the active-organization-id cookie
            window.location.href = '/dashboard'
            return
          } else {
            const errorData = await acceptResponse.json()
            console.error('❌ Failed to accept invitation:', errorData)
            setError(errorData.error || 'Failed to accept invitation. Please try again.')
            return
          }
        } catch (error) {
          console.error('❌ Error accepting invitation:', error)
          setError('Failed to accept invitation. Please try again.')
          return
        }
      }

      // Redirect to onboarding - this will show user their workspace options and scenario
      // User will see appropriate onboarding scenario based on their workspaces and invitations
      router.push('/onboarding')
      router.refresh()
    } catch (error: any) {
      console.error('Login error:', error)

      // Simple, clear error handling based on what actually went wrong
      if (error?.message?.includes('Email not confirmed')) {
        setError('Please verify your email before logging in. Check your inbox for the verification link.')
      } else if (error?.message?.includes('Invalid login credentials')) {
        setError('Invalid email or password. Please check your credentials and try again.')
      } else {
        setError(error?.message || 'An error occurred during login')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className={cn("flex flex-col gap-4 w-full", className)} onSubmit={handleSubmit}>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {success && (
        <Alert variant="default" className="border-primary/20 bg-primary/5 text-foreground">
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="email">{t('email')}</Label>
          <Input 
            id="email" 
            type="email" 
            placeholder={t('emailPlaceholder')}
            required 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            className="h-9"
          />
        </div>
        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">{t('password')}</Label>
            <button
              type="button"
              onClick={() => onModeChange('forgot-password')}
              className="text-sm text-muted-foreground underline-offset-4 hover:underline cursor-pointer"
            >
              {t('forgotPassword')}
            </button>
          </div>
          <Input 
            id="password" 
            type="password" 
            placeholder={t('passwordPlaceholder')}
            required 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            className="h-9"
          />
        </div>
      </div>
      
      <div className="flex flex-col gap-6 items-center justify-center">
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? t('signingIn') : t('loginButton')}
        </Button>
        <div className="flex gap-[10px] items-center justify-center w-full">
          <div className="flex-1 h-0 border-t border-border" />
          <span className="text-xs text-muted-foreground leading-4">
            {t('orContinueWith')}
          </span>
          <div className="flex-1 h-0 border-t border-border" />
        </div>
        <GoogleAuthButton mode="signin" />
      </div>
      
      <div className="text-center text-sm">
        {t('noAccount')}{" "}
        <button
          type="button"
          onClick={() => onModeChange('signup')}
          className="text-primary underline underline-offset-4 hover:text-primary/80 hover:no-underline transition-colors cursor-pointer"
        >
          {t('signup')}
        </button>
      </div>
    </form>
  )
} 