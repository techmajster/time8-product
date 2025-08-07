import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const supabaseAdmin = await createAdminClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    console.log('🔍 Calendar holidays API auth check:', {
      user: user ? { id: user.id, email: user.email } : null,
      authError: authError ? authError.message : null
    })

    if (!user) {
      console.error('❌ Calendar holidays API: No authenticated user')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const { data: userOrg, error: orgError } = await supabase
      .from('user_organizations')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .eq('is_default', true)
      .single()

    console.log('🔍 Calendar holidays API org check:', { userOrg, orgError })

    if (!userOrg) {
      console.error('❌ Calendar holidays API: No organization found for user')
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Get URL parameters
    const searchParams = request.nextUrl.searchParams
    const year = searchParams.get('year')
    const month = searchParams.get('month')
    const countryCode = searchParams.get('country_code') || 'PL'

    if (!year || !month) {
      return NextResponse.json({ error: 'Year and month parameters are required' }, { status: 400 })
    }

    const startDate = `${year}-${month.padStart(2, '0')}-01`
    // Get the last day of the month properly
    const lastDayOfMonth = new Date(parseInt(year), parseInt(month), 0).getDate()
    const endDate = `${year}-${month.padStart(2, '0')}-${lastDayOfMonth.toString().padStart(2, '0')}`

    // Fetch holidays using admin client to bypass RLS
    const { data: holidays, error } = await supabaseAdmin
      .from('company_holidays')
      .select('*')
      .or(`organization_id.eq.${userOrg.organization_id},and(type.eq.national,organization_id.is.null,country_code.eq.${countryCode})`)
      .gte('date', startDate)
      .lte('date', endDate)

    if (error) {
      console.error('Error fetching holidays:', error)
      return NextResponse.json({ error: 'Failed to fetch holidays' }, { status: 500 })
    }

    return NextResponse.json(holidays || [])

  } catch (error) {
    console.error('Error in calendar holidays API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}