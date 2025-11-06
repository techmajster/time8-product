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
import { useTranslations } from 'next-intl'

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
  const t = useTranslations('navigation')

  // Format user data for NavUser component
  const userData = {
    name: userProfile?.full_name || userProfile?.email?.split('@')[0] || 'User',
    email: userProfile?.email || '',
    avatar: userProfile?.avatar_url || '',
    role: userRole || 'employee'
  }

  // Base navigation items for all users
  const getBaseNavItems = () => [
    {
      title: t('items.dashboard'),
      url: "/dashboard",
      icon: Gauge,
      isActive: true,
    },
    {
      title: t('items.myLeave'),
      url: "/leave",
      icon: CalendarCheck2,
    },
    {
      title: t('items.calendar'),
      url: "/calendar",
      icon: CalendarDays,
    },
  ]

  // Get manager/admin specific items
  const getManagerItems = () => [
    {
      title: t('items.myTeam'),
      url: "/team",
      icon: Users,
    },
    {
      title: t('items.leaveRequests'),
      url: "/leave-requests",
      icon: FileSymlink,
    },
    {
      title: t('items.addAbsence'),
      url: "#",
      icon: CalendarX,
      onClick: () => {
        const event = new CustomEvent('openAddAbsence')
        window.dispatchEvent(event)
      }
    },
    // Temporarily hidden - Schedule feature
    // {
    //   title: 'Grafik',
    //   url: "/schedule",
    //   icon: CalendarDays,
    // },
  ]

  // Admin items
  const getAdminItems = () => [
    {
      title: t('items.administrativeSettings'),
      url: "/admin/settings",
      icon: Users,
    },
    {
      title: t('items.users'),
      url: "/admin/team-management",
      icon: FileSymlink,
    },
    {
      title: t('items.groups'),
      url: "/admin/groups",
      icon: CalendarX,
    },
  ]

  // Temporarily hidden - Help Center
  const navSecondaryData = [
    // {
    //   title: 'Centrum pomocy',
    //   url: "/help",
    //   icon: CircleHelp,
    // },
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
        
        {/* Base navigation */}
        <NavMain items={baseNavigationItems} label={t('sections.yourAccount')} />

        {/* Manager navigation */}
        {hasManagerAccess && (
          <NavMain items={getManagerItems()} label={t('sections.manager')} />
        )}

        {/* Admin navigation */}
        {hasAdminAccess && (
          <NavMain items={getAdminItems()} label={t('sections.administrator')} />
        )}
        
        <NavSecondary items={navSecondaryData} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userData} />
      </SidebarFooter>
    </Sidebar>
  )
}
