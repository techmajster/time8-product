'use client'

import { useEffect, useState, useRef } from 'react'
import { useTheme } from 'next-themes'
import { createClient } from '@/lib/supabase/client'

export function useUserTheme(userId?: string) {
  const { setTheme, theme } = useTheme()
  const [isLoading, setIsLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const hasLoadedInitialTheme = useRef(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!userId || !mounted || hasLoadedInitialTheme.current) {
      setIsLoading(false)
      return
    }

    const loadUserThemePreference = async () => {
      try {
        // Check if user has already chosen a theme via next-themes
        // next-themes stores the theme preference in localStorage as 'theme'
        const nextThemesChoice = typeof window !== 'undefined' 
          ? localStorage.getItem('theme') 
          : null

        if (nextThemesChoice && nextThemesChoice !== 'system') {
          // User has already made a manual theme choice via ThemeToggle
          // Don't override it with database preference
          console.log('Respecting existing next-themes choice:', nextThemesChoice)
          hasLoadedInitialTheme.current = true
          setIsLoading(false)
          return
        }

        const supabase = createClient()
        
        // Only load from database if user hasn't made a manual choice
        const { data: settings, error } = await supabase
          .from('user_settings')
          .select('dark_mode')
          .eq('user_id', userId)
          .single()

        if (!error && settings && !nextThemesChoice) {
          // Only apply database preference if no theme is set
          const newTheme = settings.dark_mode ? 'dark' : 'light'
          console.log('Loading database theme preference:', newTheme)
          setTheme(newTheme)
          hasLoadedInitialTheme.current = true
        } else {
          // No saved preference or user already has theme set
          hasLoadedInitialTheme.current = true
        }
      } catch (error) {
        console.error('Error loading user theme preference:', error)
        hasLoadedInitialTheme.current = true
      } finally {
        setIsLoading(false)
      }
    }

    loadUserThemePreference()
  }, [userId, setTheme, mounted])

  const updateUserTheme = async (darkMode: boolean) => {
    if (!userId) return

    try {
      const supabase = createClient()
      
      // Update the theme immediately for responsive UI
      const newTheme = darkMode ? 'dark' : 'light'
      console.log('Updating user theme to:', newTheme)
      setTheme(newTheme)

      // Save to database but don't interfere with next-themes localStorage
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: userId,
          dark_mode: darkMode,
          // Include other default settings in case this is the first time
          email_notifications: true,
          push_notifications: false,
          leave_request_reminders: true,
          team_leave_notifications: true,
          weekly_summary: true,
          timezone: 'Europe/Warsaw',
          language: 'pl',
          date_format: 'DD/MM/YYYY'
        }, {
          onConflict: 'user_id'
        })

      if (error) {
        console.error('Error updating user theme:', error)
        // Revert theme if database update failed
        setTheme(darkMode ? 'light' : 'dark')
        throw error
      }
    } catch (error) {
      console.error('Failed to update user theme:', error)
      throw error
    }
  }

  return {
    isLoading,
    updateUserTheme
  }
} 