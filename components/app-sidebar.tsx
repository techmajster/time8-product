"use client"

import * as React from "react"
import {
  Calendar,
  CalendarDays,
  Home,
  LifeBuoy,
  Send,
  Settings,
  Users,
  ClipboardList,
  Clock,
  Shield,
  User,
  GalleryVerticalEnd,
  HelpCircle,
} from "lucide-react"
import { useTranslations } from 'next-intl'

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
      title: t('dashboard'),
      url: "/dashboard",
      icon: Home,
      isActive: true,
    },
    {
      title: t('leave'),
      url: "/leave",
      icon: ClipboardList,
    },
    {
      title: t('calendar'),
      url: "/calendar",
      icon: Calendar,
    },
  ]

  // Get manager/admin specific items
  const getManagerItems = () => [
    {
      title: t('team'),
      url: "/team",
      icon: Users,
    },
    {
      title: t('leaveRequests'),
      url: "/leave-requests",
      icon: ClipboardList,
    },
    {
      title: t('addAbsence'),
      url: "#",
      icon: Send,
      onClick: () => {
        const event = new CustomEvent('openAddAbsence')
        window.dispatchEvent(event)
      }
    },
  ]

  const getAdminItems = () => [
    {
      title: t('adminPages.overview'),
      url: "/admin",
      icon: Shield,
    },
    {
      title: t('adminPages.teamManagement'),
      url: "/admin/team-management",
      icon: Users,
    },
    {
      title: t('adminPages.settings'),
      url: "/admin/settings",
      icon: Settings,
    },
    {
      title: t('adminPages.components'),
      url: "/admin/components",
      icon: Settings,
    },
    {
      title: t('adminPages.holidays'),
      url: "/admin/holidays",
      icon: Calendar,
    },
    {
      title: t('adminPages.fixBalance'),
      url: "/admin/fix-balance",
      icon: Settings,
    },
    {
      title: t('adminPages.setupHolidays'),
      url: "/admin/setup-holidays",
      icon: CalendarDays,
    },
    {
      title: t('adminPages.testEmail'),
      url: "/admin/test-email",
      icon: Send,
    },
  ]

  const navSecondaryData = [
    {
      title: t('help'),
      url: "/help",
      icon: LifeBuoy,
    },
  ]

  // Get base navigation items (for all users)
  const baseNavigationItems = getBaseNavItems()

  // Check if user has manager/admin privileges
  const hasManagerAccess = userRole === 'manager' || userRole === 'admin'
  const hasAdminAccess = userRole === 'admin'

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="/dashboard">
                <div className="bg-primary text-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <GalleryVerticalEnd className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">
                    {organizationName || "Leave System"}
                  </span>
                  <span className="truncate text-xs text-sidebar-foreground/70">
                    Leave Management
                  </span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {/* Workspace Switcher */}
        <div className="px-2 py-2">
          <WorkspaceSwitcher 
            currentWorkspaceName={organizationName || "Leave System"} 
          />
        </div>
        
        {/* Base navigation without label */}
        <NavMain items={baseNavigationItems} />
        
        {/* Manager navigation with "Manager" label */}
        {hasManagerAccess && (
          <NavMain items={getManagerItems()} label={t('groups.manager')} />
        )}
        
        {/* Admin navigation */}
        {hasAdminAccess && (
          <NavMain items={getAdminItems()} label={t('groups.admin')} />
        )}
        
        <NavSecondary items={navSecondaryData} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userData} />
      </SidebarFooter>
    </Sidebar>
  )
}
