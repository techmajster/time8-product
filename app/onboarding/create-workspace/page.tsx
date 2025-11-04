'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ChevronLeft } from 'lucide-react'
import { DecorativeBackground } from '@/components/auth/DecorativeBackground'
import { LanguageSwitcher } from '@/components/auth/LanguageSwitcher'

function CreateWorkspacePageContent() {
  const t = useTranslations('onboarding.createWorkspace')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [workspaceName, setWorkspaceName] = useState('')
  const [language, setLanguage] = useState('english')
  const [country, setCountry] = useState('ireland')
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error || !user) {
        router.push('/login')
        return
      }
    }

    checkAuth()
  }, [router])

  const handleBack = () => {
    router.back()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!workspaceName.trim()) {
      setError(t('form.error.nameRequired'))
      return
    }
    
    try {
      setIsSubmitting(true)
      setError(null)

      // Store organization data in session storage instead of creating in DB
      const organizationData = {
        name: workspaceName.trim(),
        slug: workspaceName.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').substring(0, 50),
        country_code: country === 'ireland' ? 'IE' : country === 'poland' ? 'PL' : 'GB'
      }

      // Store in session storage
      if (typeof window !== 'undefined' && window.sessionStorage) {
        sessionStorage.setItem('pending_organization', JSON.stringify(organizationData))
      }

      console.log('✅ Workspace data stored in session:', organizationData)
      // Redirect to add users page (no org_id since not created yet)
      router.push('/onboarding/add-users')
      
    } catch (error: any) {
      console.error('❌ Workspace data storage error:', error)
      setError(error.message || 'Failed to store workspace data. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-white flex flex-col gap-[10px] items-start relative size-full min-h-screen">
      {/* Decorative background */}
      <DecorativeBackground />

      {/* Language Switcher */}
      <LanguageSwitcher />

      {/* Top header with logo */}
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

      {/* Main content */}
      <div className="flex flex-col gap-[24px] flex-1 items-center justify-center min-h-0 min-w-px relative rounded-[10px] shrink-0 w-full z-10">
        {/* Form Container */}
        <div className="flex flex-col gap-[40px] items-center justify-start relative w-[400px]">
        
        {/* Back Button */}
        <div className="flex gap-0.5 items-center justify-start relative w-full">
          <button
            onClick={handleBack}
            className="bg-white flex gap-2 items-center justify-center px-4 py-2 relative rounded-lg border border shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4 text-foreground" />
            <div className="font-medium text-[14px] text-foreground" style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500, lineHeight: '20px' }}>
              <p className="block leading-[20px] whitespace-pre">{t('back')}</p>
            </div>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-8 items-start justify-start relative w-full">
          
          {/* Header */}
          <div className="flex flex-col gap-2 items-center justify-start relative w-full">
            <div className="font-bold relative text-[30px] text-foreground w-full" style={{ fontFamily: 'Geist, sans-serif', fontWeight: 700, lineHeight: '36px' }}>
              <p className="block leading-[36px]">{t('title')}</p>
            </div>
          </div>

          {/* Form Fields */}
          <div className="flex flex-col gap-5 items-center justify-start relative w-full">
            
            {/* Workspace Name Input */}
            <div className="flex flex-col gap-2 items-start justify-start relative w-full">
              <Label htmlFor="workspace-name" className="font-medium text-[14px] text-foreground" style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500 }}>
                {t('form.name.label')}
              </Label>
              <div className="flex flex-col gap-2 items-start justify-start relative w-full">
                <Input
                  id="workspace-name"
                  placeholder={t('form.name.placeholder')}
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  disabled={isSubmitting}
                  className="bg-white h-9 rounded-lg w-full border border shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] px-3 py-1 font-normal text-[14px] text-muted-foreground"
                  style={{ fontFamily: 'Geist, sans-serif', fontWeight: 400, lineHeight: '20px' }}
                />
                <div className="font-normal text-[14px] text-muted-foreground w-full" style={{ fontFamily: 'Geist, sans-serif', fontWeight: 400, lineHeight: '20px' }}>
                  <p className="block leading-[20px]">{t('form.name.workspaceAddress', { slug: workspaceName.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').substring(0, 20) || 'name' })}</p>
                </div>
              </div>
            </div>

            {/* Main Language Select */}
            <div className="flex flex-col gap-2 items-start justify-start relative w-full">
              <Label className="font-medium text-[14px] text-foreground" style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500 }}>
                {t('form.language.label')}
              </Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="bg-white h-9 rounded-lg w-full border border shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] px-4 py-2">
                  <SelectValue placeholder={t('form.language.placeholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="english">
                    <div className="flex gap-2 items-center">
                      <div className="w-5 h-5 rounded-full overflow-hidden flex-shrink-0">
                        <svg viewBox="0 0 20 20" className="w-full h-full">
                          <circle cx="10" cy="10" r="10" fill="#F0F0F0"/>
                          <path d="M19.9154 8.69566H11.3044V0.0846484C10.8774 0.0290625 10.4421 0 10 0C9.55785 0 9.12262 0.0290625 8.69566 0.0846484V8.69563H0.0846484C0.0290625 9.12262 0 9.55793 0 10C0 10.4421 0.0290625 10.8774 0.0846484 11.3043H8.69563V19.9154C9.12262 19.9709 9.55785 20 10 20C10.4421 20 10.8774 19.971 11.3043 19.9154V11.3044H19.9154C19.9709 10.8774 20 10.4421 20 10C20 9.55793 19.9709 9.12262 19.9154 8.69566Z" fill="#D80027"/>
                          <path d="M12.6087 12.6088L17.0711 17.0711C17.2763 16.8659 17.4721 16.6514 17.6589 16.4291L13.8385 12.6087H12.6087V12.6088Z" fill="#D80027"/>
                          <path d="M7.39129 12.6087L2.92891 17.0711C3.13406 17.2763 3.34855 17.4721 3.5709 17.6589L7.39129 13.8384V12.6087Z" fill="#D80027"/>
                          <path d="M7.39129 7.39137L2.92895 2.92891C2.72371 3.13406 2.52793 3.34855 2.34113 3.5709L6.16156 7.39133H7.39129V7.39137Z" fill="#D80027"/>
                          <path d="M12.6087 7.39137L17.0711 2.92895C16.8659 2.72371 16.6514 2.52793 16.4291 2.34117L12.6087 6.1616V7.39137Z" fill="#D80027"/>
                          <path d="M1.7227 3.5673C0.937188 4.5893 0.344883 5.76723 0 7.04687H5.20227L1.7227 3.5673Z" fill="#0052B4"/>
                          <path d="M19.311 7.04687C18.9661 5.76727 18.3738 4.58934 17.5883 3.56734L14.1088 7.04687H19.311Z" fill="#0052B4"/>
                          <path d="M0 12.2643C0.344922 13.5439 0.937226 14.7218 1.7227 15.7438L5.20215 12.2643H0Z" fill="#0052B4"/>
                          <path d="M15.7437 1.72273C14.7217 0.937227 13.5438 0.344922 12.2642 0V5.20223L15.7437 1.72273Z" fill="#0052B4"/>
                          <path d="M3.5673 17.5883C4.5893 18.3738 5.76723 18.9661 7.04684 19.311V14.1088L3.5673 17.5883Z" fill="#0052B4"/>
                          <path d="M7.0468 0C5.76719 0.344922 4.58926 0.937226 3.5673 1.7227L7.0468 5.20219V0Z" fill="#0052B4"/>
                          <path d="M12.2642 19.311C13.5438 18.9661 14.7218 18.3738 15.7437 17.5883L12.2642 14.1088V19.311Z" fill="#0052B4"/>
                          <path d="M14.1088 12.2643L17.5883 15.7438C18.3738 14.7218 18.9661 13.5439 19.311 12.2643H14.1088Z" fill="#0052B4"/>
                        </svg>
                      </div>
                      <span>English</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="polish">
                    <div className="flex gap-2 items-center">
                      <div className="w-5 h-5 rounded-full overflow-hidden flex-shrink-0">
                        <svg viewBox="0 0 20 20" className="w-full h-full">
                          <circle cx="10" cy="10" r="10" fill="#F0F0F0"/>
                          <path d="M10 0C15.5228 0 20 4.47715 20 10H0C0 4.47715 4.47715 0 10 0Z" fill="#F0F0F0"/>
                          <path d="M10 20C4.47715 20 0 15.5228 0 10H20C20 15.5228 15.5228 20 10 20Z" fill="#DC143C"/>
                        </svg>
                      </div>
                      <span>Polish</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <div className="font-normal text-[14px] text-muted-foreground w-full" style={{ fontFamily: 'Geist, sans-serif', fontWeight: 400, lineHeight: '20px' }}>
                <p className="block leading-[20px]">{t('form.language.description')}</p>
              </div>
            </div>

            {/* Holiday Calendar Preset Select */}
            <div className="flex flex-col gap-2 items-start justify-start relative w-full">
              <Label className="font-medium text-[14px] text-foreground" style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500 }}>
                {t('form.country.label')}
              </Label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger className="bg-white h-9 rounded-lg w-full border border shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] px-4 py-2">
                  <SelectValue placeholder={t('form.country.placeholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ireland">
                    <div className="flex gap-2 items-center">
                      <div className="w-5 h-5 rounded-full overflow-hidden flex-shrink-0">
                        <svg viewBox="0 0 20 20" className="w-full h-full">
                          <circle cx="10" cy="10" r="10" fill="#F0F0F0"/>
                          <path d="M0 9.37797C0 13.6777 2.71375 17.343 6.52176 18.756V0C2.71375 1.41289 0 5.07836 0 9.37797V9.37797Z" fill="#6DA544" transform="translate(0, 0.62)"/>
                          <path d="M6.52176 9.37797C6.52176 5.07836 3.80801 1.41289 0 0V18.7561C3.80801 17.343 6.52176 13.6777 6.52176 9.37797V9.37797Z" fill="#FF9811" transform="translate(13.48, 0.62)"/>
                        </svg>
                      </div>
                      <span>Ireland</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="poland">
                    <div className="flex gap-2 items-center">
                      <div className="w-5 h-5 rounded-full overflow-hidden flex-shrink-0">
                        <svg viewBox="0 0 20 20" className="w-full h-full">
                          <circle cx="10" cy="10" r="10" fill="#F0F0F0"/>
                          <path d="M10 0C15.5228 0 20 4.47715 20 10H0C0 4.47715 4.47715 0 10 0Z" fill="#F0F0F0"/>
                          <path d="M10 20C4.47715 20 0 15.5228 0 10H20C20 15.5228 15.5228 20 10 20Z" fill="#DC143C"/>
                        </svg>
                      </div>
                      <span>Poland</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <div className="font-normal text-[14px] text-muted-foreground w-full" style={{ fontFamily: 'Geist, sans-serif', fontWeight: 400, lineHeight: '20px' }}>
                <p className="block leading-[20px]">{t('form.country.description')}</p>
              </div>
            </div>

          </div>
        </form>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="w-full">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Submit Button */}
        <div className="flex flex-col gap-6 items-center justify-center relative w-full">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !workspaceName.trim()}
            className="bg-primary flex gap-2 h-10 items-center justify-center px-8 py-2 relative rounded-lg shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] w-full disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors cursor-pointer"
          >
            <div className="font-medium text-[14px] text-primary-foreground" style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500, lineHeight: '20px' }}>
              <p className="block leading-[20px] whitespace-pre">
                {isSubmitting ? t('form.submitting') : t('form.submit')}
              </p>
            </div>
          </button>
        </div>
        </div>
      </div>
    </div>
  )
}

export default function CreateWorkspacePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CreateWorkspacePageContent />
    </Suspense>
  )
}