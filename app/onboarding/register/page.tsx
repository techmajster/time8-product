'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { ChevronLeft, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { DecorativeBackground } from '@/components/auth/DecorativeBackground'
import { LanguageDropdown } from '@/components/auth/LanguageDropdown'

function RegisterPageContent() {
  const t = useTranslations('auth')
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [termsAccepted, setTermsAccepted] = useState(true)
  
  // Get params from URL
  const token = searchParams.get('token')
  const email = searchParams.get('email')
  const nameFromUrl = searchParams.get('name') 
  const orgName = searchParams.get('org')
  
  // Initialize fullName from URL param
  useEffect(() => {
    if (nameFromUrl) {
      setFullName(nameFromUrl)
    }
  }, [nameFromUrl])

  useEffect(() => {
    if (!token || !email) {
      setError(t('missingInvitationInfo') || 'Missing required invitation information')
    }
  }, [token, email, t])

  const handleBack = () => {
    router.back()
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    
    console.log('🔍 Registration debug:', { token, email, fullName, password: password.length, termsAccepted })
    
    if (!token || !email) {
      setError(t('missingInvitationInfo') || 'Missing required invitation information')
      return
    }
    
    if (!fullName || fullName.trim().length === 0) {
      setError(t('fullNameRequired') || 'Full name is required')
      return
    }
    
    if (password.length < 8) {
      setError(t('passwordTooShort'))
      return
    }
    
    if (!termsAccepted) {
      setError(t('termsRequired') || 'You must agree to the Terms & Conditions to proceed.')
      return
    }
    
    try {
      setLoading(true)
      setError(null)
      
      // First, look up the invitation to get the required IDs
      const invitationResponse = await fetch(`/api/invitations/lookup?token=${encodeURIComponent(token)}`)
      if (!invitationResponse.ok) {
        throw new Error('Invalid or expired invitation')
      }
      const invitation = await invitationResponse.json()
      
      console.log('🔍 Invitation details for API:', invitation)
      
      const response = await fetch('/api/auth/signup-with-invitation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          password: password,
          full_name: fullName,
          invitation_id: invitation.id,
          organization_id: invitation.organization_id,
          role: invitation.role
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create account')
      }

      console.log('✅ Account created and invitation accepted:', result)
      
      // Sign in the user immediately after account creation
      const supabase = createClient()
      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
      })
      
      if (signInError) {
        console.error('❌ Auto sign-in failed:', signInError)
        setError(t('signInFailed') || 'Account created but sign-in failed. Please try logging in manually.')
        return
      }
      
      console.log('✅ User automatically signed in:', authData.user?.email)
      
      // Navigate to success screen (24761-15630) - user is now authenticated
      const successUrl = `/onboarding/success?org=${encodeURIComponent(orgName || 'BB8 Team')}`
      router.push(successUrl)
      
    } catch (error: any) {
      console.error('❌ Account creation error:', error)
      setError(error.message || t('accountCreationFailed') || 'Failed to create account. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!token || !email) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <Alert variant="destructive">
            <AlertDescription>{t('missingInvitationInfo') || 'Missing required invitation information. Please use the invitation link from your email.'}</AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  // Registration form matching Figma design (24761-15558)
  return (
    <div className="bg-white flex flex-col gap-[10px] items-start relative size-full min-h-screen">
      {/* Decorative background */}
      <DecorativeBackground />

      {/* Language Switcher */}
      <LanguageDropdown />

      {/* Logo - Time8 */}
      <div className="absolute left-[32px] top-[32px] z-10">
        <div className="h-[30px] relative w-[108.333px]">
          <Image
            alt="time8 logo"
            className="block h-[30px] w-auto"
            src="/auth-assets/30f1f246576f6427b3a9b511194297cbba4d7ec6.svg"
            width={108}
            height={30}
            priority
          />
        </div>
      </div>

      {/* Centered content */}
      <div className="flex-1 flex items-center justify-center min-h-screen w-full p-4 z-10">
        <div className="flex flex-col gap-10 items-center justify-start p-0 relative w-[400px]">
          
          {/* Back Button */}
          <div className="flex items-start w-full">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleBack}
              className="gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              {t('back') || 'Back'}
            </Button>
          </div>

          {/* Form Section */}
          <div className="flex flex-col gap-8 w-full">
            {/* Header */}
            <div className="flex flex-col gap-2">
              <h1 className="text-3xl font-bold leading-9">
                {t('registerYourAccount') || 'Register your account'}
              </h1>
              <p className="text-sm text-muted-foreground">
                {t('signupDescription')}
              </p>
            </div>

            {/* Form Fields */}
            <div className="flex flex-col gap-5 w-full">
              
              {/* Full Name Field */}
              <div className="flex flex-col gap-2 w-full">
                <Label htmlFor="fullName">{t('fullName')}</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder={t('fullNamePlaceholder')}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={loading}
                  required
                  className="h-9"
                />
              </div>

              {/* Email Field (Disabled) */}
              <div className="flex flex-col gap-2 w-full">
                <Label htmlFor="email">{t('email')}</Label>
                <Input
                  id="email"
                  type="email"
                  value={email || ''}
                  disabled
                  className="h-9 bg-slate-100 opacity-50"
                />
              </div>

              {/* Password Field */}
              <div className="flex flex-col gap-2 w-full">
                <Label htmlFor="password">{t('password')}</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder={t('passwordPlaceholder')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                  minLength={8}
                  className="h-9"
                />
                <p className="text-sm text-muted-foreground">
                  {t('minimumCharacters')}
                </p>
              </div>

              {/* Terms Checkbox */}
              <div className="flex items-start gap-2 w-full">
                <Checkbox
                  id="terms"
                  checked={termsAccepted}
                  onCheckedChange={(checked) => setTermsAccepted(!!checked)}
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
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="w-full">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Submit Button */}
          <div className="flex flex-col gap-6 items-center justify-center w-full">
            <Button
              type="button"
              size="lg"
              onClick={handleRegister}
              disabled={!password || !fullName || loading || !termsAccepted}
              className="w-full"
            >
              {loading ? t('creatingAccount') : t('registerButton')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>}>
      <RegisterPageContent />
    </Suspense>
  )
}