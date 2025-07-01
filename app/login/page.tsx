'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { GalleryVerticalEnd } from "lucide-react"
import { LoginForm } from "./components/LoginForm"
import { SignupForm } from "./components/SignupForm"
import { ForgotPasswordForm } from "./components/ForgotPasswordForm"
import { ResetPasswordForm } from "./components/ResetPasswordForm"
import { LanguageSwitcher } from "@/components/LanguageSwitcher"

type AuthMode = 'login' | 'signup' | 'forgot-password' | 'reset-password'

export default function LoginPage() {
  const searchParams = useSearchParams()
  const t = useTranslations('auth')
  const locale = useLocale()
  const initialMode = (searchParams.get('mode') as AuthMode) || 'login'
  const [mode, setMode] = useState<AuthMode>(initialMode)

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
        return <SignupForm onModeChange={setMode} />
      case 'forgot-password':
        return <ForgotPasswordForm onModeChange={setMode} />
      case 'reset-password':
        return <ResetPasswordForm onModeChange={setMode} />
      default:
        return <LoginForm onModeChange={setMode} />
    }
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <a href="#" className="flex items-center gap-2 font-medium">
              <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md">
                <GalleryVerticalEnd className="size-4" />
              </div>
              Leave System
            </a>
          </div>
          <LanguageSwitcher />
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-md">
            <div className="flex flex-col items-left gap-2 text-left mb-6">
              <h1 className="text-2xl font-bold">{getTitle()}</h1>
              <p className="text-muted-foreground text-sm text-balance">
                {getDescription()}
              </p>
            </div>
            {renderForm()}
          </div>
        </div>
      </div>
      <div className="bg-muted relative hidden lg:block">
        <img
          src="/images/gradient-hero-prerender.avif"
          alt="Image"
          className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
        />
      </div>
    </div>
  )
}
