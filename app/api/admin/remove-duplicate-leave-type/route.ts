import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getBasicAuth } from '@/lib/auth-utils'

export async function POST() {
  try {
    const supabase = await createClient()
    
    // Use optimized auth utility
    const auth = await getBasicAuth()
    if (!auth.success) return auth.error
    const { organizationId, role } = auth

    // Check if user is admin
    if (role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    console.log('🔧 Checking for duplicate "Urlop wychowawczy" leave type...')
    
    // Check if "Urlop wychowawczy" exists
    const { data: duplicateLeaveType } = await supabase
      .from('leave_types')
      .select('id, name')
      .eq('name', 'Urlop wychowawczy')
      .eq('organization_id', organizationId)
      .single()

    if (!duplicateLeaveType) {
      return NextResponse.json({ 
        success: true,
        message: 'No duplicate "Urlop wychowawczy" found - system is clean!'
      })
    }

    console.log('Found duplicate leave type:', duplicateLeaveType)

    // Check if there are any leave balances or requests using this leave type
    const { data: balances } = await supabase
      .from('leave_balances')
      .select('id')
      .eq('leave_type_id', duplicateLeaveType.id)

    const { data: requests } = await supabase
      .from('leave_requests')
      .select('id')
      .eq('leave_type_id', duplicateLeaveType.id)

    if (balances && balances.length > 0) {
      return NextResponse.json({ 
        error: `Cannot delete "Urlop wychowawczy" - it has ${balances.length} associated leave balances. Please contact support.`
      }, { status: 400 })
    }

    if (requests && requests.length > 0) {
      return NextResponse.json({ 
        error: `Cannot delete "Urlop wychowawczy" - it has ${requests.length} associated leave requests. Please contact support.`
      }, { status: 400 })
    }

    // Safe to delete - no associated data
    const { error: deleteError } = await supabase
      .from('leave_types')
      .delete()
      .eq('id', duplicateLeaveType.id)
      .eq('organization_id', organizationId)

    if (deleteError) {
      console.error('Delete error:', deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 400 })
    }

    console.log('Successfully removed duplicate leave type')

    return NextResponse.json({ 
      success: true,
      message: 'Successfully removed duplicate "Urlop wychowawczy" leave type',
      removed: duplicateLeaveType
    })

  } catch (error) {
    console.error('Error removing duplicate leave type:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 