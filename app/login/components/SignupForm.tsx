'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { GoogleAuthButton } from "@/components/google-auth-button"
import { createClient } from '@/lib/supabase/client'

interface SignupFormProps {
  onModeChange: (mode: 'login' | 'signup' | 'forgot-password' | 'reset-password') => void
  className?: string
}

export function SignupForm({ onModeChange, className }: SignupFormProps) {
  const t = useTranslations('auth')
  const tCommon = useTranslations('common')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const supabase = createClient()
      
      const { error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
          emailRedirectTo: `${window.location.origin}/login?mode=login`,
        },
      })

      if (authError) {
        throw authError
      }

      setSuccess(t('checkEmail'))
    } catch (error: any) {
      console.error('Signup error:', error)
      setError(error?.message || 'An error occurred during signup')
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