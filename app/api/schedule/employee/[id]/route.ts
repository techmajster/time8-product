import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile for organization_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const resolvedParams = await params
    const employeeId = resolvedParams.id

    // Verify the employee belongs to the organization
    const { data: employee, error: employeeError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('id', employeeId)
      .eq('organization_id', profile.organization_id)
      .single()

    if (employeeError || !employee) {
      return NextResponse.json({ error: 'Employee not found or not in organization' }, { status: 404 })
    }

    // Get all schedules for this employee
    const { data: schedules, error: schedulesError } = await supabase
      .from('employee_schedules')
      .select('*')
      .eq('user_id', employeeId)
      .eq('organization_id', profile.organization_id)
      .order('date', { ascending: false })

    if (schedulesError) {
      console.error('Get schedules error:', schedulesError)
      return NextResponse.json({ 
        error: 'Failed to get schedules',
        details: schedulesError.message
      }, { status: 500 })
    }

    return NextResponse.json({
      schedules: schedules || [],
      employee_name: employee.full_name,
      total_count: schedules?.length || 0
    })

  } catch (error) {
    console.error('Get employee schedules API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile for organization_id and role check
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Only allow admin/manager to delete schedules
    if (profile.role !== 'admin' && profile.role !== 'manager') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const resolvedParams = await params
    const employeeId = resolvedParams.id

    // Verify the employee belongs to the organization
    const { data: employee, error: employeeError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('id', employeeId)
      .eq('organization_id', profile.organization_id)
      .single()

    if (employeeError || !employee) {
      return NextResponse.json({ error: 'Employee not found or not in organization' }, { status: 404 })
    }

    // Delete all schedules for this employee
    const { error: deleteError, count } = await supabase
      .from('employee_schedules')
      .delete({ count: 'exact' })
      .eq('user_id', employeeId)
      .eq('organization_id', profile.organization_id)

    if (deleteError) {
      console.error('Delete schedules error:', deleteError)
      return NextResponse.json({ 
        error: 'Failed to delete schedules',
        details: deleteError.message
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${count || 0} schedules for ${employee.full_name}`,
      schedules_deleted: count || 0,
      employee_name: employee.full_name
    })

  } catch (error) {
    console.error('Delete employee schedules API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
} 