import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { authenticateAndGetOrgContext, requireRole } from '@/lib/auth-utils-v2'

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Employee invitation API called')
    
    const body = await request.json()
    const { employees, mode = 'invitation' } = body

    // Validate request format
    if (!Array.isArray(employees) || employees.length === 0) {
      return NextResponse.json(
        { error: 'employees must be a non-empty array' },
        { status: 400 }
      )
    }

    // Authenticate and check permissions
    const auth = await authenticateAndGetOrgContext()
    
    console.log('🔐 Auth result:', { 
      success: auth.success, 
      hasError: !auth.success && !!auth.error 
    })
    
    if (!auth.success) {
      console.error('❌ Auth failed:', auth.error)
      return auth.error
    }

    const { context } = auth
    const { user, organization, role } = context
    const organizationId = organization.id
    
    console.log('✅ Auth context:', { 
      userId: user.id, 
      userEmail: user.email,
      organizationId, 
      organizationName: organization.name,
      role 
    })
    
    // Only admins can create employees
    const roleCheck = requireRole({ role } as any, ['admin'])
    if (roleCheck) {
      return roleCheck
    }

    // Get admin client for database operations
    const supabaseAdmin = createAdminClient()
    
    const results = []
    const errors = []

    console.log(`📝 Processing ${employees.length} employee(s) in ${mode} mode`)

    for (const employee of employees) {
      try {
        const { email, full_name, role: employeeRole, team_id, send_invitation, personal_message } = employee

        // Validate required fields
        if (!email || !full_name || !employeeRole) {
          errors.push({
            email: email || 'unknown',
            error: 'Missing required fields: email, full_name, or role'
          })
          continue
        }

        // Check if user already exists in this organization
        const { data: existingUser } = await supabaseAdmin
          .from('user_organizations')
          .select('user_id')
          .eq('organization_id', organizationId)
          .eq('user_id', (
            await supabaseAdmin
              .from('profiles')
              .select('id')
              .eq('email', email.toLowerCase())
              .single()
          ).data?.id || 'none')
          .single()

        if (existingUser) {
          errors.push({
            email,
            error: 'User already exists in this organization'
          })
          continue
        }

        // Check for existing pending invitation
        const { data: existingInvitation } = await supabaseAdmin
          .from('invitations')
          .select('id')
          .eq('email', email.toLowerCase())
          .eq('organization_id', organizationId)
          .eq('status', 'pending')
          .single()

        if (existingInvitation) {
          errors.push({
            email,
            error: 'Pending invitation already exists for this email'
          })
          continue
        }

        // Generate invitation details
        const token = btoa(Math.random().toString(36).substring(2) + Date.now().toString(36))
        const invitationCode = Math.random().toString(36).substring(2, 8).toUpperCase()
        const expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + 7)

        // Create invitation record
        const { data: invitation, error: invitationError } = await supabaseAdmin
          .from('invitations')
          .insert({
            email: email.toLowerCase(),
            full_name: full_name.trim(),
            role: employeeRole,
            team_id: team_id || null,
            organization_id: organizationId,
            invited_by: user.id,
            token,
            invitation_code: invitationCode,
            expires_at: expiresAt.toISOString(),
            personal_message: personal_message?.trim() || null,
            status: 'pending'
          })
          .select()
          .single()

        if (invitationError) {
          console.error('❌ Failed to create invitation:', invitationError)
          errors.push({
            email,
            error: `Failed to create invitation: ${invitationError.message}`
          })
          continue
        }

        console.log(`✅ Invitation created for ${email} with code ${invitationCode}`)

        // Send invitation email if requested
        let emailSent = false
        console.log(`🔍 DEBUG: send_invitation = ${send_invitation} for ${email}`)
        if (send_invitation) {
          try {
            console.log(`📧 About to send invitation email directly to ${email}...`)
            const { sendInvitationEmail } = await import('@/lib/email')
            
            const result = await sendInvitationEmail({
              to: email,
              organizationName: context.organization.name,
              inviterName: context.profile.full_name || context.user.email.split('@')[0],
              inviterEmail: context.user.email,
              role: employeeRole,
              invitationToken: token,
              personalMessage: personal_message
            })

            if (result.success) {
              emailSent = true
              console.log(`✅ Invitation email sent successfully to ${email}, messageId: ${result.messageId}`)
            } else {
              console.error(`❌ Failed to send email to ${email}:`, result.error)
            }
          } catch (emailError) {
            console.error(`⚠️ Email sending error for ${email}:`, emailError)
          }
        }

        results.push({
          email,
          full_name,
          role: employeeRole,
          team_id,
          status: 'invited',
          invitation_id: invitation.id,
          invitation_code: invitationCode,
          invitation_sent: emailSent
        })

      } catch (employeeError) {
        console.error(`❌ Error processing employee ${employee.email}:`, employeeError)
        errors.push({
          email: employee.email || 'unknown',
          error: employeeError instanceof Error ? employeeError.message : 'Unknown error'
        })
      }
    }

    const successful = results.length
    const failed = errors.length
    const total = successful + failed

    console.log(`✅ Employee processing completed: ${successful}/${total} successful`)

    return NextResponse.json({
      success: true,
      message: `Processed ${total} employee(s). ${successful} successful, ${failed} failed.`,
      results,
      errors,
      summary: {
        total,
        successful,
        failed,
        mode
      }
    })

  } catch (error) {
    console.error('Employee API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}