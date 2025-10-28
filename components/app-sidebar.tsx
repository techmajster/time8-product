"use client"

import * as React from "react"
import {
  CalendarCheck2,
  CalendarDays,
  CalendarX,
  Gauge,
  CircleHelp,
  FileSymlink,
  Users,
} from "lucide-react"
import { UserRole, isManagerOrAdmin, isAdmin } from '@/lib/permissions'

import { Logo } from "@/components/logo"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import { WorkspaceSwitcher } from "@/components/workspace-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  organizationName?: string | null
  organizationLogo?: string | null
  organizationInitials?: string | null
  userProfile?: {
    full_name?: string | null
    email: string
    avatar_url?: string | null
  }
  userRole?: string
}

export function AppSidebar({ organizationName, organizationLogo, organizationInitials, userProfile, userRole, ...props }: AppSidebarProps) {
  // Format user data for NavUser component
  const userData = {
    name: userProfile?.full_name || userProfile?.email?.split('@')[0] || 'User',
    email: userProfile?.email || '',
    avatar: userProfile?.avatar_url || '',
    role: userRole || 'employee'
  }

  // Base navigation items for all users - "Twoje konto"
  const getBaseNavItems = () => [
    {
      title: 'Dashboard',
      url: "/dashboard",
      icon: Gauge,
      isActive: true,
    },
    {
      title: 'Moje urlopy',
      url: "/leave",
      icon: CalendarCheck2,
    },
    {
      title: 'Kalendarz',
      url: "/calendar",
      icon: CalendarDays,
    },
  ]

  // Get manager/admin specific items - "Kierownik"
  const getManagerItems = () => [
    {
      title: 'Mój zespół',
      url: "/team",
      icon: Users,
    },
    {
      title: 'Wnioski urlopowe',
      url: "/leave-requests",
      icon: FileSymlink,
    },
    {
      title: 'Dodaj nieobecność',
      url: "#",
      icon: CalendarX,
      onClick: () => {
        const event = new CustomEvent('openAddAbsence')
        window.dispatchEvent(event)
      }
    },
    {
      title: 'Grafik',
      url: "/schedule",
      icon: CalendarDays,
    },
  ]

  // Admin items - "Administrator"
  const getAdminItems = () => [
    {
      title: 'Ustawienia administracyjne',
      url: "/admin/settings",
      icon: Users,
    },
    {
      title: 'Użytkownicy',
      url: "/admin/team-management",
      icon: FileSymlink,
    },
    {
      title: 'Grupy',
      url: "/admin/groups",
      icon: CalendarX,
    },
  ]

  const navSecondaryData = [
    {
      title: 'Centrum pomocy',
      url: "/help",
      icon: CircleHelp,
    },
  ]

  // Get base navigation items (for all users)
  const baseNavigationItems = getBaseNavItems()

  // Check if user has manager/admin privileges using permission utilities
  const normalizedRole = (userRole as UserRole) || null
  const hasManagerAccess = isManagerOrAdmin(normalizedRole)
  const hasAdminAccess = isAdmin(normalizedRole)

  return (
    <Sidebar variant="sidebar" {...props}>
      <SidebarHeader>
        <div className="flex items-center px-4 py-3">
          <Logo />
        </div>
      </SidebarHeader>
      <SidebarContent>
        {/* Workspace Switcher */}
        <div className="px-2 py-2">
          <WorkspaceSwitcher 
            currentWorkspaceName={organizationName || "Leave System"} 
          />
        </div>
        
        {/* Base navigation with "Twoje konto" label */}
        <NavMain items={baseNavigationItems} label="Twoje konto" />

        {/* Manager navigation with "Kierownik" label */}
        {hasManagerAccess && (
          <NavMain items={getManagerItems()} label="Kierownik" />
        )}

        {/* Admin navigation with "Administrator" label */}
        {hasAdminAccess && (
          <NavMain items={getAdminItems()} label="Administrator" />
        )}
        
        <NavSecondary items={navSecondaryData} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userData} />
      </SidebarFooter>
    </Sidebar>
  )
}
