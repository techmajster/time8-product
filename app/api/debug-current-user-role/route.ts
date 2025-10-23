import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  console.log('🔍 Debug current user role API called')

  try {
    // SECURITY: Debug endpoint - only allow in development
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Debug endpoints are disabled in production' },
        { status: 403 }
      )
    }

    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({
        authenticated: false,
        error: userError?.message || 'No user found'
      })
    }

    // Get user profile and organizations
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    const { data: userOrgs, error: userOrgsError } = await supabase
      .from('user_organizations')
      .select(`
        role,
        is_active,
        is_default,
        joined_via,
        organizations!inner(name)
      `)
      .eq('user_id', user.id)
      .eq('is_active', true)

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at
      },
      profile: profile || null,
      profileError: profileError?.message || null,
      organizations: userOrgs || [],
      organizationsError: userOrgsError?.message || null,
    })
    
  } catch (error) {
    console.error('Debug user role error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}