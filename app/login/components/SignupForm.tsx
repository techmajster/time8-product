'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
      // Show success screen instead of just message
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
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <PartyPopper className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-green-800">{t('accountCreated') || 'Account Created!'}</h2>
          <p className="text-muted-foreground">
            {t('accountCreatedDescription') || 'Your account has been created successfully.'}
          </p>
        </div>

        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-white" />
                </div>
                <span className="text-green-800 font-medium">
                  {t('accountCreatedAndVerificationSent') || 'Account created successfully'}
                </span>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-white" />
                </div>
                <span className="text-green-800 font-medium">
                  {t('verificationEmailSent') || 'Verification email sent'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Alert className="bg-blue-50 border-blue-200">
          <Mail className="h-4 w-4" />
          <AlertDescription className="text-blue-800">
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
    <form className={cn("flex flex-col gap-6", className)} onSubmit={handleSubmit}>
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

      <div className="grid gap-6">
        <div className="grid gap-3">
          <Label htmlFor="fullName">{t('firstName')} {t('lastName')}</Label>
          <Input 
            id="fullName" 
            type="text" 
            placeholder={t('fullNamePlaceholder')}
            required 
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={loading}
          />
        </div>
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
          <Label htmlFor="password">{t('password')}</Label>
          <Input 
            id="password" 
            type="password" 
            required 
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />
          <p className="text-xs text-muted-foreground">
            {t('minimumCharacters')}
          </p>
        </div>
        <Button type="submit" className="w-full" disabled={loading || !!success}>
          {loading ? t('creatingAccount') : t('createAccount')}
        </Button>
        <div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
          <span className="bg-background text-muted-foreground relative z-10 px-2">
            {t('orContinueWith')}
          </span>
        </div>
        <GoogleAuthButton mode="signup" />
      </div>
      <div className="text-center text-sm">
        {t('haveAccount')}{" "}
        <button
          type="button"
          onClick={() => onModeChange('login')}
          className="underline underline-offset-4"
        >
          {t('login')}
        </button>
      </div>
    </form>
  )
} 