"use client"

import {
  ChevronsUpDown,
  LogOut,
  User,
  Languages,
  Moon,
  Sun,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useTranslations, useLocale } from 'next-intl'
import { useTheme } from "next-themes"
import { useState, useTransition } from 'react'
import { type Locale } from '@/lib/i18n-utils'
import { toast } from 'sonner'

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { Switch } from "@/components/ui/switch"

const languages = [
  { 
    code: 'pl' as Locale, 
    name: 'Polski', 
    flag: '🇵🇱',
    englishName: 'Polish'
  },
  { 
    code: 'en' as Locale, 
    name: 'English', 
    flag: '🇬🇧',
    englishName: 'English'
  },
];

export function NavUser({
  user,
}: {
  user: {
    name: string
    email: string
    avatar: string
    role?: string
  }
}) {
  const { isMobile } = useSidebar()
  const router = useRouter()
  const t = useTranslations('navigation')
  const locale = useLocale() as Locale
  const { theme, setTheme } = useTheme()
  const [isPending, startTransition] = useTransition()

  // Generate initials from name or email
  const getInitials = (name: string, email: string) => {
    if (name && name !== email.split('@')[0]) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    }
    return email.slice(0, 2).toUpperCase()
  }

  const initials = getInitials(user.name, user.email)

  const handleSignOut = async () => {
    try {
      await fetch('/api/logout', { method: 'POST' })
      router.push('/login')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const switchLanguage = async (newLocale: Locale) => {
    if (newLocale === locale) return;

    startTransition(async () => {
      try {
        const response = await fetch('/api/locale', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ locale: newLocale }),
        });

        if (response.ok) {
          const languageName = languages.find(l => l.code === newLocale)?.name;
          toast.success(`Language changed to ${languageName}`);
          router.refresh();
        } else {
          toast.error('Failed to change language');
        }
      } catch (error) {
        console.error('Failed to switch language:', error);
        toast.error('Failed to change language');
      }
    });
  };

  const isDarkMode = theme === 'dark'

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                <span className="truncate text-xs">{user.email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            {/* Dark Mode Toggle */}
            <DropdownMenuItem className="flex items-center justify-between">
              <div className="flex items-center">
                {isDarkMode ? <Moon className="h-4 w-4 mr-2" /> : <Sun className="h-4 w-4 mr-2" />}
                Tryb ciemny
              </div>
              <Switch
                checked={isDarkMode}
                onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
              />
            </DropdownMenuItem>

            {/* Language Switcher */}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Languages className="h-4 w-4 mr-2" />
                Język
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {languages.map((language) => (
                  <DropdownMenuItem
                    key={language.code}
                    onClick={() => switchLanguage(language.code)}
                    disabled={isPending}
                    className="cursor-pointer"
                  >
                    <span className="mr-2">{language.flag}</span>
                    {language.name}
                    {language.code === locale && (
                      <span className="ml-auto text-xs opacity-60">✓</span>
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            <DropdownMenuSeparator />

            {/* My Profile - accessible to all users */}
            <DropdownMenuItem onClick={() => router.push('/profile')}>
              <User className="h-4 w-4 mr-2" />
              Mój profil
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {/* Sign Out */}
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Wyloguj się
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
