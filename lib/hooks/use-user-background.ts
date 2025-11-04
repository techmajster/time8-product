'use client'

import { useEffect, useState } from 'react'

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
      try {
        const response = await fetch('/api/user/active-leave')

        if (!response.ok) {
          // No active leave or error
          setBackgroundState('default')
          return
        }

        const activeLeave = await response.json()

        if (activeLeave && activeLeave.leave_type_name) {
          const leaveType = activeLeave.leave_type_name
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
      } catch (error) {
        console.error('Error checking user leave status:', error)
        setBackgroundState('default')
      }
    }

    checkUserLeaveStatus()
  }, [])

  return { backgroundState, leaveTypeName, endDate }
}
