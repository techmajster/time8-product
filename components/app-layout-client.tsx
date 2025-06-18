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

  // Apply organization branding if available
  const brandColor = organization?.brand_color || '#0F5765'

  // Helper function to convert hex to HSL
  const hexToHsl = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255
    const g = parseInt(hex.slice(3, 5), 16) / 255
    const b = parseInt(hex.slice(5, 7), 16) / 255

    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    let h, s, l = (max + min) / 2

    if (max === min) {
      h = s = 0 // achromatic
    } else {
      const d = max - min
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break
        case g: h = (b - r) / d + 2; break
        case b: h = (r - g) / d + 4; break
        default: h = 0
      }
      h /= 6
    }

    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`
  }

  const hslColor = hexToHsl(brandColor)

  return (
    <>
      {/* Dynamic CSS Variables for Organization Branding */}
      <style jsx global>{`
        :root {
          --primary: ${hslColor} !important;
          --primary-foreground: 0 0% 100% !important;
        }
      `}</style>
      
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
    </>
  )
} 