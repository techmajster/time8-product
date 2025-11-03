'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface LeaveRequestForCalendar {
  start_date: string
  end_date: string
  leave_type_name: string
  status: string
}

interface UseDisabledDatesOptions {
  userId: string | null
  organizationId: string
  excludeRequestId?: string // For editing: exclude the current request being edited
}

interface UseDisabledDatesResult {
  disabledDates: LeaveRequestForCalendar[]
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

/**
 * Hook to fetch leave requests for disabled dates in calendar
 * Fetches pending and approved leave requests for a specific user
 *
 * @param options - Configuration options
 * @param options.userId - The user ID to fetch leave requests for
 * @param options.organizationId - The organization ID to scope the query
 * @param options.excludeRequestId - Optional request ID to exclude (for editing)
 * @returns Object containing disabled dates, loading state, error, and refetch function
 */
export function useDisabledDates({
  userId,
  organizationId,
  excludeRequestId
}: UseDisabledDatesOptions): UseDisabledDatesResult {
  const [disabledDates, setDisabledDates] = useState<LeaveRequestForCalendar[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchDisabledDates = useCallback(async () => {
    if (!userId || !organizationId) {
      setDisabledDates([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      let query = supabase
        .from('leave_requests')
        .select(`
          id,
          start_date,
          end_date,
          status,
          leave_types (
            name
          )
        `)
        .eq('user_id', userId)
        .eq('organization_id', organizationId)
        .in('status', ['pending', 'approved'])

      // Exclude specific request if provided (for editing scenario)
      if (excludeRequestId) {
        query = query.neq('id', excludeRequestId)
      }

      const { data, error: queryError } = await query

      if (queryError) {
        throw queryError
      }

      // Transform data to LeaveRequestForCalendar format
      const formattedData: LeaveRequestForCalendar[] = (data || []).map(req => ({
        start_date: req.start_date,
        end_date: req.end_date,
        leave_type_name: req.leave_types?.name || 'Unknown',
        status: req.status
      }))

      setDisabledDates(formattedData)
    } catch (err) {
      console.error('Error fetching disabled dates:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch disabled dates'))
      setDisabledDates([])
    } finally {
      setIsLoading(false)
    }
  }, [userId, organizationId, excludeRequestId])

  useEffect(() => {
    fetchDisabledDates()
  }, [fetchDisabledDates])

  return {
    disabledDates,
    isLoading,
    error,
    refetch: fetchDisabledDates
  }
}
