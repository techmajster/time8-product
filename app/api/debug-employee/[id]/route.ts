import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const supabase = await createClient()
    const supabaseAdmin = await createAdminClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current user's organization
    const { data: userOrg } = await supabase
      .from('user_organizations')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .eq('is_default', true)
      .single()

    // Check if the ID exists in profiles table
    const { data: profileCheck, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single()

    // Check all user_organizations entries for this user ID
    const { data: allUserOrgs, error: userOrgsError } = await supabaseAdmin
      .from('user_organizations')
      .select('*')
      .eq('user_id', id)

    // Check specific organization membership
    const { data: orgMembership, error: orgMembershipError } = await supabaseAdmin
      .from('user_organizations')
      .select('*')
      .eq('user_id', id)
      .eq('organization_id', userOrg?.organization_id)

    // Check if there are any invitations for this user ID
    const { data: invitations, error: invitationsError } = await supabaseAdmin
      .from('invitations')
      .select('*')
      .or(`email.eq.${profileCheck?.email},token.eq.${id}`)

    return NextResponse.json({
      debug: {
        searched_user_id: id,
        current_user: user.id,
        current_user_org: userOrg,
        profile_check: {
          found: !!profileCheck,
          error: profileError,
          data: profileCheck
        },
        all_user_orgs: {
          found: allUserOrgs?.length || 0,
          error: userOrgsError,
          data: allUserOrgs
        },
        org_membership: {
          found: !!orgMembership,
          error: orgMembershipError,
          data: orgMembership
        },
        invitations: {
          found: invitations?.length || 0,
          error: invitationsError,
          data: invitations
        }
      }
    })

  } catch (error) {
    console.error('Debug API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    )
  }
}