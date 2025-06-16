'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { 
  Home, 
  Users, 
  Calendar, 
  Settings, 
  CalendarDays,
  User
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SignOutButton } from '@/components/sign-out-button'
import { ThemeToggle } from '@/components/theme-toggle'

interface NavigationProps {
  userRole?: string
}

const navigation = [
  {
    name: 'Pulpit',
    href: '/dashboard',
    icon: Home,
    roles: ['admin', 'manager', 'employee']
  },
  {
    name: 'Zespół',
    href: '/team',
    icon: Users,
    roles: ['admin', 'manager', 'employee']
  },
  {
    name: 'Wnioski urlopowe',
    href: '/leave',
    icon: Calendar,
    roles: ['admin', 'manager', 'employee'],
    disabled: false
  },
  {
    name: 'Administracja',
    href: '/admin',
    icon: Settings,
    roles: ['admin'],
    disabled: false
  },
  {
    name: 'Święta',
    href: '/admin/holidays',
    icon: CalendarDays,
    roles: ['admin'],
    disabled: false
  },
  {
    name: 'Ustawienia',
    href: '/settings',
    icon: Settings,
    roles: ['admin', 'manager'],
    disabled: false
  },
  {
    name: 'Kalendarz zespołu',
    href: '/calendar',
    icon: CalendarDays,
    roles: ['admin', 'manager', 'employee'],
    disabled: false
  },
  {
    name: 'Profil',
    href: '/profile',
    icon: User,
    roles: ['admin', 'manager', 'employee'],
    disabled: false
  }
]

export function Navigation({ userRole = 'employee' }: NavigationProps) {
  const pathname = usePathname()

  const filteredNavigation = navigation.filter(item => 
    item.roles.includes(userRole)
  )

  return (
    <div className="flex h-16 items-center justify-between border-b border-border bg-card px-6 shadow-sm">
      {/* Left side - Logo and Navigation */}
      <div className="flex items-center gap-8">
        <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">SL</span>
          </div>
          <span className="font-semibold text-lg text-card-foreground">
            Saas Leave
          </span>
        </Link>
        
        <nav className="flex items-center gap-1">
          {filteredNavigation.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon
            
            if (item.disabled) {
              return (
                <Button
                  key={item.name}
                  variant="ghost"
                  size="sm"
                  disabled={true}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    'opacity-50 cursor-not-allowed text-muted-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.name}
                </Button>
              )
            }

            return (
              <Link 
                key={item.name} 
                href={item.href}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    isActive 
                      ? 'bg-primary/10 text-blue-700 hover:bg-primary/10 dark:bg-blue-950 dark:text-blue-100 dark:hover:bg-blue-950' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.name}
                </Button>
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Right side - User menu */}
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <SignOutButton />
      </div>
    </div>
  )
} 