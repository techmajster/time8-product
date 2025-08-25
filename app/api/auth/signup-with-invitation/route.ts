import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getAppUrl } from '@/lib/utils'

interface SignupWithInvitationRequest {
  email: string
  password: string
  full_name?: string | null
  invitation_id: string
  organization_id: string
  role: string
  team_id?: string | null
}

export async function POST(request: NextRequest) {
  console.log('🚀 Signup with invitation API called')
  try {
    const body: SignupWithInvitationRequest = await request.json()
    const { email, password, full_name, invitation_id, organization_id, role, team_id } = body
    
    console.log('📝 Invitation signup request:', { email, invitation_id, organization_id, role })

    // Validate input
    if (!email || !password || !invitation_id || !organization_id || !role) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Use email prefix as fallback if full_name is not provided
    const displayName = full_name || email.split('@')[0]

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    const supabaseAdmin = await createAdminClient()

    // 1. Verify the invitation exists and is valid
    console.log('🔍 Verifying invitation...')
    const { data: invitation, error: invitationCheckError } = await supabaseAdmin
      .from('invitations')
      .select('*')
      .eq('id', invitation_id)
      .eq('email', email.toLowerCase())
      .eq('status', 'pending')
      .single()

    if (invitationCheckError || !invitation) {
      console.error('❌ Invalid invitation:', invitationCheckError)
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

    console.log('✅ Invitation verified')

    // 2. Check if user already exists
    const { data: existingUsers, error: checkError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (checkError) {
      console.error('Error checking existing users:', checkError)
      return NextResponse.json(
        { error: 'Failed to validate user' },
        { status: 500 }
      )
    }

    const existingUser = existingUsers.users.find(user => 
      user.email?.toLowerCase() === email.toLowerCase()
    )

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 400 }
      )
    }

    console.log('📝 Creating user account...')

    // 3. Create the user account
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email.toLowerCase(),
      password,
      user_metadata: {
        full_name: displayName
      },
      email_confirm: true // Auto-confirm since they clicked invitation link
    })

    if (authError || !authData.user) {
      console.error('❌ User creation error:', authError)
      return NextResponse.json(
        { error: authError?.message || 'Failed to create user account' },
        { status: 400 }
      )
    }

    console.log('✅ User account created:', authData.user.id)

    // MULTI-ORG UPDATE: Create user profile without organization details
    console.log('👤 Creating user profile...')
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: authData.user.id,
        email: email.toLowerCase(),
        full_name: displayName,
        // REMOVED: organization_id, role, team_id assignment (now handled by user_organizations)
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      })

    if (profileError) {
      console.error('❌ Profile creation error:', profileError)
      // Try to clean up the user if profile creation failed
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { error: 'Failed to create user profile' },
        { status: 500 }
      )
    }

    console.log('✅ User profile created')

    // MULTI-ORG UPDATE: Create user_organizations entry instead of updating profile
    console.log('🏢 Creating user organization membership...')
    const { error: userOrgError } = await supabaseAdmin
      .from('user_organizations')
      .insert({
        user_id: authData.user.id,
        organization_id: invitation.organization_id,
        role: invitation.role,
        team_id: invitation.team_id,
        is_active: true,
        is_default: true, // Invited organization becomes default
        joined_via: 'invitation',
        employment_type: 'full_time' // Default for new invitations
      })

    if (userOrgError) {
      console.error('❌ User organization creation error:', userOrgError)
      // Clean up user and profile if organization membership failed
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { error: 'Failed to create organization membership' },
        { status: 500 }
      )
    }

    console.log('✅ User organization membership created')

    // 5. Accept the invitation
    console.log('📧 Accepting invitation...')
    const { error: acceptError } = await supabaseAdmin
      .from('invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', invitation_id)

    if (acceptError) {
      console.error('❌ Invitation acceptance error:', acceptError)
      // Don't fail the whole process, just log the error
    } else {
      console.log('✅ Invitation accepted')
    }

    // 6. Create default leave types for the user (if they don't exist for the organization)
    console.log('🏖️ Setting up leave types...')
    let organizationLeaveTypes = []
    try {
      const { DEFAULT_LEAVE_TYPES } = await import('@/types/leave')
      
      // Check if leave types already exist for this organization
      const { data: existingLeaveTypes, error: leaveTypesCheckError } = await supabaseAdmin
        .from('leave_types')
        .select('*')
        .eq('organization_id', organization_id)

      if (leaveTypesCheckError) {
        console.error('⚠️ Leave types check error:', leaveTypesCheckError)
        throw leaveTypesCheckError
      }

      if (!existingLeaveTypes || existingLeaveTypes.length === 0) {
        // Create default leave types for the organization
        const { data: createdLeaveTypes, error: leaveTypesError } = await supabaseAdmin
          .from('leave_types')
          .insert(
            DEFAULT_LEAVE_TYPES.map(type => ({
              organization_id,
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
          console.error('⚠️ Leave types creation error:', leaveTypesError)
          throw leaveTypesError
        } else {
          console.log('✅ Default leave types created')
          organizationLeaveTypes = createdLeaveTypes || []
        }
      } else {
        console.log('✅ Leave types already exist for organization')
        organizationLeaveTypes = existingLeaveTypes
      }
    } catch (error) {
      console.error('⚠️ Leave types setup error:', error)
      // Don't fail the process, but we won't have leave types to create balances from
    }

    // 7. Create default leave balances for the new user
    console.log('💰 Creating leave balances for new user...')
    try {
      if (organizationLeaveTypes.length > 0) {
        // Filter leave types that require balance tracking and aren't child-specific
        const balanceRequiredTypes = organizationLeaveTypes.filter(lt => 
          lt.requires_balance && 
          lt.days_per_year > 0 && 
          !['maternity', 'paternity', 'childcare'].includes(lt.leave_category)
        )

        if (balanceRequiredTypes.length > 0) {
          const leaveBalances = balanceRequiredTypes.map(leaveType => ({
            user_id: authData.user.id,
            leave_type_id: leaveType.id,
            organization_id: organization_id,
            year: new Date().getFullYear(),
            entitled_days: leaveType.days_per_year,
            used_days: 0
          }))

          console.log('💰 Creating leave balances:', { 
            userId: authData.user.id, 
            balancesCount: leaveBalances.length,
            balances: leaveBalances 
          })

          const { error: balancesError } = await supabaseAdmin
            .from('leave_balances')
            .insert(leaveBalances)

          if (balancesError) {
            console.error('⚠️ Leave balances creation error:', balancesError)
            // Don't fail the process, balances can be created later
          } else {
            console.log('✅ Leave balances created for new user')
          }
        } else {
          console.log('⚠️ No leave types require balance tracking')
        }
      } else {
        console.log('⚠️ No leave types available to create balances from')
      }
    } catch (error) {
      console.error('⚠️ Leave balances setup error:', error)
      // Don't fail the process
    }

    // 8. Create a session for the new user (auto-login)
    console.log('🔐 Creating session for new user...')
    
    // Get the correct base URL dynamically
    let baseUrl = getAppUrl(request)
    
    // Force localhost in development to avoid redirect issues
    if (process.env.NODE_ENV === 'development' && baseUrl.includes('app.time8.io')) {
      baseUrl = 'http://localhost:3000'
      console.log('🚨 Forcing localhost URL in development')
    }
    
    console.log('🌐 Using base URL for redirect:', baseUrl)
    
    const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: email.toLowerCase(),
      options: {
        redirectTo: `${baseUrl}/onboarding`
      }
    })

    if (sessionError) {
      console.error('⚠️ Failed to generate session:', sessionError)
    }

    console.log('🎉 Account creation and invitation acceptance completed!')

    // Debug: Check if user_organizations was created correctly
    const { data: userOrgCheck } = await supabaseAdmin
      .from('user_organizations')
      .select('*')
      .eq('user_id', authData.user.id)
      .single()
    
    console.log('🔍 User organization check:', userOrgCheck)

    const response = NextResponse.json({
      success: true,
      message: 'Account created and invitation accepted successfully',
      user: {
        id: authData.user.id,
        email: authData.user.email,
        organization_id: invitation.organization_id, // Return for compatibility
        role: invitation.role
      },
      // Return magic link URL for frontend to use
      magicLink: sessionData?.properties?.action_link || null,
      debug: {
        userOrgCreated: !!userOrgCheck,
        magicLinkGenerated: !!sessionData?.properties?.action_link
      }
    })

    return response

  } catch (error) {
    console.error('❌ Signup with invitation error:', error)
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack available')
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 