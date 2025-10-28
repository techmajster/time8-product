'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'
import { SignOutButton } from '@/components/sign-out-button'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { useTranslations } from 'next-intl'

interface NavigationProps {
  userRole?: string
  organizationLogo?: string | null
  organizationName?: string
  userProfile?: {
    full_name?: string | null
    email: string
    avatar_url?: string | null
  }
  teamInviteCount?: number
}

const getNavigationItems = (t: any, userRole: string) => {
  // Employee navigation - simplified
  if (userRole === 'employee') {
    return [
      {
        name: t('navigation.dashboard'),
        href: '/dashboard',
        roles: ['employee']
      },
      {
        name: t('navigation.leave'),
        href: '/leave',
        roles: ['employee']
      },
      {
        name: t('navigation.calendar'),
        href: '/calendar',
        roles: ['employee']
      },
      {
        name: t('navigation.help'),
        href: '/help',
        roles: ['employee']
      }
    ]
  }

  // Admin/Manager navigation - full access
  return [
    {
      name: t('navigation.dashboard'),
      href: '/dashboard',
      roles: ['admin', 'manager']
    },
    {
      name: t('navigation.team'),
      href: '/team',
      roles: ['admin', 'manager'],
      showBadge: true
    },
    {
      name: t('navigation.leave'),
      href: '/leave',
      roles: ['admin', 'manager']
    },
    {
      name: t('navigation.schedule'),
      href: '/schedule',
      roles: ['admin', 'manager']
    },
    {
      name: t('navigation.admin'),
      href: '/admin',
      roles: ['admin']
    },
    {
      name: t('navigation.calendar'),
      href: '/calendar',
      roles: ['admin', 'manager']
    }
  ]
}

const getSettingsNavigation = (t: any) => [
  {
    name: t('settings.organization'),
    href: '/admin/settings'
  },
  {
    name: t('navigation.profile'),
    href: '/profile'
  }
]

export function Navigation({ 
  userRole = 'employee', 
  organizationLogo, 
  organizationName,
  userProfile,
  teamInviteCount = 0
}: NavigationProps) {
  const pathname = usePathname()
  const t = useTranslations()
  
  const navigation = getNavigationItems(t, userRole)
  const settingsNavigation = getSettingsNavigation(t)

  // Navigation is already filtered by role in getNavigationItems
  const filteredNavigation = navigation

  const userDisplayName = userProfile?.full_name || userProfile?.email || 'User'
  const userInitials = userDisplayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  return (
    <div className="bg-background border-b border-border shadow-xs">
      <div className="flex items-center justify-between px-6 py-0 h-16 w-full">
        {/* Left side - Logo and Navigation */}
        <div className="flex items-center gap-6">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            {organizationLogo ? (
              <div className="w-9 h-9 rounded-lg overflow-hidden flex items-center justify-center bg-background border">
                <img 
                  src={organizationLogo} 
                  alt={`${organizationName} logo`}
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">SL</span>
              </div>
            )}
          </Link>
          
          {/* Navigation */}
          <nav className="flex items-center gap-1">
            {filteredNavigation.map((item) => {
              const isActive = pathname === item.href
              
              return (
                <Link key={item.name} href={item.href}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors h-auto',
                      isActive 
                        ? 'text-foreground' 
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {item.name}
                    {item.showBadge && teamInviteCount > 0 && (
                      <Badge 
                        variant="secondary" 
                        className="bg-foreground text-background hover:bg-foreground px-2 py-0.5 text-xs font-semibold rounded-lg shadow-sm h-5 min-w-5 flex items-center justify-center"
                      >
                        {teamInviteCount}
                      </Badge>
                    )}
                  </Button>
                </Link>
              )
            })}

            {/* Settings Dropdown - Only for admins/managers */}
            {(userRole === 'admin' || userRole === 'manager') && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground transition-colors h-auto"
                  >
                    {t('navigation.settings')}
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {settingsNavigation.map((item) => (
                    <DropdownMenuItem key={item.name} asChild>
                      <Link href={item.href}>
                        {item.name}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </nav>
        </div>

        {/* Right side - User menu */}
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground transition-colors h-auto"
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage 
                    src={userProfile?.avatar_url || undefined} 
                    alt={userDisplayName} 
                  />
                  <AvatarFallback className="">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden sm:inline">{userProfile?.email}</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {/* Profile link - Only for admins/managers */}
              {(userRole === 'admin' || userRole === 'manager') && (
                <DropdownMenuItem asChild>
                  <Link href="/profile">
                    {t('navigation.profile')}
                  </Link>
                </DropdownMenuItem>
              )}
              {(userRole === 'admin' || userRole === 'manager') && (
                <DropdownMenuItem asChild>
                  <Link href="/admin/settings">
                    {t('settings.organization')}
                  </Link>
                </DropdownMenuItem>
              )}
              {(userRole === 'admin' || userRole === 'manager') && (
                <DropdownMenuSeparator />
              )}
              <DropdownMenuItem asChild>
                <div className="w-full">
                  <SignOutButton />
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
} 