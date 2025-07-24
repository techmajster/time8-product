import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getAppUrl } from '@/lib/utils'

interface SignupWithInvitationRequest {
  email: string
  password: string
  full_name: string
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
    if (!email || !password || !full_name || !invitation_id || !organization_id || !role) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    const supabaseAdmin = createAdminClient()

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
        full_name
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

    // 4. Create or update user profile with organization details
    console.log('👤 Creating/updating user profile...')
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: authData.user.id,
        email: email.toLowerCase(),
        full_name,
        organization_id,
        role,
        team_id,
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

    console.log('✅ User profile created/updated')

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
    try {
      const { DEFAULT_LEAVE_TYPES } = await import('@/types/leave')
      
      // Check if leave types already exist for this organization
      const { data: existingLeaveTypes, error: leaveTypesCheckError } = await supabaseAdmin
        .from('leave_types')
        .select('id')
        .eq('organization_id', organization_id)
        .limit(1)

      if (!leaveTypesCheckError && (!existingLeaveTypes || existingLeaveTypes.length === 0)) {
        // Create default leave types for the organization
        const { error: leaveTypesError } = await supabaseAdmin
          .from('leave_types')
          .insert(
            DEFAULT_LEAVE_TYPES.map(type => ({
              organization_id,
              ...type
            }))
          )

        if (leaveTypesError) {
          console.error('⚠️ Leave types creation error:', leaveTypesError)
          // Don't fail the process, leave types can be created later
        } else {
          console.log('✅ Default leave types created')
        }
      }
    } catch (error) {
      console.error('⚠️ Leave types setup error:', error)
      // Don't fail the process
    }

    // 7. Create a session for the new user (auto-login)
    console.log('🔐 Creating session for new user...')
    
    // Get the correct base URL dynamically
    const baseUrl = getAppUrl(request)
    console.log('🌐 Using base URL for redirect:', baseUrl)
    
    const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: email.toLowerCase(),
      options: {
        redirectTo: `${baseUrl}/dashboard`
      }
    })

    if (sessionError) {
      console.error('⚠️ Failed to generate session:', sessionError)
    }

    console.log('🎉 Account creation and invitation acceptance completed!')

    const response = NextResponse.json({
      success: true,
      message: 'Account created and invitation accepted successfully',
      user: {
        id: authData.user.id,
        email: authData.user.email,
        organization_id,
        role
      },
      // Return magic link URL for frontend to use
      magicLink: sessionData?.properties?.action_link || null
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