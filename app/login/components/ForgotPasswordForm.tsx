'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft } from "lucide-react"
import { createClient } from '@/lib/supabase/client'

interface ForgotPasswordFormProps {
  onModeChange: (mode: 'login' | 'signup' | 'forgot-password' | 'reset-password') => void
  className?: string
}

export function ForgotPasswordForm({ onModeChange, className }: ForgotPasswordFormProps) {
  const t = useTranslations('auth')
  const tCommon = useTranslations('common')
  const [email, setEmail] = useState('')
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
      
      // Use environment variables in order of preference, fallback to current origin
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                     process.env.NEXT_PUBLIC_SITE_URL || 
                     (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000')
      
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${baseUrl}/login?mode=reset-password`,
      })

      if (resetError) {
        throw resetError
      }

      setSuccess(t('checkEmail'))
    } catch (error: any) {
      console.error('Reset error:', error)
      setError(error?.message || 'An error occurred while sending reset email')
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
          <p className="text-xs text-muted-foreground">
            {t('resetLinkDescription')}
          </p>
        </div>
        <Button type="submit" className="w-full" disabled={loading || !!success}>
          {loading ? t('sendingInstructions') : t('sendResetInstructions')}
        </Button>
      </div>
      
      <div className="text-center">
        <button
          type="button"
          onClick={() => onModeChange('login')}
          className="text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-1 mx-auto"
        >
          <ArrowLeft className="h-3 w-3" />
          {t('backToLogin')}
        </button>
      </div>
    </form>
  )
} 