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
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const data = {
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: Home,
      isActive: true,
    },
    {
      title: "Leave Requests",
      url: "/leave",
      icon: ClipboardList,
      items: [
        {
          title: "My Requests",
          url: "/leave",
        },
        {
          title: "New Request",
          url: "/leave/new",
        },
      ],
    },
    {
      title: "Calendar",
      url: "/calendar",
      icon: Calendar,
    },
    {
      title: "Team",
      url: "/team",
      icon: Users,
      items: [
        {
          title: "Team Members",
          url: "/team",
        },
        {
          title: "Invite Members",
          url: "/team/invite",
        },
      ],
    },
    {
      title: "Schedule",
      url: "/schedule",
      icon: Clock,
    },
    {
      title: "Profile",
      url: "/profile",
      icon: User,
    },
    {
      title: "Settings",
      url: "/settings",
      icon: Settings,
    },
  ],
  navSecondary: [
    {
      title: "Support",
      url: "#",
      icon: LifeBuoy,
    },
    {
      title: "Feedback",
      url: "#",
      icon: Send,
    },
  ],
}

// Add admin navigation for admin users
const getAdminNavItems = () => [
  {
    title: "Administration",
    url: "/admin",
    icon: Shield,
    items: [
      {
        title: "Overview",
        url: "/admin",
      },
      {
        title: "Holidays",
        url: "/admin/holidays",
      },
      {
        title: "Fix Balance",
        url: "/admin/fix-balance",
      },
      {
        title: "Setup Holidays",
        url: "/admin/setup-holidays",
      },
      {
        title: "Test Email",
        url: "/admin/test-email",
      },
    ],
  },
]

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  organizationName?: string | null
  organizationLogo?: string | null
  userProfile?: {
    full_name?: string | null
    email: string
    avatar_url?: string | null
  }
  userRole?: string
}

export function AppSidebar({ organizationName, organizationLogo, userProfile, userRole, ...props }: AppSidebarProps) {
  // Format user data for NavUser component
  const userData = {
    name: userProfile?.full_name || userProfile?.email?.split('@')[0] || 'User',
    email: userProfile?.email || '',
    avatar: userProfile?.avatar_url || ''
  }

  // Add admin navigation if user is admin
  const navigationItems = userRole === 'admin' 
    ? [...data.navMain, ...getAdminNavItems()]
    : data.navMain

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
        <NavMain items={navigationItems} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userData} />
      </SidebarFooter>
    </Sidebar>
  )
}
