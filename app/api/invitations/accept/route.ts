import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

interface AcceptInvitationRequest {
  token: string
}

export async function POST(request: NextRequest) {
  console.log('🚀 Accept invitation API called')
  try {
    const body: AcceptInvitationRequest = await request.json()
    const { token } = body
    
    console.log('📝 Accept invitation request:', { token: !!token })

    if (!token) {
      return NextResponse.json(
        { error: 'Invitation token is required' },
        { status: 400 }
      )
    }

    // Get the current authenticated user
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error('❌ User not authenticated:', userError)
      return NextResponse.json(
        { error: 'You must be logged in to accept an invitation' },
        { status: 401 }
      )
    }

    console.log('✅ User authenticated:', { id: user.id, email: user.email })

    const supabaseAdmin = createAdminClient()

    // 1. Verify the invitation exists and is valid
    console.log('🔍 Verifying invitation...')
    console.log('🔍 Looking for invitation with:', { token, userEmail: user.email?.toLowerCase() })
    
    const { data: invitation, error: invitationError } = await supabaseAdmin
      .from('invitations')
      .select('*')
      .eq('token', token)
      .eq('email', user.email?.toLowerCase())
      .eq('status', 'pending')
      .single()

    console.log('🔍 Invitation query result:', { invitation: !!invitation, error: invitationError })
    
    if (invitationError || !invitation) {
      console.error('❌ Invalid invitation:', invitationError)
      return NextResponse.json(
        { error: 'Invalid or expired invitation' },
        { status: 400 }
      )
    }

    // Check if invitation has expired
    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'This invitation has expired' },
        { status: 400 }
      )
    }

    // SECURITY: Verify the target organization actually exists and is active
    const { data: targetOrg, error: orgCheckError } = await supabaseAdmin
      .from('organizations')
      .select('id, name')
      .eq('id', invitation.organization_id)
      .single()

    if (orgCheckError || !targetOrg) {
      console.error('❌ Target organization not found:', orgCheckError)
      return NextResponse.json(
        { error: 'The organization for this invitation no longer exists' },
        { status: 400 }
      )
    }

    console.log('✅ Invitation verified')

    // 2. Check if user has any membership (active or inactive) in this organization
    const { data: existingMembership, error: membershipError } = await supabaseAdmin
      .from('user_organizations')
      .select('user_id, role, is_active')
      .eq('user_id', user.id)
      .eq('organization_id', invitation.organization_id)
      .single()

    if (existingMembership && !membershipError) {
      if (existingMembership.is_active) {
        console.log('⚠️ User already has active membership in organization')
        return NextResponse.json(
          { error: 'You are already a member of this organization' },
          { status: 400 }
        )
      } else {
        // User has inactive membership - reactivate it instead of creating new one
        console.log('🔄 Reactivating inactive membership for user')
        const { error: reactivateError } = await supabaseAdmin
          .from('user_organizations')
          .update({
            is_active: true,
            role: invitation.role, // Update role from invitation
            team_id: invitation.team_id,
            joined_via: 'invitation',
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id)
          .eq('organization_id', invitation.organization_id)

        if (reactivateError) {
          console.error('❌ Error reactivating membership:', reactivateError)
          return NextResponse.json(
            { error: 'Failed to reactivate membership' },
            { status: 500 }
          )
        }

        console.log('✅ Membership reactivated')
        // Skip the creation step and go to profile update
      }
    } else {
      // No existing membership - need to create new one
      console.log('🏢 Creating new user organization membership...')
      
      // Check if this is the user's first organization (make it default)
      const { data: existingOrgs, error: existingOrgError } = await supabaseAdmin
        .from('user_organizations')
        .select('organization_id, is_default')
        .eq('user_id', user.id)
        .eq('is_active', true)

      console.log('🏢 Existing organizations for user:', { existingOrgs, existingOrgError })
      const isFirstOrganization = !existingOrgs || existingOrgs.length === 0
      const hasDefaultOrganization = existingOrgs?.some(org => org.is_default) || false
      
      console.log('🔍 Organization check:', { isFirstOrganization, hasDefaultOrganization })
      
      const { error: userOrgError } = await supabaseAdmin
        .from('user_organizations')
        .insert({
          user_id: user.id,
          organization_id: invitation.organization_id,
          role: invitation.role,
          team_id: invitation.team_id,
          is_active: true,
          is_default: isFirstOrganization && !hasDefaultOrganization,
          joined_via: 'invitation',
          employment_type: 'full_time'
        })

      if (userOrgError) {
        console.error('❌ User organization creation error:', userOrgError)
        return NextResponse.json(
          { error: 'Failed to join organization' },
          { status: 500 }
        )
      }

      console.log('✅ User organization membership created')
    }

    console.log('✅ User organization membership handled')

    // 4. Update profile with invitation data if needed
    const profileUpdateData: any = {}
    if (invitation.full_name && invitation.full_name !== user.user_metadata?.full_name) {
      profileUpdateData.full_name = invitation.full_name
    }
    if (invitation.birth_date) {
      profileUpdateData.birth_date = invitation.birth_date
    }
    
    if (Object.keys(profileUpdateData).length > 0) {
      const { error: profileUpdateError } = await supabaseAdmin
        .from('profiles')
        .update(profileUpdateData)
        .eq('id', user.id)
      
      if (profileUpdateError) {
        console.error('⚠️ Profile update error:', profileUpdateError)
        // Don't fail the whole process
      } else {
        console.log('✅ Profile updated with invitation data')
      }
    }

    // 5. Create leave balances for the new user in this organization
    console.log('💰 Creating leave balances for user in new organization...')
    try {
      const { data: organizationLeaveTypes, error: leaveTypesError } = await supabaseAdmin
        .from('leave_types')
        .select('*')
        .eq('organization_id', invitation.organization_id)
        .gt('days_per_year', 0)

      if (leaveTypesError) {
        console.error('⚠️ Leave types fetch error:', leaveTypesError)
      } else if (organizationLeaveTypes && organizationLeaveTypes.length > 0) {
        // Filter leave types that require balance tracking (including mandatory types) and aren't child-specific
        const balanceRequiredTypes = organizationLeaveTypes.filter(lt =>
          (lt.requires_balance || lt.is_mandatory) &&
          !['maternity', 'paternity', 'childcare'].includes(lt.leave_category)
        )

        if (balanceRequiredTypes.length > 0) {
          const leaveBalances = balanceRequiredTypes.map(leaveType => ({
            user_id: user.id,
            leave_type_id: leaveType.id,
            organization_id: invitation.organization_id,
            year: new Date().getFullYear(),
            entitled_days: leaveType.days_per_year,
            used_days: 0
          }))

          const { error: balancesError } = await supabaseAdmin
            .from('leave_balances')
            .insert(leaveBalances)

          if (balancesError) {
            console.error('⚠️ Leave balances creation error:', balancesError)
            // Don't fail the process
          } else {
            console.log('✅ Leave balances created')
          }
        }
      }
    } catch (error) {
      console.error('⚠️ Leave balances setup error:', error)
      // Don't fail the process
    }

    // 6. Mark invitation as accepted
    console.log('📧 Accepting invitation...')
    const { error: acceptError } = await supabaseAdmin
      .from('invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', invitation.id)

    if (acceptError) {
      console.error('❌ Invitation acceptance error:', acceptError)
      // Don't fail the process, membership was created successfully
    } else {
      console.log('✅ Invitation accepted')
    }

    // 7. Get organization name for response
    const { data: organization } = await supabaseAdmin
      .from('organizations')
      .select('name')
      .eq('id', invitation.organization_id)
      .single()

    console.log('🎉 Invitation acceptance completed!')

    // Set the active organization cookie to switch to the newly joined workspace
    const response = NextResponse.json({
      success: true,
      message: `Successfully joined ${organization?.name || 'the organization'}`,
      organization: {
        id: invitation.organization_id,
        name: organization?.name || 'Unknown Organization',
        role: invitation.role
      }
    })

    // Set the active-organization-id cookie to switch to the workspace
    response.cookies.set('active-organization-id', invitation.organization_id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 365 // 1 year
    })

    console.log('✅ Active organization cookie set:', invitation.organization_id)

    return response

  } catch (error) {
    console.error('❌ Accept invitation error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}