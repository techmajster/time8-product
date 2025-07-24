import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, slug, google_domain, require_google_domain, country_code } = body

    // Get current user from session
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    console.log('API: Creating organization for user:', user.id)

    // Create organization with service role (bypasses RLS)
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name,
        slug,
        google_domain: google_domain || null,
        require_google_domain: require_google_domain || false,
        country_code: country_code || 'PL',
      })
      .select()
      .single()

    if (orgError) {
      console.error('API: Organization creation error:', orgError)
      return NextResponse.json({ error: orgError.message }, { status: 400 })
    }

    console.log('API: Organization created:', org)

    // Update user profile with organization and admin role
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        organization_id: org.id,
        role: 'admin',
      })
      .eq('id', user.id)

    if (profileError) {
      console.error('API: Profile update error:', profileError)
      return NextResponse.json({ error: profileError.message }, { status: 400 })
    }

    // Create default leave types
    const { DEFAULT_LEAVE_TYPES } = await import('@/types/leave')
    
    const { data: createdLeaveTypes, error: leaveTypesError } = await supabase
      .from('leave_types')
      .insert(
        DEFAULT_LEAVE_TYPES.map(type => ({
          organization_id: org.id,
          name: type.name,
          days_per_year: type.days_per_year,
          color: type.color,
          requires_approval: type.requires_approval,
          requires_balance: type.requires_balance,
          leave_category: type.leave_category
        }))
      )
      .select()

    if (leaveTypesError) {
      console.error('API: Leave types error:', leaveTypesError)
      // Don't fail - organization is already created
    }

    return NextResponse.json({ 
      success: true, 
      organization: org,
      message: 'Organization created successfully'
    })

  } catch (error) {
    console.error('API: Fatal error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 