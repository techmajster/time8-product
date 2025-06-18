import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile for organization_id and role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Check if user can manage schedules
    const canManage = profile.role === 'admin' || profile.role === 'manager'
    if (!canManage) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const {
      employee_id,
      start_date,
      end_date,
      shift_start_time,
      shift_end_time,
      is_working_day,
      notes,
      days_of_week
    } = body

    if (!employee_id || !start_date || !end_date || !days_of_week?.length) {
      return NextResponse.json({ 
        error: 'Missing required fields: employee_id, start_date, end_date, days_of_week' 
      }, { status: 400 })
    }

    // Verify employee belongs to organization
    const { data: employee, error: employeeError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', employee_id)
      .eq('organization_id', profile.organization_id)
      .single()

    if (employeeError || !employee) {
      return NextResponse.json({ error: 'Employee not found in organization' }, { status: 404 })
    }

    // Generate schedule entries for date range
    const scheduleEntries = []
    const start = new Date(start_date)
    const end = new Date(end_date)
    
    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      const dayOfWeek = date.getDay() // 0=Sunday, 1=Monday, etc.
      
      if (days_of_week.includes(dayOfWeek)) {
        const dateStr = date.toISOString().split('T')[0]
        
        scheduleEntries.push({
          user_id: employee_id,
          organization_id: profile.organization_id,
          date: dateStr,
          shift_start_time: is_working_day ? `${shift_start_time}:00` : null,
          shift_end_time: is_working_day ? `${shift_end_time}:00` : null,
          is_working_day,
          notes: notes || null,
          created_by: user.id,
          updated_at: new Date().toISOString()
        })
      }
    }

    if (scheduleEntries.length === 0) {
      return NextResponse.json({ 
        error: 'No schedule entries would be created for the selected parameters' 
      }, { status: 400 })
    }

    // Insert schedule entries
    const { data: createdSchedules, error: insertError } = await supabase
      .from('employee_schedules')
      .upsert(scheduleEntries, {
        onConflict: 'user_id,organization_id,date',
        ignoreDuplicates: false
      })
      .select()

    if (insertError) {
      console.error('Insert schedules error:', insertError)
      return NextResponse.json({ 
        error: 'Failed to create schedules',
        details: insertError.message
      }, { status: 500 })
    }

    return NextResponse.json({
      message: 'Custom schedule created successfully',
      schedules_created: scheduleEntries.length,
      date_range: { start_date, end_date },
      working_days: days_of_week,
      is_working_day
    })

  } catch (error) {
    console.error('Create custom schedule API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
} 