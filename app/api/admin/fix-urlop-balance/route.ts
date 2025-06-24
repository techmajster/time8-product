import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, organization_id')
      .eq('id', user.id)
      .single()

    if (profileError || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    console.log('🔧 Checking current "Urlop na żądanie" balances...')
    
    // Get current state
    const { data: beforeState } = await supabase
      .from('leave_balances')
      .select(`
        id,
        used_days,
        entitled_days,
        remaining_days,
        leave_types!inner(name),
        profiles!inner(email)
      `)
      .eq('leave_types.name', 'Urlop na żądanie')
      .eq('organization_id', profile.organization_id)
    
    console.log('Before fix:', beforeState)

    // Get the leave type ID for "Urlop na żądanie"
    const { data: leaveType } = await supabase
      .from('leave_types')
      .select('id')
      .eq('name', 'Urlop na żądanie')
      .eq('organization_id', profile.organization_id)
      .single()

    if (!leaveType) {
      return NextResponse.json({ error: 'Leave type not found' }, { status: 404 })
    }

    // Fix balances where used_days > 4 by setting to 4
    const { data: updated, error: updateError } = await supabase
      .from('leave_balances')
      .update({ used_days: 4 })
      .eq('leave_type_id', leaveType.id)
      .eq('organization_id', profile.organization_id)
      .gt('used_days', 4)
      .select(`
        id,
        used_days,
        entitled_days,
        remaining_days,
        leave_types!inner(name),
        profiles!inner(email)
      `)

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }

    console.log('Updated balances:', updated)

    // Get final state
    const { data: afterState } = await supabase
      .from('leave_balances')
      .select(`
        id,
        used_days,
        entitled_days,
        remaining_days,
        leave_types!inner(name),
        profiles!inner(email)
      `)
      .eq('leave_types.name', 'Urlop na żądanie')
      .eq('organization_id', profile.organization_id)

    console.log('After fix:', afterState)

    return NextResponse.json({ 
      success: true,
      message: `Fixed ${updated?.length || 0} "Urlop na żądanie" balances`,
      before: beforeState,
      updated: updated,
      after: afterState
    })

  } catch (error) {
    console.error('Error fixing balances:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 