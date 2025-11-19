import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/permissions'
import { sendInvitationEmail } from '@/lib/email'

// Zod validation schema
const invitationSchema = z.object({
  email: z.string().email('Invalid email format'),
  fullName: z.string().min(1, 'Full name is required').optional(),
  role: z.enum(['admin', 'manager', 'employee'], {
    errorMap: () => ({ message: 'Role must be admin, manager, or employee' })
  }),
  teamId: z.string().uuid('Invalid team ID').optional(),
  personalMessage: z.string().max(500, 'Personal message must be less than 500 characters').optional()
})

const bulkInvitationSchema = z.object({
  invitations: z.array(invitationSchema).min(1, 'At least one invitation is required').max(50, 'Maximum 50 invitations per request')
})

// Rate limiting store (in-memory, in production use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

// Export for testing purposes
export { rateLimitStore }

function checkRateLimit(organizationId: string): boolean {
  const now = Date.now()
  const key = `bulk-invite:${organizationId}`
  const limit = rateLimitStore.get(key)

  if (!limit || now > limit.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + 60000 }) // 1 minute window
    return true
  }

  if (limit.count >= 10) {
    return false
  }

  limit.count++
  return true
}

export async function POST(
  request: NextRequest,
  { params }: { params: { organizationId: string } }
) {
  try {
    const { organizationId } = params

    // Validate organization ID
    if (!organizationId || organizationId.trim() === '') {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    // Rate limiting check
    if (!checkRateLimit(organizationId)) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded. Maximum 10 requests per minute.',
          retryAfter: 60
        },
        { status: 429 }
      )
    }

    // Get current user from session
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Check if user is a member of the organization and is an admin
    const { data: userOrg, error: userOrgError } = await supabase
      .from('user_organizations')
      .select('role')
      .eq('user_id', user.id)
      .eq('organization_id', organizationId)
      .in('status', ['active', 'pending_removal'])
      .maybeSingle()

    if (userOrgError || !userOrg) {
      return NextResponse.json(
        { error: 'Not authorized to access this organization' },
        { status: 403 }
      )
    }

    if (!isAdmin(userOrg.role)) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    // Parse and validate request body
    let body
    try {
      body = await request.json()
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    const validation = bulkInvitationSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.errors.map(err => ({
            path: err.path.join('.'),
            message: err.message
          }))
        },
        { status: 400 }
      )
    }

    const { invitations } = validation.data

    // Check for duplicate emails within the request
    const emailSet = new Set<string>()
    const duplicates: string[] = []
    for (const invitation of invitations) {
      const normalizedEmail = invitation.email.toLowerCase()
      if (emailSet.has(normalizedEmail)) {
        duplicates.push(invitation.email)
      }
      emailSet.add(normalizedEmail)
    }

    if (duplicates.length > 0) {
      return NextResponse.json(
        {
          error: 'Duplicate emails found in request',
          duplicates
        },
        { status: 400 }
      )
    }

    // Use admin client for database operations
    const supabaseAdmin = createAdminClient()

    // Get organization details for email
    const { data: organization, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('name')
      .eq('id', organizationId)
      .single()

    if (orgError || !organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    // Get user profile for inviter info
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // Check for existing members
    const emails = invitations.map(inv => inv.email.toLowerCase())
    const { data: existingMembers, error: membersError } = await supabaseAdmin
      .from('user_organizations')
      .select('user_id, profiles!user_organizations_user_id_fkey(email)')
      .eq('organization_id', organizationId)

    if (membersError) {
      console.error('[BulkInvitations] Error checking existing members:', membersError)
      return NextResponse.json(
        { error: 'Failed to check existing members' },
        { status: 500 }
      )
    }

    // Filter existing members whose emails match the invitation emails
    const existingEmailMatches = existingMembers
      ?.filter(m => m.profiles?.email && emails.includes(m.profiles.email.toLowerCase()))
      .map(m => m.profiles.email) || []

    if (existingEmailMatches.length > 0) {
      return NextResponse.json(
        {
          error: 'Some emails are already members of this organization',
          existingMembers: existingEmailMatches
        },
        { status: 400 }
      )
    }

    // Check for pending invitations
    const { data: pendingInvitations, error: pendingError } = await supabaseAdmin
      .from('invitations')
      .select('email')
      .eq('organization_id', organizationId)
      .eq('status', 'pending')
      .in('email', emails)

    if (pendingError) {
      console.error('[BulkInvitations] Error checking pending invitations:', pendingError)
      return NextResponse.json(
        { error: 'Failed to check pending invitations' },
        { status: 500 }
      )
    }

    if (pendingInvitations && pendingInvitations.length > 0) {
      const pendingEmails = pendingInvitations.map(inv => inv.email)
      return NextResponse.json(
        {
          error: 'Some emails already have pending invitations',
          pendingInvitations: pendingEmails
        },
        { status: 400 }
      )
    }

    // Check seat availability from subscription
    const { data: subscription, error: subscriptionError } = await supabaseAdmin
      .from('subscriptions')
      .select('current_seats')
      .eq('organization_id', organizationId)
      .in('status', ['active', 'on_trial'])
      .maybeSingle()

    if (subscriptionError) {
      console.error('[BulkInvitations] Subscription query error:', subscriptionError)
      return NextResponse.json(
        { error: 'Failed to check seat availability' },
        { status: 500 }
      )
    }

    // Get billing override from organization table
    const { data: orgBilling, error: orgBillingError } = await supabaseAdmin
      .from('organizations')
      .select('billing_override_seats, billing_override_expires_at')
      .eq('id', organizationId)
      .single()

    if (orgBillingError) {
      console.error('[BulkInvitations] Organization billing query error:', orgBillingError)
      return NextResponse.json(
        { error: 'Failed to check organization billing details' },
        { status: 500 }
      )
    }

    const paidSeats = subscription?.current_seats || 0
    const billingOverrideSeats = orgBilling?.billing_override_seats || null
    const billingOverrideExpiresAt = orgBilling?.billing_override_expires_at || null

    // Calculate available seats
    let totalSeats = 3 + paidSeats // 3 free seats + paid seats
    if (billingOverrideSeats && billingOverrideExpiresAt) {
      const now = new Date()
      const expiresAt = new Date(billingOverrideExpiresAt)
      if (expiresAt > now) {
        totalSeats = Math.max(totalSeats, billingOverrideSeats)
      }
    }

    // Count active members
    const { count: activeMembers, error: activeMembersError } = await supabaseAdmin
      .from('user_organizations')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .in('status', ['active', 'pending_removal'])

    if (activeMembersError) {
      console.error('[BulkInvitations] Active members count error:', activeMembersError)
      return NextResponse.json(
        { error: 'Failed to check active members' },
        { status: 500 }
      )
    }

    // Count existing pending invitations
    const { count: existingPendingCount, error: existingPendingError } = await supabaseAdmin
      .from('invitations')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('status', 'pending')

    if (existingPendingError) {
      console.error('[BulkInvitations] Existing pending count error:', existingPendingError)
      return NextResponse.json(
        { error: 'Failed to check pending invitations' },
        { status: 500 }
      )
    }

    const occupiedSeats = (activeMembers || 0) + (existingPendingCount || 0)
    const availableSeats = totalSeats - occupiedSeats
    const seatsRequired = invitations.length

    if (seatsRequired > availableSeats) {
      return NextResponse.json(
        {
          error: 'Not enough seats available',
          seatsAvailable: availableSeats,
          seatsRequired,
          totalSeats,
          upgradeRequired: true
        },
        { status: 400 }
      )
    }

    // Create invitations (atomic transaction)
    const invitationRecords = invitations.map(inv => ({
      email: inv.email.toLowerCase(),
      full_name: inv.fullName || null,
      role: inv.role,
      organization_id: organizationId,
      team_id: inv.teamId || null,
      personal_message: inv.personalMessage || null,
      invited_by: user.id,
      status: 'pending' as const,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
    }))

    const { data: createdInvitations, error: createError } = await supabaseAdmin
      .from('invitations')
      .insert(invitationRecords)
      .select('*')

    if (createError) {
      console.error('[BulkInvitations] Error creating invitations:', createError)
      return NextResponse.json(
        { error: 'Failed to create invitations' },
        { status: 500 }
      )
    }

    if (!createdInvitations || createdInvitations.length === 0) {
      return NextResponse.json(
        { error: 'No invitations were created' },
        { status: 500 }
      )
    }

    // Send invitation emails
    const emailResults = await Promise.allSettled(
      createdInvitations.map(async (invitation) => {
        try {
          const result = await sendInvitationEmail({
            to: invitation.email,
            organizationName: organization.name,
            inviterName: profile.full_name || 'A team member',
            inviterEmail: profile.email,
            role: invitation.role,
            invitationToken: invitation.token,
            personalMessage: invitation.personal_message || undefined,
            request
          })

          return {
            email: invitation.email,
            success: result.success,
            error: result.success ? null : result.error
          }
        } catch (error) {
          return {
            email: invitation.email,
            success: false,
            error: String(error)
          }
        }
      })
    )

    const successCount = emailResults.filter(r => r.status === 'fulfilled' && r.value.success).length
    const failedEmails = emailResults
      .filter(r => r.status === 'fulfilled' && !r.value.success)
      .map(r => r.status === 'fulfilled' ? r.value.email : null)
      .filter(Boolean)

    // If all emails failed, mark invitations as failed
    if (successCount === 0) {
      await supabaseAdmin
        .from('invitations')
        .update({ status: 'failed' })
        .in('id', createdInvitations.map(inv => inv.id))

      return NextResponse.json(
        {
          error: 'Failed to send invitation emails',
          failedEmails
        },
        { status: 500 }
      )
    }

    // Return success with details
    return NextResponse.json(
      {
        success: true,
        invitationsSent: successCount,
        totalInvitations: invitations.length,
        failedEmails: failedEmails.length > 0 ? failedEmails : undefined,
        invitations: createdInvitations.map(inv => ({
          id: inv.id,
          email: inv.email,
          role: inv.role,
          status: inv.status
        }))
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('[BulkInvitations] Unexpected error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
