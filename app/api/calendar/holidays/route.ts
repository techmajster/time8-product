import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { authenticateAndGetOrgContext } from '@/lib/auth-utils-v2'

export async function GET(request: NextRequest) {
  try {
    // REFACTOR: Use standard auth pattern for workspace isolation
    const auth = await authenticateAndGetOrgContext()
    if (!auth.success) {
      return auth.error
    }

    const { context } = auth
    const { organization } = context
    const organizationId = organization.id

    console.log('✅ Calendar holidays API: Using organization:', organizationId)

    const supabaseAdmin = await createAdminClient()

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
      .or(`organization_id.eq.${organizationId},and(type.eq.national,organization_id.is.null,country_code.eq.${countryCode})`)
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