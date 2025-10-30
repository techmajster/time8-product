import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  console.log('🔍 Organization check API called')

  try {
    const searchParams = request.nextUrl.searchParams
    const slug = searchParams.get('slug')

    if (!slug) {
      return NextResponse.json({ error: 'Slug is required' }, { status: 400 })
    }

    console.log('🔍 Checking for organization with slug:', slug)

    // Get current user from session
    const supabase = await createClient()
    const supabaseAdmin = createAdminClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      console.error('Check API: Authentication error:', userError)
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Check if organization with this slug exists
    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('id, slug, name')
      .eq('slug', slug)
      .maybeSingle()

    if (orgError) {
      console.error('Check API: Error checking organization:', orgError)
      return NextResponse.json({ error: 'Failed to check organization' }, { status: 500 })
    }

    if (!org) {
      console.log('✅ Organization does not exist')
      return NextResponse.json({ exists: false })
    }

    console.log('📌 Organization exists:', org.id)

    // Check if user belongs to this organization
    const { data: userOrg, error: userOrgError } = await supabaseAdmin
      .from('user_organizations')
      .select('organization_id, role')
      .eq('organization_id', org.id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (userOrgError) {
      console.error('Check API: Error checking user membership:', userOrgError)
      return NextResponse.json({ error: 'Failed to check user membership' }, { status: 500 })
    }

    if (!userOrg) {
      console.log('⚠️ Organization exists but user is not a member')
      return NextResponse.json({
        exists: true,
        belongsToUser: false,
        error: 'Organization slug is already taken by another user'
      }, { status: 409 })
    }

    console.log('✅ Organization exists and user is a member')
    return NextResponse.json({
      exists: true,
      belongsToUser: true,
      organization: org
    })

  } catch (error) {
    console.error('Check API: Fatal error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
