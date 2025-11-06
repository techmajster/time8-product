'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import Image from 'next/image'
import { Loader2 } from 'lucide-react'
import { LoginForm } from "./components/LoginForm"
import { SignupForm } from "./components/SignupForm"
import { ForgotPasswordForm } from "./components/ForgotPasswordForm"
import { ResetPasswordForm } from "./components/ResetPasswordForm"
import { DecorativeBackground } from "@/components/auth/DecorativeBackground"
import { HeroSection } from "@/components/auth/HeroSection"
import { LanguageDropdown } from "@/components/auth/LanguageDropdown"

type AuthMode = 'login' | 'signup' | 'forgot-password' | 'reset-password'

function LoginPageContent() {
  const searchParams = useSearchParams()
  const t = useTranslations('auth')
  const locale = useLocale()
  const initialMode = (searchParams.get('mode') as AuthMode) || 'login'
  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [isSignupSuccess, setIsSignupSuccess] = useState(false)

  const getTitle = () => {
    switch (mode) {
      case 'signup': return t('signupTitle')
      case 'forgot-password': return t('forgotPasswordTitle')
      case 'reset-password': return t('resetPasswordTitle')
      default: return t('loginTitle')
    }
  }

  const getDescription = () => {
    switch (mode) {
      case 'signup': return t('signupDescription')
      case 'forgot-password': return t('forgotPasswordDescription')
      case 'reset-password': return t('resetPasswordDescription')
      default: return t('loginDescription')
    }
  }

  const renderForm = () => {
    switch (mode) {
      case 'signup':
        return <SignupForm onModeChange={setMode} onAccountCreated={setIsSignupSuccess} />
      case 'forgot-password':
        return <ForgotPasswordForm onModeChange={setMode} />
      case 'reset-password':
        return <ResetPasswordForm onModeChange={setMode} />
      default:
        return <LoginForm onModeChange={setMode} />
    }
  }

  return (
    <div className="flex items-stretch relative w-full min-h-screen">
      {/* Left Container - Form Section */}
      <div className="bg-background flex flex-col items-center justify-center relative w-full lg:w-1/2 min-h-screen">
        {/* Decorative Background */}
        <DecorativeBackground />
        
        {/* Language Switcher */}
        <LanguageDropdown />

        {/* Content Container */}
        <div className="flex flex-col gap-6 items-start w-full max-w-[384px] relative z-10">
          {/* Logo + Title Header */}
          <div className="flex gap-4 items-end relative w-full">
            <div className="h-[30px] relative shrink-0 w-[108.333px]">
              <Image
                alt="time8 logo"
                className="block h-[30px] w-auto"
                src="/auth-assets/30f1f246576f6427b3a9b511194297cbba4d7ec6.svg"
                width={108}
                height={30}
                priority
              />
            </div>
            <p className="flex-1 font-normal leading-none text-muted-foreground text-3xl text-right">
              {getTitle()}
            </p>
          </div>

          {/* Separator */}
          <div className="flex flex-col gap-[10px] items-start relative w-full">
            <div className="h-0 relative w-full border-t border-border" />
          </div>

          {/* Description */}
          {!isSignupSuccess && (
            <div className="flex flex-col gap-3 items-start relative w-full">
              <p className="font-normal leading-5 text-muted-foreground text-sm w-full">
                {getDescription()}
              </p>
            </div>
          )}

          {/* Form */}
          {renderForm()}
        </div>
      </div>

      {/* Right Container - Hero Section */}
      <div className="hidden lg:flex lg:w-1/2 min-h-screen">
        <HeroSection />
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>}>
      <LoginPageContent />
    </Suspense>
  )
}
