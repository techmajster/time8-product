/**
 * Process Queued Invitations Endpoint
 *
 * Sends invitations that were queued during an upgrade flow.
 * Called after successful payment to send pending invitations.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

// Validation schema for queued invitations
const invitationSchema = z.object({
  email: z.string().email('Invalid email format'),
  fullName: z.string().optional(),
  role: z.enum(['admin', 'manager', 'employee']),
  teamId: z.string().optional(),
  personalMessage: z.string().optional()
})

const queuedInvitationsSchema = z.object({
  organizationId: z.string().uuid('Invalid organization ID'),
  invitations: z.array(invitationSchema).min(1, 'At least one invitation is required')
})

/**
 * POST /api/invitations/process-queued
 *
 * Processes queued invitations after successful payment upgrade
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Parse and validate request body
    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      )
    }

    const validation = queuedInvitationsSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.errors
        },
        { status: 400 }
      )
    }

    const { organizationId, invitations } = validation.data

    // Verify user has admin access to the organization
    const { data: membership, error: membershipError } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .in('status', ['active', 'invited'])
      .maybeSingle()

    if (membershipError || !membership) {
      return NextResponse.json(
        { error: 'Not authorized to send invitations for this organization' },
        { status: 403 }
      )
    }

    if (membership.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    // Get organization details
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('name, id')
      .eq('id', organizationId)
      .single()

    if (orgError || !organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    // Use admin client for creating invitations
    const supabaseAdmin = createAdminClient()

    // Process each invitation
    const results = []
    const errors = []

    for (const invitation of invitations) {
      try {
        // Check if user already exists or has pending invitation
        const { data: existingMember } = await supabaseAdmin
          .from('organization_members')
          .select('id, status')
          .eq('organization_id', organizationId)
          .eq('email', invitation.email.toLowerCase())
          .maybeSingle()

        if (existingMember) {
          errors.push({
            email: invitation.email,
            error: existingMember.status === 'active'
              ? 'User is already a member'
              : 'Invitation already sent'
          })
          continue
        }

        // Create invitation token
        const invitationToken = crypto.randomUUID()
        const expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + 7) // 7-day expiration

        // Insert invitation
        const { data: newInvitation, error: insertError } = await supabaseAdmin
          .from('organization_members')
          .insert({
            organization_id: organizationId,
            email: invitation.email.toLowerCase(),
            full_name: invitation.fullName || null,
            role: invitation.role,
            team_id: invitation.teamId || null,
            status: 'invited',
            invitation_token: invitationToken,
            invitation_expires_at: expiresAt.toISOString(),
            invited_by: user.id
          })
          .select()
          .single()

        if (insertError) {
          errors.push({
            email: invitation.email,
            error: insertError.message
          })
          continue
        }

        // Send invitation email
        try {
          const invitationUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/accept-invitation?token=${invitationToken}`

          await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
            to: [invitation.email],
            subject: `Zaproszenie do ${organization.name}`,
            html: `
              <h2>Zostałeś zaproszony do ${organization.name}</h2>
              ${invitation.personalMessage ? `<p>${invitation.personalMessage}</p>` : ''}
              <p>Kliknij poniższy link, aby zaakceptować zaproszenie:</p>
              <a href="${invitationUrl}">Zaakceptuj zaproszenie</a>
              <p>To zaproszenie wygasa za 7 dni.</p>
            `
          })

          results.push({
            email: invitation.email,
            status: 'sent'
          })
        } catch (emailError: any) {
          // Mark invitation as failed but keep the record
          await supabaseAdmin
            .from('organization_members')
            .update({ status: 'failed' })
            .eq('id', newInvitation.id)

          errors.push({
            email: invitation.email,
            error: `Failed to send email: ${emailError.message}`
          })
        }
      } catch (error: any) {
        errors.push({
          email: invitation.email,
          error: error.message || 'Unknown error occurred'
        })
      }
    }

    // Return results
    return NextResponse.json({
      success: true,
      sent: results.length,
      failed: errors.length,
      results,
      errors: errors.length > 0 ? errors : undefined
    })

  } catch (error) {
    console.error('Error processing queued invitations:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Handle unsupported HTTP methods
 */
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}

export const PUT = GET
export const DELETE = GET
export const PATCH = GET
