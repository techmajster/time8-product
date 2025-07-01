'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { GoogleAuthButton } from '@/components/google-auth-button'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const _router = useRouter()
  const supabase = createClient()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    if (!acceptTerms) {
      setError('You must accept the terms and conditions')
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
        emailRedirectTo: `${location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setMessage('Check your email to confirm your account!')
      setLoading(false)
    }
  }

  return (
    <div className="bg-background relative h-screen overflow-hidden">
      <div className="relative h-full">
        <div className="flex flex-row gap-6 items-start justify-start p-6 relative h-full">
          {/* Left Column - Signup Form */}
          <div className="basis-0 bg-background grow h-full relative">
            <div className="px-16 py-16 h-full flex flex-col justify-center">
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  Utwórz konto
                </h1>
                <p className="text-muted-foreground">
                  Zacznij korzystać z systemu zarządzania urlopami
                </p>
              </div>

              <form className="space-y-6" onSubmit={handleSignup}>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label htmlFor="firstName" className="block text-sm font-medium text-foreground mb-2">
                      Imię
                    </label>
                    <input
                      id="firstName"
                      name="firstName"
                      type="text"
                      required
                      value={fullName.split(' ')[0]}
                      onChange={(e) => setFullName(e.target.value)}
                      className="bg-background h-9 rounded-lg border border-input shadow-sm px-3 py-1 text-[14px] leading-[20px] text-foreground placeholder:text-muted-foreground w-full"
                      placeholder="Wprowadź imię"
                    />
                  </div>
                  <div className="flex-1">
                    <label htmlFor="lastName" className="block text-sm font-medium text-foreground mb-2">
                      Nazwisko
                    </label>
                    <input
                      id="lastName"
                      name="lastName"
                      type="text"
                      required
                      value={fullName.split(' ')[1]}
                      onChange={(e) => setFullName(e.target.value)}
                      className="bg-background h-9 rounded-lg border border-input shadow-sm px-3 py-1 text-[14px] leading-[20px] text-foreground placeholder:text-muted-foreground w-full"
                      placeholder="Wprowadź nazwisko"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                    Adres e-mail
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-background h-9 rounded-lg border border-input shadow-sm px-3 py-1 text-[14px] leading-[20px] text-foreground placeholder:text-muted-foreground w-full"
                    placeholder="Wprowadź e-mail"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
                    Hasło
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-background h-9 rounded-lg border border-input shadow-sm px-3 py-1 text-[14px] leading-[20px] text-foreground placeholder:text-muted-foreground w-full"
                    placeholder="Wprowadź hasło"
                  />
                  <p className="text-xs text-muted-foreground">
                    Must be at least 6 characters
                  </p>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground font-normal">
                      Lub zarejestruj się przez
                    </span>
                  </div>
                </div>

                <div className="relative w-full">
                  <div className="flex flex-row items-start justify-start p-0 relative w-full gap-2">
                    <Checkbox
                      id="accept-terms"
                      checked={acceptTerms}
                      onCheckedChange={(checked) => setAcceptTerms(checked === true)}
                      className="size-4 rounded border-neutral-900 data-[state=checked]:bg-neutral-900 data-[state=checked]:border-neutral-900 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] mt-0.5"
                    />
                    <Label 
                      htmlFor="accept-terms" 
                      className="font-normal text-[14px] leading-[20px] text-foreground cursor-pointer flex-1"
                    >
                      I accept the{' '}
                      <Link href="/terms" className="text-foreground underline hover:text-foreground-foreground cursor-pointer">
                        Terms and Conditions
                      </Link>{' '}
                      and{' '}
                      <Link href="/privacy" className="text-foreground underline hover:text-foreground-foreground cursor-pointer">
                        Privacy Policy
                      </Link>
                    </Label>
                  </div>
                </div>

                {/* Error/Success Messages */}
                {error && (
                  <div className="text-sm text-destructive w-full">
                    {error}
                  </div>
                )}
                {message && (
                  <div className="text-sm text-success w-full">
                    {message}
                  </div>
                )}

                <div className="relative w-full">
                  <div className="flex flex-col gap-4 items-center justify-center p-0 relative w-full">
                    <Button
                      type="submit"
                      onClick={handleSignup}
                      disabled={loading || !!message}
                      className="bg-foreground text-background hover:bg-foreground-foreground rounded-lg shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] px-4 py-2 w-full font-medium text-[14px] leading-[20px]"
                    >
                      {loading ? 'Creating account...' : 'Sign up'}
                    </Button>
                    
                    {/* Google Sign Up Button */}
                    <GoogleAuthButton mode="signup" />
                    
                    <div className="relative w-full">
                      <div className="flex flex-row gap-1 items-start justify-center p-0 relative w-full text-[14px] leading-[20px] text-center">
                        <span className="text-foreground">
                          Already have an account?
                        </span>
                        <Link 
                          href="/auth/login" 
                          className="text-foreground underline hover:text-foreground-foreground cursor-pointer"
                        >
                          Sign in
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>

          {/* Right Column - Background Image/Placeholder */}
          <div className="basis-0 grow h-full relative rounded-[14px] bg-gradient-to-br from-neutral-100 to-neutral-200">
            <div className="size-full flex items-center justify-center">
              <div className="text-muted-foreground text-6xl">
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}