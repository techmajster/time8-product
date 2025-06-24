import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getBasicAuth } from '@/lib/auth-utils'

export async function GET(request: NextRequest) {
  try {
    // Use optimized auth utility
    const auth = await getBasicAuth()
    if (!auth.success) return auth.error
    const { organizationId } = auth

    const supabase = await createClient()

    // Get current date for filtering active schedules
    const today = new Date().toISOString().split('T')[0]

    // Get all schedules for the organization
    const { data: schedules, error: schedulesError } = await supabase
      .from('employee_schedules')
      .select('*')
      .eq('organization_id', organizationId)

    if (schedulesError) {
      console.error('Error fetching schedules:', schedulesError)
      return NextResponse.json({ 
        error: 'Failed to fetch schedules', 
        details: schedulesError.message,
        table: 'employee_schedules',
        organization_id: organizationId 
      }, { status: 500 })
    }

    // Log the actual structure of the employee_schedules table
    console.log('Sample employee_schedules data:', JSON.stringify(schedules, null, 2))
    if (schedules && schedules.length > 0) {
      console.log('Column names found:', Object.keys(schedules[0]))
    }

    // For now, just return all schedules without filtering until we understand the structure
    const latestSchedules = schedules || []

    console.log(`Found ${latestSchedules.length} active schedules for organization ${organizationId}`)
    console.log('Raw schedules found:', schedules?.length || 0)
    console.log('Organization ID:', organizationId)
    console.log('Today:', today)

    return NextResponse.json({
      schedules: latestSchedules,
      success: true,
      debug: {
        organization_id: organizationId,
        today: today,
        raw_schedules_count: schedules?.length || 0,
        active_schedules_count: latestSchedules.length
      }
    })

  } catch (error) {
    console.error('Weekly schedules API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
} 