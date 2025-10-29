'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import { Time8Logo } from '@/components/ui/time8-logo'
import { Eye, EyeOff, ChevronLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

function RegisterPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(true)
  
  // Get params from URL
  const token = searchParams.get('token')
  const email = searchParams.get('email')
  const name = searchParams.get('name') 
  const orgName = searchParams.get('org')

  useEffect(() => {
    if (!token || !email || !name) {
      setError('Missing required invitation information')
    }
  }, [token, email, name])

  const handleBack = () => {
    router.back()
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    
    console.log('🔍 Registration debug:', { token, email, name, password: password.length, termsAccepted })
    
    if (!token || !email || !name) {
      setError('Missing required invitation information')
      return
    }
    
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.')
      return
    }
    
    if (!termsAccepted) {
      setError('You must agree to the Terms & Conditions to proceed.')
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
          full_name: name,
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
        setError('Account created but sign-in failed. Please try logging in manually.')
        return
      }
      
      console.log('✅ User automatically signed in:', authData.user?.email)
      
      // Navigate to success screen (24761-15630) - user is now authenticated
      const successUrl = `/onboarding/success?org=${encodeURIComponent(orgName || 'BB8 Team')}`
      router.push(successUrl)
      
    } catch (error: any) {
      console.error('❌ Account creation error:', error)
      setError(error.message || 'Failed to create account. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!token || !email || !name) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <Alert variant="destructive">
            <AlertDescription>Missing required invitation information. Please use the invitation link from your email.</AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  // Registration form matching Figma design (24761-15558)
  return (
    <div className="bg-white min-h-screen relative w-full">
      {/* Logo - Time8 */}
      <div className="absolute left-8 top-8">
        <Time8Logo />
      </div>

      {/* Centered content */}
      <div className="flex-1 flex items-center justify-center min-h-screen w-full p-4">
        <div className="flex flex-col gap-10 items-center justify-start p-0 relative w-[400px]">
          
          {/* Back Button */}
          <div className="flex gap-0.5 items-center justify-start p-0 relative w-full">
            <button
              onClick={handleBack}
              className="bg-white flex gap-2 items-center justify-center px-4 py-2 relative rounded-lg border border shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-gray-50 transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-foreground" />
              <div className="font-medium text-[14px] text-foreground" style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500, lineHeight: '20px' }}>
                <p className="block leading-[20px] whitespace-pre">Back</p>
              </div>
            </button>
          </div>

          {/* Form Section */}
          <div className="flex flex-col gap-8 items-start justify-start p-0 relative w-full">
            {/* Header */}
            <div className="flex flex-col gap-2 items-center justify-start p-0 relative w-full">
              <div className="font-bold relative text-[30px] text-foreground w-full" style={{ fontFamily: 'Geist, sans-serif', fontWeight: 700, lineHeight: '36px' }}>
                <p className="block leading-[36px]">Register your account</p>
              </div>
              <div className="font-normal relative text-[14px] text-muted-foreground w-full" style={{ fontFamily: 'Geist, sans-serif', fontWeight: 400, lineHeight: '20px' }}>
                <p className="block leading-[20px]">Fill in the details below to create your account.</p>
              </div>
            </div>

            {/* Form Fields */}
            <div className="flex flex-col gap-5 items-center justify-start p-0 relative w-full">
              
              {/* Email Field (Disabled) */}
              <div className="flex flex-col gap-2 items-start justify-start p-0 relative w-full">
                <div className="font-medium text-[14px] text-foreground" style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500 }}>
                  <p className="block">Email</p>
                </div>
                <div className="flex flex-col gap-2 items-start justify-start p-0 relative w-full">
                  <div className="bg-slate-100 h-9 opacity-50 relative rounded-lg w-full border border shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
                    <div className="flex gap-1 h-9 items-center justify-start overflow-hidden px-3 py-1 relative w-full">
                      <div className="flex-1 font-normal text-[14px] text-muted-foreground" style={{ fontFamily: 'Geist, sans-serif', fontWeight: 400, lineHeight: '20px' }}>
                        <p className="block leading-[20px] overflow-hidden text-ellipsis whitespace-nowrap">{email}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Password Field */}
              <div className="flex flex-col gap-2 items-start justify-start p-0 relative w-full">
                <div className="font-medium text-[14px] text-foreground" style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500 }}>
                  <p className="block">Password</p>
                </div>
                <div className="flex flex-col gap-2 items-start justify-start p-0 relative w-full">
                  <div className="bg-white h-9 relative rounded-lg w-full border border shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
                    <div className="flex gap-1 h-9 items-center justify-start overflow-hidden px-3 py-1 relative w-full">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={loading}
                        required
                        className="flex-1 font-normal text-[14px] text-muted-foreground bg-transparent border-none outline-none" 
                        style={{ fontFamily: 'Geist, sans-serif', fontWeight: 400, lineHeight: '20px' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={loading}
                        className="ml-2 p-1 hover:bg-muted rounded flex-shrink-0"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="font-normal text-[14px] text-muted-foreground w-full" style={{ fontFamily: 'Geist, sans-serif', fontWeight: 400, lineHeight: '20px' }}>
                    <p className="block leading-[20px]">Minimum 8 characters.</p>
                  </div>
                </div>
              </div>

              {/* Terms Checkbox */}
              <div className="flex gap-2 items-start justify-start p-0 relative w-full">
                <Checkbox
                  id="terms"
                  checked={termsAccepted}
                  onCheckedChange={(checked) => setTermsAccepted(!!checked)}
                  disabled={loading}
                  className="mt-0.5"
                />
                <div className="flex-1 flex flex-col gap-1.5 items-start justify-start p-0 relative">
                  <label 
                    htmlFor="terms"
                    className="font-medium text-[14px] text-foreground w-full cursor-pointer" 
                    style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500 }}
                  >
                    <p className="leading-none">
                      <span>I agree to the </span>
                      <span>Terms & Conditions</span>
                    </p>
                  </label>
                </div>
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
          <div className="flex flex-col gap-6 items-center justify-center p-0 relative w-full">
            <button
              onClick={handleRegister}
              disabled={!password || loading}
              className="bg-foreground flex gap-2 h-10 items-center justify-center px-8 py-2 relative rounded-lg shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] w-full disabled:opacity-50 disabled:cursor-not-allowed hover:bg-foreground/90 transition-colors"
            >
              <div className="font-medium text-[14px] text-primary-foreground" style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500, lineHeight: '20px' }}>
                <p className="block leading-[20px] whitespace-pre">
                  {loading ? 'Creating Account...' : 'Register'}
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RegisterPageContent />
    </Suspense>
  )
}