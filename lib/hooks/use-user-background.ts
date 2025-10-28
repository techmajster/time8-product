'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export type UserBackgroundState = 'default' | 'vacation' | 'sick-leave'

interface UserLeaveStatus {
  backgroundState: UserBackgroundState
  leaveTypeName?: string
  endDate?: string
}

export function useUserBackground(): UserLeaveStatus {
  const [backgroundState, setBackgroundState] = useState<UserBackgroundState>('default')
  const [leaveTypeName, setLeaveTypeName] = useState<string | undefined>()
  const [endDate, setEndDate] = useState<string | undefined>()

  useEffect(() => {
    async function checkUserLeaveStatus() {
      const supabase = createClient()

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const todayDate = new Date().toISOString().split('T')[0]

      // Check if user has an approved leave request active today
      const { data: activeLeave } = await supabase
        .from('leave_requests')
        .select(`
          id,
          end_date,
          leave_types (
            name
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .lte('start_date', todayDate)
        .gte('end_date', todayDate)
        .single()

      if (activeLeave && activeLeave.leave_types) {
        const leaveType = activeLeave.leave_types.name
        setLeaveTypeName(leaveType)
        setEndDate(activeLeave.end_date)

        // Determine background based on leave type name
        if (leaveType === 'Urlop wypoczynkowy' || leaveType.toLowerCase().includes('urlop')) {
          setBackgroundState('vacation')
        } else if (leaveType === 'Zwolnienie lekarskie' || leaveType.toLowerCase().includes('zwolnienie')) {
          setBackgroundState('sick-leave')
        } else {
          // For other leave types, default to vacation background
          setBackgroundState('vacation')
        }
      } else {
        // No active leave - default working day
        setBackgroundState('default')
      }
    }

    checkUserLeaveStatus()
  }, [])

  return { backgroundState, leaveTypeName, endDate }
}
