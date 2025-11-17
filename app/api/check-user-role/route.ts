import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const email = searchParams.get('email') || 'szymon.rajca@bb8.pl'

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    // Get user by email
    const { data: users } = await supabase.auth.admin.listUsers()
    const user = users.users.find(u => u.email === email)

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get user organizations and roles
    const { data: userOrgs, error } = await supabase
      .from('user_organizations')
      .select(`
        role,
        is_active,
        is_default,
        organization_id,
        organizations (
          id,
          name,
          country_code,
          locale,
          work_mode,
          working_days,
          exclude_public_holidays,
          daily_start_time,
          daily_end_time,
          work_schedule_type,
          shift_count,
          work_shifts
        )
      `)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at
      },
      organizations: userOrgs || []
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
