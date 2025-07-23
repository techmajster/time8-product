import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getBasicAuth } from '@/lib/auth-utils'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Fix Szymon's role
    const { data, error } = await supabase
      .from('profiles')
      .update({ role: 'admin' })
      .eq('email', 'szymon.rajca@bb8.pl')
      .select()

    if (error) {
      console.error('Error fixing admin role:', error)
      return NextResponse.json({ error: 'Failed to fix admin role' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Admin role fixed',
      data 
    })

  } catch (error) {
    console.error('Error in fix admin role:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 