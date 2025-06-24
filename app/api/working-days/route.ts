import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getBasicAuth } from '@/lib/auth-utils'

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const auth = await getBasicAuth()
    if (!auth.success) {
      return auth.error
    }

    const { organizationId } = auth
    const supabase = await createClient()

    const { startDate, endDate } = await request.json()

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Start date and end date are required' },
        { status: 400 }
      )
    }

    // Validate date format
    const start = new Date(startDate)
    const end = new Date(endDate)

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      )
    }

    if (start > end) {
      return NextResponse.json(
        { error: 'Start date cannot be after end date' },
        { status: 400 }
      )
    }

    // Call the database function to calculate working days with holidays
    const { data, error } = await supabase.rpc('calculate_working_days_with_holidays', {
      start_date: startDate,
      end_date: endDate,
      organization_id: organizationId
    })

    if (error) {
      console.error('Error calculating working days:', error)
      
      // Fallback calculation if database function fails
      const { data: holidaysCheck } = await supabase
        .from('company_holidays')
        .select('name, date, type')
        .gte('date', startDate)
        .lte('date', endDate)
        .eq('type', 'national')
        .order('date')
      
      const fallbackDays = calculateWorkingDaysFallback(startDate, endDate, holidaysCheck || [])
      
      return NextResponse.json({
        working_days: fallbackDays,
        start_date: startDate,
        end_date: endDate,
        holidays_in_period: holidaysCheck || [],
        organization_id: organizationId,
        calculation_method: 'fallback',
        error_details: error,
        warning: 'Used fallback calculation due to database function error'
      })
    }

    // Get organization's country code for filtering
    const { data: orgData } = await supabase
      .from('organizations')
      .select('country_code')
      .eq('id', organizationId)
      .single()

    const countryCode = orgData?.country_code || 'PL'

    // Get holidays in the period for display (filtered by country)
    const { data: holidays } = await supabase
      .from('company_holidays')
      .select('name, date, type, country_code')
      .gte('date', startDate)
      .lte('date', endDate)
      .or(`organization_id.eq.${organizationId},and(type.eq.national,country_code.eq.${countryCode})`)
      .order('date')

    return NextResponse.json({
      working_days: data,
      start_date: startDate,
      end_date: endDate,
      holidays_in_period: holidays || [],
      organization_id: organizationId,
      calculation_method: 'database_function',
      calculation_includes: {
        weekends_excluded: true,
        national_holidays_excluded: true,
        organization_holidays_excluded: true
      }
    })

  } catch (error) {
    console.error('Working days calculation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Fallback function for client-side calculation
function calculateWorkingDaysFallback(startDate: string, endDate: string, holidays: Array<{ date: string; name: string; type: string }>): number {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const holidayDates = new Set(holidays.map(h => h.date))
  
  let workingDays = 0
  const currentDate = new Date(start)

  while (currentDate <= end) {
    const dayOfWeek = currentDate.getDay()
    const dateString = currentDate.toISOString().split('T')[0]
    
    // Count Monday (1) through Friday (5), excluding holidays
    if (dayOfWeek >= 1 && dayOfWeek <= 5 && !holidayDates.has(dateString)) {
      workingDays++
    }
    currentDate.setDate(currentDate.getDate() + 1)
  }

  return workingDays
} 