import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
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

    // Get all team members from the organization
    const { data: teamMembers, error: teamError } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, avatar_url')
      .eq('organization_id', profile.organization_id)
      .order('full_name')

    if (teamError) {
      return NextResponse.json({ error: 'Failed to fetch team members' }, { status: 500 })
    }

    // Get all schedules for the organization
    const { data: schedules, error: schedulesError } = await supabase
      .from('employee_schedules')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .order('updated_at', { ascending: false })

    if (schedulesError) {
      return NextResponse.json({ error: 'Failed to fetch schedules' }, { status: 500 })
    }

    // Build employee schedule info
    const employeeScheduleInfo = teamMembers.map(member => {
      const memberSchedules = schedules.filter(s => s.user_id === member.id)
      
      return {
        employee: member,
        schedule_count: memberSchedules.length,
        recent_schedules: memberSchedules.slice(0, 10) // Get 10 most recent schedules
      }
    })

    return NextResponse.json({
      employees: employeeScheduleInfo,
      success: true
    })

  } catch (error) {
    console.error('Employee schedule info API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
} 