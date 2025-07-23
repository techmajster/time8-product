import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check Szymon's current role
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, organization_id')
      .eq('email', 'szymon.rajca@bb8.pl')
      .single()

    if (error) {
      console.error('Error checking user role:', error)
      return NextResponse.json({ error: 'Failed to check user role' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      user: data 
    })

  } catch (error) {
    console.error('Error in test user role:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 