import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getBasicAuth, requireRole } from '@/lib/auth-utils'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { employees, mode = 'direct' } = body

    // Validate request format
    if (!Array.isArray(employees) || employees.length === 0) {
      return NextResponse.json(
        { error: 'employees must be a non-empty array' },
        { status: 400 }
      )
    }

    // Authenticate and check permissions
    const auth = await getBasicAuth()
    if (!auth.success) {
      return auth.error
    }

    const { user, organizationId, role } = auth
    
    // Only admins can create employees directly
    const roleCheck = requireRole({ role } as any, ['admin'])
    if (roleCheck) {
      return roleCheck
    }

    const supabase = await createClient()
    const supabaseAdmin = createAdminClient()
    
    // Get organization details for invitations
    const { data: organization } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', organizationId)
      .single()

    const results = []
    const errors = []

    console.log('📋 Processing employees:', { count: employees.length, mode })

    for (const employeeData of employees) {
      try {
        console.log('👤 Processing employee data:', employeeData)
        
        const { 
          email, 
          full_name, 
          birth_date,
          role: employeeRole = 'employee', 
          team_id, 
          personal_message,
          send_invitation = true
        } = employeeData

        console.log('📝 Extracted values:', { email, full_name, birth_date, employeeRole, team_id })

        // Validate required fields
        if (!email?.trim() || !full_name?.trim()) {
          console.log('❌ Validation failed:', { email: email?.trim(), full_name: full_name?.trim() })
          errors.push({ email, error: 'Email and full name are required' })
          continue
        }

        // Validate role
        if (!['admin', 'manager', 'employee'].includes(employeeRole)) {
          errors.push({ email, error: 'Invalid role. Must be admin, manager, or employee' })
          continue
        }

        // Validate team assignment
        console.log('🏢 Checking team assignment:', team_id)
        if (team_id) {
          const { data: team, error: teamError } = await supabase
            .from('teams')
            .select('id')
            .eq('id', team_id)
            .eq('organization_id', organizationId)
            .single()

          console.log('🏢 Team lookup result:', { team, teamError })
          if (!team) {
            console.log('❌ Team validation failed')
            errors.push({ email, error: 'Invalid team selected' })
            continue
          }
        }

        // Check if email is already in use
        console.log('📧 Checking if email already exists:', email.toLowerCase())
        const { data: existingUser, error: userCheckError } = await supabaseAdmin
          .from('profiles')
          .select('id, email, organization_id')
          .eq('email', email.toLowerCase())
          .single()

        console.log('📧 Existing user check:', { existingUser, userCheckError })
        if (existingUser) {
          if (existingUser.organization_id === organizationId) {
            console.log('❌ Email already in organization')
            errors.push({ email, error: 'Email is already a member of your organization' })
            continue
          } else if (existingUser.organization_id !== null) {
            console.log('❌ Email registered with another organization')
            errors.push({ email, error: 'Email is already registered with another organization' })
            continue
          } else {
            console.log('✅ User exists but no organization - can invite')
          }
        }

        // Check for pending invitations
        console.log('📩 Checking for existing invitations')
        const { data: existingInvitation, error: invitationCheckError } = await supabase
          .from('invitations')
          .select('id')
          .eq('email', email.toLowerCase())
          .eq('organization_id', organizationId)
          .eq('status', 'pending')
          .single()

        console.log('📩 Existing invitation check:', { existingInvitation, invitationCheckError })
        if (existingInvitation) {
          console.log('🔄 Found existing invitation, updating it with new data...')
          
          // Generate new token and code for the updated invitation
          const newToken = btoa(Math.random().toString(36).substring(2) + Date.now().toString(36))
          const newExpiresAt = new Date()
          newExpiresAt.setDate(newExpiresAt.getDate() + 7)
          const newInvitationCode = Math.random().toString(36).substring(2, 8).toUpperCase()
          
          // Update existing invitation with new data
          const { data: updatedInvitation, error: updateError } = await supabase
            .from('invitations')
            .update({
              full_name: full_name?.trim() || null,
              birth_date: birth_date || null,
              role: employeeRole,
              team_id: team_id || null,
              token: newToken,
              invitation_code: newInvitationCode,
              expires_at: newExpiresAt.toISOString(),
              personal_message: personal_message?.trim() || null,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingInvitation.id)
            .select()
            .single()
            
          console.log('🔄 Invitation update result:', { updatedInvitation, updateError })
          
          if (updateError) {
            console.error('❌ Failed to update existing invitation:', updateError)
            errors.push({ email, error: 'Failed to update existing invitation' })
            continue
          }
          
          console.log('✅ Existing invitation updated successfully')
          
          // Send email with new token
          if (send_invitation) {
            try {
              const { sendInvitationEmail } = await import('@/lib/email')
              
              const { data: inviterProfile } = await supabase
                .from('profiles')
                .select('full_name, email')
                .eq('id', user.id)
                .single()

              const emailData = {
                to: email.toLowerCase(),
                organizationName: organization?.name || 'Your Organization',
                inviterName: inviterProfile?.full_name || 'Administrator',
                inviterEmail: inviterProfile?.email || 'admin@company.com',
                role: employeeRole,
                invitationToken: newToken,
                personalMessage: personal_message || ''
              }

              const emailResult = await sendInvitationEmail(emailData)
              console.log('📬 Updated invitation email result:', emailResult)
            } catch (emailError) {
              console.error('💥 Email sending error:', emailError)
            }
          }
          
          results.push({
            email,
            full_name: full_name?.trim() || 'Unknown',
            role: employeeRole,
            team_id,
            invitation_id: existingInvitation.id,
            invitation_code: newInvitationCode,
            status: 'updated',
            invitation_sent: send_invitation
          })
          continue
        }

        if (mode === 'direct') {
          // Direct creation: Create profile immediately and send verification
          
          // Generate temporary password for account creation
          const tempPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12)
          
          // Create auth user
          const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: email.toLowerCase(),
            password: tempPassword,
            email_confirm: false, // We'll send confirmation email manually
            user_metadata: {
              full_name: full_name.trim(),
              invited_by: user.id,
              organization_id: organizationId
            }
          })

          if (authError) {
            errors.push({ email, error: `Failed to create auth user: ${authError.message}` })
            continue
          }

          // Create profile
          const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .insert({
              id: authUser.user!.id,
              email: email.toLowerCase(),
              full_name: full_name.trim(),
              role: employeeRole,
              organization_id: organizationId,
              team_id: team_id || null,
              auth_provider: 'email',
              status: 'pending_verification'
            })
            .select()
            .single()

          if (profileError) {
            // Clean up auth user if profile creation fails
            await supabaseAdmin.auth.admin.deleteUser(authUser.user!.id)
            errors.push({ email, error: `Failed to create profile: ${profileError.message}` })
            continue
          }

          // Send email verification invitation
          if (send_invitation) {
            try {
              // Import email function directly instead of making HTTP call
              const { sendEmployeeVerificationEmail } = await import('@/lib/email')
              
              const emailResult = await sendEmployeeVerificationEmail({
                to: email.toLowerCase(),
                full_name: full_name.trim(),
                organization_name: organization?.name || 'Your Organization',
                temp_password: tempPassword,
                personal_message: personal_message || ''
              })

              if (!emailResult.success) {
                console.warn('Failed to send verification email:', emailResult.error)
              } else {
                console.log('✅ Verification email sent successfully:', emailResult.messageId)
              }
            } catch (emailError) {
              console.warn('Failed to send verification email:', emailError)
            }
          }

          results.push({
            email,
            full_name: full_name.trim(),
            role: employeeRole,
            team_id,
            profile_id: profile.id,
            status: 'created',
            verification_sent: send_invitation
          })

        } else {
          // Invitation mode: Enhanced existing system
          console.log('🎯 INVITATION MODE: Processing employee:', email.toLowerCase())
          console.log('📧 send_invitation flag:', send_invitation)
          
          // Generate invitation token and code
          const token = btoa(Math.random().toString(36).substring(2) + Date.now().toString(36))
          const expiresAt = new Date()
          expiresAt.setDate(expiresAt.getDate() + 7)
          const invitationCode = Math.random().toString(36).substring(2, 8).toUpperCase()
          console.log('🔑 Generated invitation code:', invitationCode)

          // Create invitation
          console.log('💾 Creating invitation record in database...')
          const invitationData = {
            email: email.toLowerCase(),
            full_name: full_name?.trim() || null,
            birth_date: birth_date || null,
            role: employeeRole,
            team_id: team_id || null,
            organization_id: organizationId,
            invited_by: user.id,
            token,
            invitation_code: invitationCode,
            expires_at: expiresAt.toISOString(),
            personal_message: personal_message?.trim() || null
          }
          console.log('📝 Invitation data:', invitationData)
          console.log('🎯 Team ID being saved:', team_id)
          console.log('📅 Birth date being saved:', birth_date)
          console.log('👤 Full name being saved:', full_name)

          const { data: invitation, error: invitationError } = await supabase
            .from('invitations')
            .insert(invitationData)
            .select()
            .single()

          console.log('🗃️ Database result:', { invitation, error: invitationError })

          if (invitationError) {
            console.error('❌ Database insertion failed:', invitationError)
            errors.push({ email, error: `Failed to create invitation: ${invitationError.message}` })
            continue
          }

          console.log('✅ Invitation record created successfully:', invitation.id)

          // Send invitation email
          if (send_invitation) {
            console.log('🔄 Starting email send process for:', email.toLowerCase())
            try {
              // Import email function directly instead of making HTTP call
              const { sendInvitationEmail } = await import('@/lib/email')
              console.log('📧 Email function imported successfully')
              
              // Get user profile for inviter info
              const { data: inviterProfile } = await supabase
                .from('profiles')
                .select('full_name, email')
                .eq('id', user.id)
                .single()
              console.log('👤 Inviter profile:', inviterProfile)

              const emailData = {
                to: email.toLowerCase(),
                organizationName: organization?.name || 'Your Organization',
                inviterName: inviterProfile?.full_name || 'Administrator',
                inviterEmail: inviterProfile?.email || 'admin@company.com',
                role: employeeRole,
                invitationToken: token,
                personalMessage: personal_message || ''
              }
              console.log('📤 Sending email with data:', emailData)

              const emailResult = await sendInvitationEmail(emailData)
              console.log('📬 Email result:', emailResult)

              if (!emailResult.success) {
                console.warn('❌ Failed to send invitation email:', emailResult.error)
              } else {
                console.log('✅ Invitation email sent successfully:', emailResult.messageId)
              }
            } catch (emailError) {
              console.error('💥 Email sending error:', emailError)
            }
          } else {
            console.log('📵 Email sending disabled (send_invitation = false)')
          }

          results.push({
            email,
            full_name: full_name.trim(),
            role: employeeRole,
            team_id,
            invitation_id: invitation.id,
            invitation_code: invitationCode,
            status: 'invited',
            invitation_sent: send_invitation
          })
        }

      } catch (error) {
        console.error('Error processing employee:', error)
        errors.push({ 
          email: employeeData.email, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        })
      }
    }

    return NextResponse.json({
      success: true,
      results,
      errors,
      summary: {
        total: employees.length,
        successful: results.length,
        failed: errors.length,
        mode
      }
    })

  } catch (error) {
    console.error('Employee creation API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 