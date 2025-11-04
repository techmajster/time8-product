import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { authenticateAndGetOrgContext } from '@/lib/auth-utils-v2'

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

    // Parse request body
    const body = await request.json()
    const { work_mode, working_days } = body

    // Validate work_mode
    if (!work_mode || !['monday_to_friday', 'multi_shift'].includes(work_mode)) {
      return NextResponse.json(
        { error: 'Invalid work_mode. Must be "monday_to_friday" or "multi_shift"' },
        { status: 400 }
      )
    }

    // Validate working_days (if provided)
    if (working_days) {
      if (!Array.isArray(working_days)) {
        return NextResponse.json(
          { error: 'working_days must be an array' },
          { status: 400 }
        )
      }

      const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
      const invalidDays = working_days.filter(day => !validDays.includes(day.toLowerCase()))

      if (invalidDays.length > 0) {
        return NextResponse.json(
          { error: `Invalid day names: ${invalidDays.join(', ')}` },
          { status: 400 }
        )
      }
    }

    const supabaseAdmin = await createAdminClient()

    // Update organization work mode
    const updateData: any = { work_mode }

    // Only update working_days if provided
    if (working_days) {
      // Normalize to lowercase
      updateData.working_days = working_days.map((day: string) => day.toLowerCase())
    }

    const { data, error } = await supabaseAdmin
      .from('organizations')
      .update(updateData)
      .eq('id', organization.id)
      .select()
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
      work_mode: data.work_mode,
      working_days: data.working_days
    })

    return NextResponse.json({
      success: true,
      data: {
        work_mode: data.work_mode,
        working_days: data.working_days
      }
    })

  } catch (error) {
    console.error('Error in work mode API:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
