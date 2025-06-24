import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
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

    const body = await request.json()
    const { user_id, leave_type_id, year, allocated_days, action } = body

    if (action === 'create') {
      // Create new leave balance
      const { data, error } = await supabase
        .from('leave_balances')
        .insert({
          user_id,
          leave_type_id,
          year,
          entitled_days: allocated_days,
          used_days: 0,
          organization_id: profile.organization_id
        })
        .select()

      if (error) {
        console.error('Database error:', error)
        return NextResponse.json({ error: error.message }, { status: 400 })
      }

      return NextResponse.json({ success: true, data })
    }

    if (action === 'update') {
      // Update existing leave balance
      const { balance_id } = body
      
      const { data, error } = await supabase
        .from('leave_balances')
        .update({
          entitled_days: allocated_days
        })
        .eq('id', balance_id)
        .eq('organization_id', profile.organization_id)
        .select()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }

      return NextResponse.json({ success: true, data })
    }

    if (action === 'create_defaults_for_user') {
      // Create default leave balances for a specific user (useful when new users join)
      const { target_user_id, target_year = new Date().getFullYear() } = body
      
      // Get leave types that require balance tracking and have days allocated
      // Exclude child-specific leave types that should be manually assigned
      const { data: leaveTypes, error: leaveTypesError } = await supabase
        .from('leave_types')
        .select('id, days_per_year, name, leave_category')
        .eq('organization_id', profile.organization_id)
        .eq('requires_balance', true)
        .gt('days_per_year', 0)
        .not('leave_category', 'in', '(maternity,paternity,childcare)')

      if (leaveTypesError) {
        return NextResponse.json({ error: leaveTypesError.message }, { status: 400 })
      }

      if (!leaveTypes || leaveTypes.length === 0) {
        return NextResponse.json({ message: 'No leave types found that require balance tracking' })
      }

      // Check if balances already exist for this user/year
      const { data: existingBalances } = await supabase
        .from('leave_balances')
        .select('leave_type_id')
        .eq('user_id', target_user_id)
        .eq('year', target_year)
        .eq('organization_id', profile.organization_id)

      const existingLeaveTypeIds = existingBalances?.map(b => b.leave_type_id) || []
      const newBalances = leaveTypes
        .filter(lt => !existingLeaveTypeIds.includes(lt.id))
        .map(lt => ({
          user_id: target_user_id,
          leave_type_id: lt.id,
          year: target_year,
          entitled_days: lt.days_per_year,
          used_days: 0,
          organization_id: profile.organization_id
        }))

      if (newBalances.length === 0) {
        return NextResponse.json({ message: 'User already has all required leave balances' })
      }

      const { data, error } = await supabase
        .from('leave_balances')
        .insert(newBalances)
        .select()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }

      return NextResponse.json({ 
        success: true, 
        data, 
        message: `Created ${newBalances.length} leave balances for user` 
      })
    }

    if (action === 'create_defaults_for_all_users') {
      // Create default leave balances for ALL users in the organization
      const { target_year = new Date().getFullYear() } = body
      
      console.log('Creating missing balances for organization:', profile.organization_id, 'year:', target_year)
      
      // Get all users in organization
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('organization_id', profile.organization_id)

      if (usersError) {
        console.error('Error fetching users:', usersError)
        return NextResponse.json({ error: usersError.message }, { status: 400 })
      }

      // Get leave types that require balance tracking and have days allocated
      const { data: leaveTypes, error: leaveTypesError } = await supabase
        .from('leave_types')
        .select('id, days_per_year, name, leave_category')
        .eq('organization_id', profile.organization_id)
        .eq('requires_balance', true)
        .gt('days_per_year', 0)
        .not('leave_category', 'in', '(maternity,paternity,childcare)')

      if (leaveTypesError) {
        console.error('Error fetching leave types:', leaveTypesError)
        return NextResponse.json({ error: leaveTypesError.message }, { status: 400 })
      }

      console.log('Found users:', users?.length, 'leave types:', leaveTypes?.length)

      if (!users || users.length === 0) {
        return NextResponse.json({ message: 'No users found in organization' })
      }

      if (!leaveTypes || leaveTypes.length === 0) {
        return NextResponse.json({ message: 'No leave types found that require balance tracking' })
      }

      // Get existing balances for this year
      const { data: existingBalances, error: existingError } = await supabase
        .from('leave_balances')
        .select('user_id, leave_type_id')
        .eq('organization_id', profile.organization_id)
        .eq('year', target_year)

      if (existingError) {
        console.error('Error fetching existing balances:', existingError)
        return NextResponse.json({ error: existingError.message }, { status: 400 })
      }

      // Build list of missing balances
      const missingBalances: Array<{
        user_id: string
        leave_type_id: string
        organization_id: string
        year: number
        entitled_days: number
        used_days: number
      }> = []

      users.forEach(user => {
        leaveTypes.forEach(leaveType => {
          const hasBalance = existingBalances?.some(
            balance => balance.user_id === user.id && balance.leave_type_id === leaveType.id
          )
          if (!hasBalance) {
            missingBalances.push({
              user_id: user.id,
              leave_type_id: leaveType.id,
              organization_id: profile.organization_id,
              year: target_year,
              entitled_days: leaveType.days_per_year,
              used_days: 0
            })
          }
        })
      })

      console.log('Missing balances to create:', missingBalances.length)

      if (missingBalances.length === 0) {
        return NextResponse.json({ 
          success: true,
          message: 'All users already have required leave balances',
          data: []
        })
      }

      // Insert missing balances
      const { data: insertResult, error: insertError } = await supabase
        .from('leave_balances')
        .insert(missingBalances)
        .select()

      if (insertError) {
        console.error('Error inserting balances:', insertError)
        return NextResponse.json({ error: insertError.message }, { status: 400 })
      }

      console.log('Successfully created balances:', insertResult?.length)

      return NextResponse.json({ 
        success: true, 
        message: `Created ${insertResult?.length || 0} missing leave balances`,
        data: insertResult
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
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

    const url = new URL(request.url)
    const balance_id = url.searchParams.get('id')

    if (!balance_id) {
      return NextResponse.json({ error: 'Balance ID required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('leave_balances')
      .delete()
      .eq('id', balance_id)
      .eq('organization_id', profile.organization_id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 