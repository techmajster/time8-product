import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { authenticateAndGetOrgContext } from '@/lib/auth-utils-v2'

export async function GET(request: NextRequest) {
  try {
    // REFACTOR: Use standard auth pattern for workspace isolation
    const auth = await authenticateAndGetOrgContext()
    if (!auth.success) {
      console.error('❌ Calendar holidays API: Authentication failed')
      return auth.error
    }

    const { context } = auth
    const { organization } = context
    const organizationId = organization.id

    console.log('✅ Calendar holidays API: Using organization:', {
      organizationId,
      orgName: organization.name
    })

    const supabaseAdmin = await createAdminClient()

    // Get URL parameters
    const searchParams = request.nextUrl.searchParams
    const year = searchParams.get('year')
    const month = searchParams.get('month')
    const countryCode = searchParams.get('country_code') || 'PL'

    console.log('📅 Holidays API parameters:', { year, month, countryCode })

    if (!year || !month) {
      console.error('❌ Missing required parameters:', { year, month })
      return NextResponse.json({ error: 'Year and month parameters are required' }, { status: 400 })
    }

    const startDate = `${year}-${month.padStart(2, '0')}-01`
    // Get the last day of the month properly
    const lastDayOfMonth = new Date(parseInt(year), parseInt(month), 0).getDate()
    const endDate = `${year}-${month.padStart(2, '0')}-${lastDayOfMonth.toString().padStart(2, '0')}`

    // Fetch holidays using admin client to bypass RLS
    console.log('🔍 Querying holidays:', { organizationId, countryCode, startDate, endDate })

    const { data: holidays, error } = await supabaseAdmin
      .from('company_holidays')
      .select('*')
      .or(`organization_id.eq.${organizationId},and(type.eq.national,organization_id.is.null,country_code.eq.${countryCode})`)
      .gte('date', startDate)
      .lte('date', endDate)

    if (error) {
      console.error('❌ Database error fetching holidays:', {
        error,
        message: error.message,
        details: error.details,
        hint: error.hint
      })
      return NextResponse.json({ error: 'Failed to fetch holidays', details: error.message }, { status: 500 })
    }

    console.log('✅ Holidays fetched successfully:', { count: holidays?.length || 0 })
    return NextResponse.json(holidays || [])

  } catch (error) {
    console.error('Error in calendar holidays API:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      name: error instanceof Error ? error.name : 'Unknown',
      stack: error instanceof Error ? error.stack : undefined,
      error: error
    })
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}