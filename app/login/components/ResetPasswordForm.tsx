'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle } from "lucide-react"
import { createClient } from '@/lib/supabase/client'

interface ResetPasswordFormProps {
  onModeChange: (mode: 'login' | 'signup' | 'forgot-password' | 'reset-password') => void
  className?: string
}

export function ResetPasswordForm({ onModeChange, className }: ResetPasswordFormProps) {
  const t = useTranslations('auth')
  const tCommon = useTranslations('common')
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Check if we have a valid recovery session
  useEffect(() => {
    const checkSession = async () => {
      const supabase = createClient()
      const { data: { session }, error } = await supabase.auth.getSession()
      
      // If no session or error, redirect to login
      if (!session || error) {
        onModeChange('login')
      }
    }
    
    checkSession()
  }, [onModeChange])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validate passwords match
    if (password !== confirmPassword) {
      setError(t('passwordsDoNotMatch'))
      return
    }

    // Validate password length
    if (password.length < 6) {
      setError(t('passwordTooShort'))
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()
      
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      })

      if (updateError) {
        throw updateError
      }

      setSuccess(true)
      
      // Redirect to dashboard after 3 seconds
      setTimeout(() => {
        router.push('/dashboard')
      }, 3000)
    } catch (error: any) {
      console.error('Password update error:', error)
      setError(error?.message || 'An error occurred while updating password')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className={cn("flex flex-col gap-6 text-center", className)}>
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
          <CheckCircle className="h-6 w-6 text-green-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">{t('passwordUpdated')}</h3>
          <p className="text-sm text-muted-foreground mt-2">
            {t('passwordUpdatedDescription')}
          </p>
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

      <div className="grid gap-6">
        <div className="grid gap-3">
          <Label htmlFor="password">{t('newPassword')}</Label>
          <Input 
            id="password" 
            type="password" 
            required 
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />
        </div>
        <div className="grid gap-3">
          <Label htmlFor="confirmPassword">{t('confirmNewPassword')}</Label>
          <Input 
            id="confirmPassword" 
            type="password" 
            required 
            minLength={6}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading}
          />
          <p className="text-xs text-muted-foreground">
            {t('minimumCharacters')}
          </p>
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? t('updatingPassword') : t('updatePassword')}
        </Button>
      </div>
    </form>
  )
} 