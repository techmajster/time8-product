'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { GoogleAuthButton } from '@/components/google-auth-button'

export default function LoginPage() {
  const t = useTranslations('auth')
  const tCommon = useTranslations('common')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [keepSignedIn, setKeepSignedIn] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div className="bg-white relative h-screen overflow-hidden">
      <div className="relative h-full">
        <div className="flex flex-row gap-6 items-start justify-start p-6 relative h-full">
          {/* Left Column - Login Form */}
          <div className="basis-0 bg-white grow h-full relative">
            <div className="flex flex-col gap-2.5 items-center justify-center p-8 relative h-full">
              <div className="relative w-full max-w-[360px]">
                <div className="flex flex-col gap-6 items-start justify-start p-0 relative w-full">
                  {/* Logo and Header */}
                  <div className="relative w-full">
                    <div className="flex flex-col gap-6 items-start justify-start p-0 relative w-full">
                      {/* Logo */}
                      <div className="relative size-9">
                        <svg
                          className="block size-full"
                          fill="none"
                          preserveAspectRatio="none"
                          viewBox="0 0 36 36"
                        >
                          <path
                            d="M31.795 14.2835C32.9315 13.2669 33.6369 11.7971 33.6369 10.1914V7.34245C33.6369 3.28921 30.3189 0 26.2303 0H9.31383C5.22515 0 1.90718 3.28921 1.90718 7.34245V14.2446C1.90718 15.8568 2.59951 17.2748 3.68373 18.2719C1.45651 19.5604 0 21.9432 0 24.6173V29.3957C0 33.0475 2.98487 36 6.66207 36H28.869C32.5527 36 35.531 33.041 35.531 29.3957V20.6676C35.531 17.8964 33.9961 15.546 31.782 14.2964L31.795 14.2835ZM7.3544 7.10288C7.3544 5.68489 8.517 4.53237 9.94738 4.53237H25.5249C26.9553 4.53237 28.1178 5.68489 28.1178 7.10288V10.5345C28.1178 11.7647 27.2361 12.8201 26.0213 13.0597L10.4438 16.0511C8.84357 16.3554 7.36093 15.1446 7.36093 13.5259V7.10288H7.3544ZM29.7507 28.8971C29.7507 30.3151 28.5881 31.4676 27.1577 31.4676H8.31452C6.88414 31.4676 5.72154 30.3151 5.72154 28.8971V23.5489C5.72154 22.3187 6.60329 21.2568 7.82467 21.0237L26.6679 17.4302C28.2681 17.1259 29.7507 18.3367 29.7507 19.9554V28.8971Z"
                            fill="#323232"
                          />
                        </svg>
                      </div>
                      
                      {/* Title and Description */}
                      <div className="relative w-full">
                        <div className="flex flex-col gap-3 items-start justify-start p-0 relative w-full">
                          <h1 className="font-bold text-[30px] leading-[36px] text-neutral-950 w-full">
                            {t('login')}
                          </h1>
                          <p className="font-normal text-[14px] leading-[20px] text-neutral-500 w-full">
                            {t('loginDescription')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Form */}
                  <div className="relative w-full">
                    <form onSubmit={handleLogin} className="flex flex-col gap-4 items-start justify-start p-0 relative w-full">
                      {/* Email Input */}
                      <div className="relative w-full">
                        <div className="flex flex-col gap-2 items-start justify-start p-0 relative w-full">
                          <Label className="font-medium text-[14px] leading-none text-neutral-950">
                            {t('email')}
                          </Label>
                          <div className="relative w-full">
                            <Input
                              id="email"
                              type="email"
                              placeholder={t('emailPlaceholder')}
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              required
                              className="bg-white h-9 rounded-lg border border-neutral-200 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] px-3 py-1 text-[14px] leading-[20px] text-neutral-500 placeholder:text-neutral-500 w-full"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Password Input */}
                      <div className="relative w-full">
                        <div className="flex flex-col gap-2 items-start justify-start p-0 relative w-full">
                          <Label className="font-medium text-[14px] leading-none text-neutral-950">
                            {t('password')}
                          </Label>
                          <div className="relative w-full">
                            <Input
                              id="password"
                              type="password"
                              placeholder={t('password')}
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              required
                              className="bg-white h-9 rounded-lg border border-neutral-200 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] px-3 py-1 text-[14px] leading-[20px] text-neutral-500 placeholder:text-neutral-500 w-full"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Checkbox and Forgot Password */}
                      <div className="relative w-full">
                        <div className="flex flex-row items-center justify-between p-0 relative w-full">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="keep-signed-in"
                              checked={keepSignedIn}
                              onCheckedChange={(checked) => setKeepSignedIn(checked === true)}
                              className="size-4 rounded border-neutral-900 data-[state=checked]:bg-neutral-900 data-[state=checked]:border-neutral-900 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]"
                            />
                            <Label 
                              htmlFor="keep-signed-in" 
                              className="font-medium text-[14px] leading-none text-neutral-950 cursor-pointer"
                            >
                              {t('keepSignedIn')}
                            </Label>
                          </div>
                          <Link 
                            href="/auth/forgot-password" 
                            className="font-normal text-[14px] leading-[20px] text-neutral-500 underline hover:text-neutral-700"
                          >
                            {t('forgotPassword')}
                          </Link>
                        </div>
                      </div>

                      {/* Error Message */}
                      {error && (
                        <div className="text-sm text-red-600 w-full">
                          {error}
                        </div>
                      )}
                    </form>
                  </div>

                  {/* Submit Button and Sign Up Link */}
                  <div className="relative w-full">
                    <div className="flex flex-col gap-4 items-center justify-center p-0 relative w-full">
                      <Button
                        type="submit"
                        onClick={handleLogin}
                        disabled={loading}
                        className="bg-neutral-900 text-neutral-50 hover:bg-neutral-800 rounded-lg shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] px-4 py-2 w-full font-medium text-[14px] leading-[20px]"
                      >
                        {loading ? t('signingIn') : t('login')}
                      </Button>
                      
                      {/* Divider */}
                      <div className="relative w-full">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t border-neutral-200" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-white px-2 text-neutral-500 font-normal">
                            {t('orContinueWith')}
                          </span>
                        </div>
                      </div>
                      
                      {/* Google Sign In Button */}
                      <GoogleAuthButton mode="signin" />
                      
                      <div className="relative w-full">
                        <div className="flex flex-row gap-1 items-start justify-center p-0 relative w-full text-[14px] leading-[20px] text-center">
                          <span className="text-neutral-500">
                            {t('noAccount')}
                          </span>
                          <Link 
                            href="/auth/signup" 
                            className="text-neutral-900 underline hover:text-neutral-700"
                          >
                            {t('signup')}
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Decorative */}
          <div className="basis-0 grow h-full relative rounded-[14px] bg-gradient-to-br from-neutral-100 to-neutral-200">
            <div className="size-full flex items-center justify-center">
              <div className="text-neutral-400 text-6xl">🏢</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}