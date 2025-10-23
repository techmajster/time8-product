import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PUT(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { organizationId, restrictCalendarByGroup } = await request.json()

    if (!organizationId || typeof restrictCalendarByGroup !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing required fields: organizationId and restrictCalendarByGroup' },
        { status: 400 }
      )
    }

    // Verify user is admin of the organization
    const { data: userOrg } = await supabase
      .from('user_organizations')
      .select('role')
      .eq('user_id', user.id)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .single()

    if (!userOrg || userOrg.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can change calendar visibility settings' },
        { status: 403 }
      )
    }

    // Update the organization's calendar restriction setting
    const { error: updateError } = await supabase
      .from('organizations')
      .update({ restrict_calendar_by_group: restrictCalendarByGroup })
      .eq('id', organizationId)

    if (updateError) {
      console.error('Error updating calendar restriction:', updateError)
      console.error('Error details:', JSON.stringify(updateError, null, 2))
      return NextResponse.json(
        {
          error: 'Failed to update calendar restriction setting',
          details: updateError.message || 'Unknown database error',
          hint: updateError.hint || 'The column might not exist in the database. Apply migration: 20251022000001_add_restrict_calendar_by_group.sql'
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      restrictCalendarByGroup
    })
  } catch (error) {
    console.error('Error in calendar restriction API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
