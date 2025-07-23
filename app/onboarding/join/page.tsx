'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { GoogleAuthButton } from '@/components/google-auth-button'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { createClient } from '@/lib/supabase/client'

interface Invitation {
  id: string
  email: string
  full_name: string | null
  birth_date: string | null
  role: string
  team_id: string | null
  organization_id: string
  status: string
  expires_at: string
  organization_name: string
  team_name: string | null
}

function JoinPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useTranslations('auth')
  const tCommon = useTranslations('common')
  
  const [invitation, setInvitation] = useState<Invitation | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [isCreatingAccount, setIsCreatingAccount] = useState(false)

  const token = searchParams.get('token')
  const code = searchParams.get('code')

  // Handle logout
  const handleLogout = async () => {
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push('/login')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  useEffect(() => {
    if (token) {
      loadInvitationByToken()
    } else if (code) {
      loadInvitationByCode()
    } else {
      setError(t('invitation.noTokenProvided'))
    }
  }, [token, code, t])

  const loadInvitationByToken = async () => {
    if (!token) return

    try {
      setLoading(true)
      const response = await fetch(`/api/invitations/lookup?token=${encodeURIComponent(token)}`)
      const result = await response.json()

      if (response.ok && result) {
        setInvitation(result)
      } else {
        setError(result.error || t('invitation.invalidInvitationDescription'))
      }
    } catch (err) {
      console.error('Error checking token invitation:', err)
      setError(t('invitation.invitationError'))
    } finally {
      setLoading(false)
    }
  }

  const loadInvitationByCode = async () => {
    // TODO: Implement code-based lookup if needed
    setError(t('invitation.codeNotImplemented'))
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!invitation || !password) return

    setIsCreatingAccount(true)
    setError(null)

    try {
      const supabase = createClient()
      
      // Create the user account
      const { data, error: authError } = await supabase.auth.signUp({
        email: invitation.email,
        password,
        options: {
          data: {
            full_name: invitation.full_name || invitation.email.split('@')[0],
          },
        },
      })

      if (authError) {
        throw authError
      }

      if (data.user) {
        // Update the user's profile with invitation data immediately
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            organization_id: invitation.organization_id,
            role: invitation.role,
            team_id: invitation.team_id,
            full_name: invitation.full_name || data.user.email?.split('@')[0] || 'Unknown',
            birth_date: invitation.birth_date,
          })
          .eq('id', data.user.id)

        if (profileError) {
          console.error('Profile update error:', profileError)
          // Don't throw here, user is created, just log the error
        }

        // Mark invitation as accepted
        const { error: acceptError } = await supabase
          .from('invitations')
          .update({
            status: 'accepted',
            accepted_at: new Date().toISOString()
          })
          .eq('id', invitation.id)

        if (acceptError) {
          console.error('Invitation acceptance error:', acceptError)
          // Don't throw here either, user is created
        }

        // Redirect to dashboard or completion page
        router.push('/dashboard')
      }
    } catch (error: any) {
      console.error('Signup error:', error)
      setError(error?.message || 'An error occurred during account creation')
    } finally {
      setIsCreatingAccount(false)
    }
  }

  const handleGoogleSignup = async () => {
    if (!invitation) return

    setIsCreatingAccount(true)
    setError(null)

    try {
      const supabase = createClient()
      
      // Pass invitation ID through the redirect URL so the callback can handle it
      const callbackUrl = `${window.location.origin}/login/callback?invitation_id=${invitation.id}`
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: callbackUrl,
        },
      })

      if (error) {
        throw error
      }
    } catch (error: any) {
      console.error('Google signup error:', error)
      setError(error?.message || 'An error occurred with Google signup')
      setIsCreatingAccount(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-background w-screen h-screen fixed inset-0 z-50">
        {/* Top Controls */}
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleLogout}
            className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
          >
            {tCommon('logout')}
          </Button>
          <LanguageSwitcher />
        </div>
        
        {/* Centered Content */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>{t('invitation.validatingInvitation')}</p>
          </div>
        </div>
      </div>
    )
  }

  if (!invitation) {
    return (
      <div className="bg-background w-screen h-screen fixed inset-0 z-50">
        {/* Top Controls */}
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleLogout}
            className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
          >
            {tCommon('logout')}
          </Button>
          <LanguageSwitcher />
        </div>
        
        {/* Centered Content */}
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <div className="bg-card rounded-[14px] shadow-md border border-border p-6 w-full max-w-md text-center">
            <h1 className="text-xl font-bold text-destructive mb-2">{t('invitation.invalidInvitation')}</h1>
            <p className="text-muted-foreground text-sm mb-4">
              {error || t('invitation.invalidInvitationDescription')}
            </p>
            <a href="/login" className="text-primary hover:underline">
              {t('invitation.goToLogin')}
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-background w-screen h-screen fixed inset-0 z-50">
      {/* Top Controls */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleLogout}
          className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
        >
          {tCommon('logout')}
        </Button>
        <LanguageSwitcher />
      </div>
      
      {/* Centered Content */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="bg-card max-w-[480px] w-full rounded-[14px] border border-border shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_2px_4px_-2px_rgba(0,0,0,0.1)]">
          <div className="p-6">
            {/* Header */}
            <div className="flex flex-col gap-1.5 pb-0 pt-1.5 mb-6">
              <h1 className="font-bold text-[30px] text-foreground leading-[36px]">
                {t('invitation.title')}
              </h1>
              <div className="font-normal text-muted-foreground">
                <p className="leading-[20px] text-[14px]">
                  {t('invitation.description', { 
                    organizationName: invitation.organization_name || '',
                    teamName: invitation.team_name || ''
                  })}
                </p>
              </div>
            </div>

            {/* Error Alert */}
            {error && (
              <Alert variant="destructive" className="w-full mb-6">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Form */}
            <form onSubmit={handleSignup} className="flex flex-col gap-6">
              <div className="flex flex-col gap-4">
                
                {/* Email Input */}
                <div className="flex flex-col gap-2">
                  <Label htmlFor="email" className="font-medium text-[14px] text-foreground">
                    {t('email')}
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={invitation.email}
                    disabled
                    className="h-9 opacity-50 bg-card border-border shadow-xs text-muted-foreground text-[14px]"
                  />
                </div>

                {/* Password Input */}
                <div className="flex flex-col gap-2">
                  <Label htmlFor="password" className="font-medium text-[14px] text-foreground">
                    {t('invitation.createPassword')}
                  </Label>
                  <div className="w-full">
                    <Input
                      id="password"
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isCreatingAccount}
                      placeholder={t('invitation.passwordPlaceholder')}
                      className="h-9 bg-card border-border shadow-xs text-foreground text-[14px] placeholder:text-muted-foreground"
                    />
                    <p className="font-normal text-[14px] text-muted-foreground mt-2">
                      {t('minimumCharacters')}
                    </p>
                  </div>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={isCreatingAccount || !password}
                  className="bg-primary hover:bg-primary/90 h-9 rounded-lg shadow-xs w-full disabled:opacity-50 text-primary-foreground font-medium text-[14px]"
                >
                  {isCreatingAccount ? t('invitation.creatingAccount') : t('invitation.createAccountButton')}
                </Button>
              </div>

              {/* Separator */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">{t('orContinueWith').split(' ')[0]}</span>
                </div>
              </div>

              {/* Google Button */}
              <GoogleAuthButton mode="signup" />
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function JoinPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900 mx-auto"></div>
          <p className="mt-2 text-sm text-neutral-600">Ładowanie...</p>
        </div>
      </div>
    }>
      <JoinPageContent />
    </Suspense>
  )
}