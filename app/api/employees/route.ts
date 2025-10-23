import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { authenticateAndGetOrgContext, requireRole } from '@/lib/auth-utils-v2'
import { calculateComprehensiveSeatInfo } from '@/lib/billing/seat-calculation'

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
      role,
      subscription_tier: organization.subscription_tier,
      paid_seats: organization.paid_seats
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

    // Check seat availability before processing invitations using unified calculation
    console.log('🪑 Checking seat availability...')

    // Get current active members count using service client to bypass RLS
    const { count: currentMembersCount, error: memberCountError } = await supabaseAdmin
      .from('user_organizations')
      .select('user_id', { count: 'exact' })
      .eq('organization_id', organizationId)
      .eq('is_active', true)

    if (memberCountError) {
      console.error('❌ Failed to count current members:', memberCountError)
      return NextResponse.json(
        { error: 'Failed to check seat availability' },
        { status: 500 }
      )
    }

    const currentMembers = currentMembersCount || 0
    console.log(`👥 Current active members: ${currentMembers}`)

    // Count pending invitations that would consume seats
    const { count: pendingInvitationsCount, error: pendingCountError } = await supabaseAdmin
      .from('invitations')
      .select('id', { count: 'exact' })
      .eq('organization_id', organizationId)
      .eq('status', 'pending')

    if (pendingCountError) {
      console.error('❌ Failed to count pending invitations:', pendingCountError)
      return NextResponse.json(
        { error: 'Failed to check pending invitations' },
        { status: 500 }
      )
    }

    const pendingInvitations = pendingInvitationsCount || 0

    // Check if organization has billing override (unlimited seats)
    let hasUnlimitedSeats = false
    if (organization.billing_override_reason) {
      console.log('🎫 Organization has billing override - allowing unlimited seats')
      hasUnlimitedSeats = true
    }

    if (!hasUnlimitedSeats) {
      // Use unified seat calculation
      // Check if organization has paid seats (regardless of tier name)
      const paidSeats = organization.paid_seats > 0 ? organization.paid_seats : 0
      const seatInfo = calculateComprehensiveSeatInfo(
        paidSeats,
        currentMembers,
        pendingInvitations,
        organization.billing_override_seats,
        organization.billing_override_expires_at
      )

      console.log(`🪑 Seat calculation (unified):`)
      console.log(`   - Current members: ${seatInfo.currentActiveMembers}`)
      console.log(`   - Pending invitations: ${seatInfo.pendingInvitations}`)
      console.log(`   - Total used: ${seatInfo.totalUsedSeats}`)
      console.log(`   - Total available: ${seatInfo.totalSeats}`)
      console.log(`   - Available seats: ${seatInfo.availableSeats}`)

      // Check if we have enough seats for the new invitations
      if (employees.length > seatInfo.availableSeats) {
        console.error(`❌ Seat limit exceeded: requesting ${employees.length} seats but only ${seatInfo.availableSeats} available`)
        return NextResponse.json(
          {
            error: 'Seat limit exceeded',
            details: {
              requested: employees.length,
              available: seatInfo.availableSeats,
              current_members: seatInfo.currentActiveMembers,
              pending_invitations: seatInfo.pendingInvitations,
              total_seats: seatInfo.totalSeats,
              upgrade_required: true
            }
          },
          { status: 409 } // Conflict status for seat limit exceeded
        )
      }

      console.log(`✅ Seat check passed: ${employees.length} new invitations within ${seatInfo.availableSeats} available seats`)
    } else {
      console.log(`✅ Seat check passed: unlimited seats (billing override)`)
    }

    console.log(`📝 Processing ${employees.length} employee(s) in ${mode} mode`)

    for (const employee of employees) {
      try {
        const { email, full_name, role: employeeRole, team_id, send_invitation, personal_message } = employee
        console.log(`🔍 Processing employee:`, { email, full_name, employeeRole, send_invitation })

        // Validate required fields
        if (!email || !full_name || !employeeRole) {
          console.error(`❌ Missing required fields for ${email}:`, { email: !!email, full_name: !!full_name, employeeRole: !!employeeRole })
          errors.push({
            email: email || 'unknown',
            error: 'Missing required fields: email, full_name, or role'
          })
          continue
        }

        // Validate email domain if required
        if (organization.require_google_domain && organization.google_domain) {
          const emailDomain = email.toLowerCase().split('@')[1]
          const requiredDomain = organization.google_domain.toLowerCase()
          console.log(`🔍 Domain validation:`, { emailDomain, requiredDomain, require_google_domain: organization.require_google_domain })
          
          if (emailDomain !== requiredDomain) {
            console.error(`❌ Domain validation failed for ${email}:`, { emailDomain, requiredDomain })
            errors.push({
              email,
              error: `Email domain must be @${requiredDomain} according to organization policy`
            })
            continue
          }
        }

        // Check if user already exists in this organization
        console.log(`🔍 Checking if user ${email} already exists...`)
        
        // First, check if user profile exists
        const { data: existingProfile, error: profileError } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('email', email.toLowerCase())
          .single()

        console.log(`🔍 Profile check result:`, { existingProfile: !!existingProfile, profileError })

        if (existingProfile) {
          // Check if this user is already ACTIVE in the current organization
          const { data: existingUser, error: userOrgError } = await supabaseAdmin
            .from('user_organizations')
            .select('user_id, role, is_active')
            .eq('organization_id', organizationId)
            .eq('user_id', existingProfile.id)
            .eq('is_active', true) // Only check active memberships
            .single()

          console.log(`🔍 User organization check result:`, { existingUser: !!existingUser, userOrgError })

          if (existingUser) {
            console.error(`❌ User already exists in organization: ${email} with role ${existingUser.role}`)
            errors.push({
              email,
              error: `User already exists in this organization with role: ${existingUser.role}`
            })
            continue
          } else {
            console.log(`✅ User ${email} exists in database but not ACTIVE in this organization - will create invitation and add to org when accepted`)
          }
        } else {
          console.log(`✅ User ${email} does not exist in database - can create invitation`)
        }

        // Check for existing invitations and clean up if needed
        // We need to check ALL invitations (pending, accepted, rejected) because:
        // - User might have been deleted after accepting (leaving accepted invitation)
        // - Old pending invitations might exist
        // - We want to allow re-inviting in all cases
        const { data: existingInvitations } = await supabaseAdmin
          .from('invitations')
          .select('id, status, created_at')
          .eq('email', email.toLowerCase())
          .eq('organization_id', organizationId)

        if (existingInvitations && existingInvitations.length > 0) {
          console.log(`🗑️ Found ${existingInvitations.length} existing invitation(s) for ${email}:`,
            existingInvitations.map(inv => `${inv.status} (${inv.created_at})`).join(', '))

          // Delete ALL old invitations to allow creating a fresh one
          await supabaseAdmin
            .from('invitations')
            .delete()
            .eq('email', email.toLowerCase())
            .eq('organization_id', organizationId)

          console.log(`✅ Old invitations deleted, will create new one`)
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