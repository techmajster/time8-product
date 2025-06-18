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

    // Get user profile for organization_id and role check
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Only allow admin to create default templates
    if (profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Check if templates already exist
    const { data: existingTemplates } = await supabase
      .from('work_schedule_templates')
      .select('id')
      .eq('organization_id', profile.organization_id)

    if (existingTemplates && existingTemplates.length > 0) {
      return NextResponse.json({ 
        message: 'Templates already exist',
        existing_count: existingTemplates.length
      })
    }

    // Create default templates
    const defaultTemplates = [
      {
        organization_id: profile.organization_id,
        name: 'Standardowy 9-17',
        description: 'Standardowy harmonogram biurowy, poniedziałek-piątek 9:00-17:00',
        schedule_type: 'fixed',
        is_default: true,
        monday_start: '09:00:00',
        monday_end: '17:00:00',
        monday_is_working: true,
        tuesday_start: '09:00:00',
        tuesday_end: '17:00:00',
        tuesday_is_working: true,
        wednesday_start: '09:00:00',
        wednesday_end: '17:00:00',
        wednesday_is_working: true,
        thursday_start: '09:00:00',
        thursday_end: '17:00:00',
        thursday_is_working: true,
        friday_start: '09:00:00',
        friday_end: '17:00:00',
        friday_is_working: true,
        saturday_start: null,
        saturday_end: null,
        saturday_is_working: false,
        sunday_start: null,
        sunday_end: null,
        sunday_is_working: false,
      },
      {
        organization_id: profile.organization_id,
        name: 'Wczesna zmiana 6-14',
        description: 'Wczesna zmiana, poniedziałek-piątek 6:00-14:00',
        schedule_type: 'shift',
        is_default: false,
        monday_start: '06:00:00',
        monday_end: '14:00:00',
        monday_is_working: true,
        tuesday_start: '06:00:00',
        tuesday_end: '14:00:00',
        tuesday_is_working: true,
        wednesday_start: '06:00:00',
        wednesday_end: '14:00:00',
        wednesday_is_working: true,
        thursday_start: '06:00:00',
        thursday_end: '14:00:00',
        thursday_is_working: true,
        friday_start: '06:00:00',
        friday_end: '14:00:00',
        friday_is_working: true,
        saturday_start: null,
        saturday_end: null,
        saturday_is_working: false,
        sunday_start: null,
        sunday_end: null,
        sunday_is_working: false,
      },
      {
        organization_id: profile.organization_id,
        name: 'Późna zmiana 14-22',
        description: 'Późna zmiana, poniedziałek-piątek 14:00-22:00',
        schedule_type: 'shift',
        is_default: false,
        monday_start: '14:00:00',
        monday_end: '22:00:00',
        monday_is_working: true,
        tuesday_start: '14:00:00',
        tuesday_end: '22:00:00',
        tuesday_is_working: true,
        wednesday_start: '14:00:00',
        wednesday_end: '22:00:00',
        wednesday_is_working: true,
        thursday_start: '14:00:00',
        thursday_end: '22:00:00',
        thursday_is_working: true,
        friday_start: '14:00:00',
        friday_end: '22:00:00',
        friday_is_working: true,
        saturday_start: null,
        saturday_end: null,
        saturday_is_working: false,
        sunday_start: null,
        sunday_end: null,
        sunday_is_working: false,
      },
      {
        organization_id: profile.organization_id,
        name: 'Weekendowy 7 dni',
        description: 'Harmonogram 7 dni w tygodniu, 8:00-16:00',
        schedule_type: 'shift',
        is_default: false,
        monday_start: '08:00:00',
        monday_end: '16:00:00',
        monday_is_working: true,
        tuesday_start: '08:00:00',
        tuesday_end: '16:00:00',
        tuesday_is_working: true,
        wednesday_start: '08:00:00',
        wednesday_end: '16:00:00',
        wednesday_is_working: true,
        thursday_start: '08:00:00',
        thursday_end: '16:00:00',
        thursday_is_working: true,
        friday_start: '08:00:00',
        friday_end: '16:00:00',
        friday_is_working: true,
        saturday_start: '08:00:00',
        saturday_end: '16:00:00',
        saturday_is_working: true,
        sunday_start: '08:00:00',
        sunday_end: '16:00:00',
        sunday_is_working: true,
      }
    ]

    const { data: createdTemplates, error: createError } = await supabase
      .from('work_schedule_templates')
      .insert(defaultTemplates)
      .select()

    if (createError) {
      console.error('Create templates error:', createError)
      return NextResponse.json({ 
        error: 'Failed to create templates',
        details: createError.message
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Successfully created ${createdTemplates.length} default schedule templates`,
      templates: createdTemplates
    })

  } catch (error) {
    console.error('Create default templates API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
} 