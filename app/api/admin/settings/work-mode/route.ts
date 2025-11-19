import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { authenticateAndGetOrgContext } from '@/lib/auth-utils-v2'
import { validateWorkModePayload, WorkModeValidationError } from '@/lib/validations/work-mode'

export async function POST(request: NextRequest) {
  try {
    // Authenticate and get organization context
    const auth = await authenticateAndGetOrgContext()
    if (!auth.success) {
      console.error('❌ Work mode API: Authentication failed')
      return auth.error
    }

    const { context } = auth
    const { organization, role } = context

    // Only admins can update work mode
    if (role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can update work mode settings' },
        { status: 403 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const config = validateWorkModePayload(body)

    const supabaseAdmin = await createAdminClient()

    // Update organization work mode and schedule config
    const { data, error } = await supabaseAdmin
      .from('organizations')
      .update({
        working_days: config.workingDays,
        exclude_public_holidays: config.excludePublicHolidays,
        daily_start_time: config.dailyStartTime,
        daily_end_time: config.dailyEndTime,
        work_schedule_type: config.workScheduleType,
        shift_count: config.shiftCount,
        work_shifts: config.workShifts
      })
      .eq('id', organization.id)
      .select(`
        id,
        name,
        working_days,
        exclude_public_holidays,
        daily_start_time,
        daily_end_time,
        work_schedule_type,
        shift_count,
        work_shifts
      `)
      .single()

    if (error) {
      console.error('❌ Database error updating work mode:', error)
      return NextResponse.json(
        { error: 'Failed to update work mode', details: error.message },
        { status: 500 }
      )
    }

    console.log('✅ Work mode updated successfully:', {
      organizationId: organization.id,
      work_schedule_type: data.work_schedule_type,
      working_days: data.working_days
    })

    return NextResponse.json({
      success: true,
      data
    })

  } catch (error) {
    if (error instanceof WorkModeValidationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      )
    }

    console.error('Error in work mode API:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
