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