'use client'

import { Navigation } from './navigation'
import { useUserTheme } from '@/hooks/use-user-theme'

interface Organization {
  id: string
  name: string
  brand_color?: string | null
  logo_url?: string | null
}

interface AppLayoutClientProps {
  children: React.ReactNode
  userRole?: string
  userId?: string
  organization?: Organization | null
  userProfile?: {
    full_name?: string | null
    email: string
    avatar_url?: string | null
  }
  teamInviteCount?: number
}

export function AppLayoutClient({ children, userRole, userId, organization, userProfile, teamInviteCount }: AppLayoutClientProps) {
  // Load user's theme preference on mount
  useUserTheme(userId)

  return (
    <div className="min-h-screen bg-background">
      <Navigation 
        userRole={userRole}
        organizationLogo={organization?.logo_url}
        organizationName={organization?.name}
        userProfile={userProfile}
        teamInviteCount={teamInviteCount}
      />
      <main>
        {children}
      </main>
    </div>
  )
} 