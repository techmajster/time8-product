import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // EMERGENCY: Restore admin access for Szymon and Dajana
    const { data: szymonUpdate, error: szymonError } = await supabase
      .from('profiles')
      .update({ role: 'admin' })
      .eq('email', 'szymon.rajca@bb8.pl')
      .select()

    if (szymonError) {
      console.error('Error fixing Szymon:', szymonError)
    }

    const { data: dajanaUpdate, error: dajanaError } = await supabase
      .from('profiles')
      .update({ role: 'admin' })
      .eq('email', 'dajana.bieganowska@bb8.pl')
      .select()

    if (dajanaError) {
      console.error('Error fixing Dajana:', dajanaError)
    }

    // Check current admin status
    const { data: admins, error: checkError } = await supabase
      .from('profiles')
      .select('id, email, full_name, role')
      .eq('role', 'admin')
      .order('email')

    if (checkError) {
      console.error('Error checking admins:', checkError)
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Emergency admin fix applied',
      szymonFixed: !szymonError,
      dajanaFixed: !dajanaError,
      currentAdmins: admins || []
    })

  } catch (error) {
    console.error('Error in emergency fix:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 