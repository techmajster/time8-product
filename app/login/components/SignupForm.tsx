'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { GoogleAuthButton } from "@/components/google-auth-button"
import { createClient } from '@/lib/supabase/client'
import { CheckCircle, Mail, PartyPopper } from 'lucide-react'

interface SignupFormProps {
  onModeChange: (mode: 'login' | 'signup' | 'forgot-password' | 'reset-password') => void
  onAccountCreated?: (created: boolean) => void
  className?: string
}

export function SignupForm({ onModeChange, onAccountCreated, className }: SignupFormProps) {
  const t = useTranslations('auth')
  const tCommon = useTranslations('common')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [accountCreated, setAccountCreated] = useState(false)

  // Notify parent when account creation state changes
  useEffect(() => {
    if (onAccountCreated) {
      onAccountCreated(accountCreated)
    }
  }, [accountCreated, onAccountCreated])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      // Call our custom signup API instead of Supabase directly
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          full_name: fullName,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'An error occurred during signup')
      }

      console.log('✅ Signup successful:', result)
      
      // If user has a pending invitation, redirect to join page with pre-filled details
      if (result.hasInvitation && result.redirectTo) {
        console.log('🎫 Redirecting to invitation page with pre-filled details:', result.redirectTo)
        window.location.href = result.redirectTo
        return
      }
      
      // Show success screen for normal signup
      setAccountCreated(true)
      
    } catch (error: any) {
      console.error('Signup error:', error)
      setError(error?.message || 'An error occurred during signup')
    } finally {
      setLoading(false)
    }
  }

  const handleTryAgain = () => {
    setAccountCreated(false)
    setEmail('')
    setPassword('')
    setFullName('')
  }

  // Show success screen after account creation
  if (accountCreated) {
    return (
      <div className={cn("flex flex-col gap-6", className)}>
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <PartyPopper className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">{t('accountCreated') || 'Account Created!'}</h2>
          <p className="text-muted-foreground">
            {t('accountCreatedDescription') || 'Your account has been created successfully.'}
          </p>
        </div>

        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="text-foreground font-medium">
                  {t('accountCreatedAndVerificationSent') || 'Account created successfully'}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="text-foreground font-medium">
                  {t('verificationEmailSent') || 'Verification email sent'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Alert className="bg-muted border">
          <Mail className="h-4 w-4" />
          <AlertDescription className="text-foreground">
            <strong>{t('important') || 'Important'}:</strong> {t('checkEmailForVerification', { email }) || `Please check your email (${email}) for the verification link to activate your account.`}
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            {t('didntReceiveEmail') || "Didn't receive the email? Check your spam folder or"}{' '}
            <button
              onClick={handleTryAgain}
              className="underline text-primary"
            >
              {t('tryAgain') || 'try again'}
            </button>
          </p>

          <Button 
            variant="outline"
            onClick={() => onModeChange('login')} 
            className="w-full"
          >
            {t('backToLogin') || 'Back to Login'}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <form className={cn("flex flex-col gap-4 w-full", className)} onSubmit={handleSubmit}>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="fullName">{t('fullName')}</Label>
          <Input 
            id="fullName" 
            type="text" 
            placeholder={t('fullNamePlaceholder')}
            required 
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={loading}
            className="h-9"
          />
        </div>
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
          <Label htmlFor="password">{t('password')}</Label>
          <Input 
            id="password" 
            type="password" 
            placeholder={t('passwordPlaceholder')}
            required 
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            className="h-9"
          />
          <p className="text-sm text-muted-foreground">
            {t('minimumCharacters')}
          </p>
        </div>
        <div className="flex items-start gap-2">
          <Checkbox 
            id="terms" 
            checked={acceptedTerms}
            onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
            disabled={loading}
          />
          <Label 
            htmlFor="terms" 
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
          >
            {t('termsAndConditions')}
          </Label>
        </div>
      </div>
      
      <div className="flex flex-col gap-6 items-center justify-center">
        <Button type="submit" className="w-full" disabled={loading || !!success || !acceptedTerms}>
          {loading ? t('creatingAccount') : t('registerButton')}
        </Button>
        <div className="relative w-full py-1">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-background px-2 text-xs text-muted-foreground">
              {t('orContinueWith')}
            </span>
          </div>
        </div>
        <GoogleAuthButton mode="signup" />
      </div>
      
      <div className="text-center text-sm">
        {t('haveAccount')}{" "}
        <button
          type="button"
          onClick={() => onModeChange('login')}
          className="text-primary underline underline-offset-4 hover:text-primary/80 hover:no-underline transition-colors cursor-pointer"
        >
          {t('login')}
        </button>
      </div>
    </form>
  )
} 