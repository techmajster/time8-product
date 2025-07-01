'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ForgotPasswordPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/login?mode=forgot-password')
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p>Redirecting to password reset...</p>
    </div>
  )
} 