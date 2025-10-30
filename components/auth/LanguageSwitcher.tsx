'use client'

import { useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

export function LanguageSwitcher() {
  const locale = useLocale()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const switchLanguage = async () => {
    const newLocale = locale === 'en' ? 'pl' : 'en'
    setIsLoading(true)

    try {
      // Call the locale API to set the cookie
      const response = await fetch('/api/locale', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ locale: newLocale }),
      })

      if (response.ok) {
        // Refresh the page to apply the new locale
        router.refresh()
      }
    } catch (error) {
      console.error('Failed to switch language:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={switchLanguage}
      disabled={isLoading}
      className="absolute top-4 right-4 z-20"
    >
      {locale === 'en' ? '🇵🇱 PL' : '🇬🇧 EN'}
    </Button>
  )
}

