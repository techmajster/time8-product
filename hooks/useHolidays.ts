import { useQuery } from '@tanstack/react-query'

export interface Holiday {
  id: string
  name: string
  date: string
  type: string
  description?: string | null
  organization_id?: string | null
  country_code?: string | null
}

interface UseHolidaysOptions {
  organizationId: string
  countryCode?: string
  startDate?: string
  endDate?: string
}

// Query keys for cache management
export const holidayKeys = {
  all: ['holidays'] as const,
  byOrg: (orgId: string, country: string) =>
    [...holidayKeys.all, orgId, country] as const,
  range: (orgId: string, country: string, start: string, end: string) =>
    [...holidayKeys.byOrg(orgId, country), start, end] as const,
}

/**
 * Hook to fetch holidays using React Query
 * Provides automatic caching and request deduplication across components
 *
 * @param options - Configuration options
 * @param options.organizationId - The organization ID
 * @param options.countryCode - The country code (defaults to 'PL')
 * @param options.startDate - Start date in YYYY-MM-DD format (optional)
 * @param options.endDate - End date in YYYY-MM-DD format (optional)
 * @returns Query result with holidays data, loading state, and error
 */
export function useHolidays({
  organizationId,
  countryCode = 'PL',
  startDate,
  endDate
}: UseHolidaysOptions) {
  // Calculate default date range if not provided (current year + next year)
  const today = new Date()
  const defaultStartDate = startDate || `${today.getFullYear()}-01-01`
  const defaultEndDate = endDate || `${today.getFullYear() + 1}-12-31`

  return useQuery({
    queryKey: holidayKeys.range(
      organizationId,
      countryCode,
      defaultStartDate,
      defaultEndDate
    ),
    queryFn: async () => {
      const params = new URLSearchParams({
        start_date: defaultStartDate,
        end_date: defaultEndDate,
        country_code: countryCode
      })

      const response = await fetch(`/api/calendar/holidays?${params}`)

      if (!response.ok) {
        throw new Error('Failed to fetch holidays')
      }

      const data = await response.json()
      return data as Holiday[]
    },
    staleTime: 1000 * 60 * 30, // 30 minutes (holidays rarely change)
    gcTime: 1000 * 60 * 60,    // 1 hour in cache
    enabled: !!organizationId,
  })
}
