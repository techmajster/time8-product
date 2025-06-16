'use client'

import { Navigation } from './navigation'
import { useUserTheme } from '@/hooks/use-user-theme'

interface AppLayoutClientProps {
  children: React.ReactNode
  userRole?: string
  userId?: string
}

export function AppLayoutClient({ children, userRole, userId }: AppLayoutClientProps) {
  // Load user's theme preference on mount
  useUserTheme(userId)

  return (
    <div className="min-h-screen bg-background">
      <Navigation 
        userRole={userRole}
      />
      <main>
        {children}
      </main>
    </div>
  )
} 