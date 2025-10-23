import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // SECURITY: Debug endpoint - only allow in development
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Debug endpoints are disabled in production' },
        { status: 403 }
      )
    }

    // Get current user
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Use admin client to bypass RLS
    const { createAdminClient } = await import('@/lib/supabase/server')
    const adminClient = await createAdminClient()
    
    // Get ALL user_organizations for debugging
    const { data: allUserOrgs, error: allError } = await adminClient
      .from('user_organizations')
      .select(`
        user_id,
        organization_id,
        role,
        is_active,
        is_default,
        profiles!user_organizations_user_id_fkey(
          email,
          full_name
        )
      `)
      .limit(20)

    if (allError) {
      console.error('Debug query error:', allError)
      return NextResponse.json({ error: allError.message }, { status: 500 })
    }

    // Get current user's organizations specifically
    const { data: currentUserOrgs, error: currentError } = await adminClient
      .from('user_organizations')
      .select('*')
      .eq('user_id', user.id)

    return NextResponse.json({
      currentUserId: user.id,
      currentUserEmail: user.email,
      currentUserOrgs,
      currentUserOrgsError: currentError,
      allUserOrgs: allUserOrgs || [],
      totalCount: allUserOrgs?.length || 0
    })

  } catch (error) {
    console.error('Debug API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}