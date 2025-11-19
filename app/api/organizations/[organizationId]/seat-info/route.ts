import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/permissions'
import { calculateComprehensiveSeatInfo } from '@/lib/billing/seat-calculation'
import { getVariantPrice } from '@/lib/lemon-squeezy/pricing'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ organizationId: string }> }
) {
  try {
    const { organizationId } = await params

    // Validate organization ID
    if (!organizationId || organizationId.trim() === '') {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
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

    // Check if user is a member of the organization
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

    // Check if user is an admin
    if (!isAdmin(userOrg.role)) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    // Use admin client for queries to bypass RLS
    const supabaseAdmin = createAdminClient()

    // Get subscription information including billing cycle
    const { data: subscription, error: subscriptionError } = await supabaseAdmin
      .from('subscriptions')
      .select('current_seats, renews_at, variant_id')
      .eq('organization_id', organizationId)
      .in('status', ['active', 'on_trial'])
      .maybeSingle()

    if (subscriptionError) {
      console.error('[SeatInfo] Subscription query error:', subscriptionError)
      return NextResponse.json(
        { error: 'Failed to retrieve seat information' },
        { status: 500 }
      )
    }

    // Get organization billing override information
    const { data: organization, error: organizationError } = await supabaseAdmin
      .from('organizations')
      .select('billing_override_seats, billing_override_expires_at')
      .eq('id', organizationId)
      .single()

    if (organizationError) {
      console.error('[SeatInfo] Organization query error:', organizationError)
      return NextResponse.json(
        { error: 'Failed to retrieve organization information' },
        { status: 500 }
      )
    }

    // Get paid seats (default to 0 if no subscription)
    const paidSeats = subscription?.current_seats || 0
    const billingOverrideSeats = organization?.billing_override_seats || null
    const billingOverrideExpiresAt = organization?.billing_override_expires_at || null

    // Count active members only (exclude pending_removal as they shouldn't occupy seats)
    const { count: activeMembers, error: activeMembersError } = await supabaseAdmin
      .from('user_organizations')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('status', 'active')

    if (activeMembersError) {
      console.error('[SeatInfo] Active members count error:', activeMembersError)
      return NextResponse.json(
        { error: 'Failed to retrieve seat information' },
        { status: 500 }
      )
    }

    // Count pending invitations
    const { count: pendingInvitations, error: pendingInvitationsError } = await supabaseAdmin
      .from('invitations')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('status', 'pending')

    if (pendingInvitationsError) {
      console.error('[SeatInfo] Pending invitations count error:', pendingInvitationsError)
      return NextResponse.json(
        { error: 'Failed to retrieve seat information' },
        { status: 500 }
      )
    }

    // Get users marked for removal with their effective dates
    const { data: usersMarkedForRemoval, error: markedForRemovalError } = await supabaseAdmin
      .from('user_organizations')
      .select('removal_effective_date, profiles(email)')
      .eq('organization_id', organizationId)
      .eq('status', 'pending_removal')

    if (markedForRemovalError) {
      console.error('[SeatInfo] Users marked for removal query error:', markedForRemovalError)
      // Don't fail the request, just return empty array
    }

    // Calculate comprehensive seat information using existing utility
    const seatInfo = calculateComprehensiveSeatInfo(
      paidSeats,
      activeMembers || 0,
      pendingInvitations || 0,
      billingOverrideSeats,
      billingOverrideExpiresAt
    )

    // Fetch pricing information from LemonSqueezy
    let pricePerSeat: number | undefined
    let currency: string | undefined
    let billingCycle: 'monthly' | 'yearly' | null = null

    if (subscription?.variant_id) {
      try {
        // Determine billing cycle from variant_id
        const monthlyVariantId = process.env.LEMONSQUEEZY_MONTHLY_VARIANT_ID || '972634'
        const yearlyVariantId = process.env.LEMONSQUEEZY_YEARLY_VARIANT_ID || '972635'

        const isMonthly = subscription.variant_id === monthlyVariantId
        const isYearly = subscription.variant_id === yearlyVariantId

        if (isMonthly || isYearly) {
          billingCycle = isMonthly ? 'monthly' : 'yearly'

          // Fetch the specific variant price
          const variantPrice = await getVariantPrice(subscription.variant_id)
          if (variantPrice) {
            pricePerSeat = variantPrice.price
            currency = variantPrice.currency
            console.log('[SeatInfo] Fetched pricing from LemonSqueezy:', {
              variantId: subscription.variant_id,
              pricePerSeat,
              currency,
              billingCycle
            })
          }
        }
      } catch (error) {
        console.error('[SeatInfo] Failed to fetch variant pricing:', error)
        // Continue without pricing - component will use fallback
      }
    }

    // Add additional fields for the response
    // Use totalUsedSeats (active + pending) and availableSeats from seat calculation
    const response = {
      currentSeats: seatInfo.totalUsedSeats,
      maxSeats: seatInfo.totalSeats,
      availableSeats: seatInfo.availableSeats,  // ✅ CLEAR - empty seats that can be filled
      freeTierSeats: 3,                          // ✅ CLEAR - tier threshold (always 3 for graduated pricing)
      paidSeats: paidSeats,                      // Number of paid seats in subscription
      activeUserCount: activeMembers || 0,       // Only status='active' users (for downgrade validation)
      pendingInvitations: seatInfo.pendingInvitations,
      usersMarkedForRemoval: (usersMarkedForRemoval || []).length,
      plan: (paidSeats > 0 ? 'business' : 'free') as 'free' | 'business',
      billingCycle,
      pricePerSeat,
      currency,
      pendingRemovals: (usersMarkedForRemoval || []).length,
      renewalDate: subscription?.renews_at || null,
      usersMarkedForRemovalDetails: (usersMarkedForRemoval || []).map(user => ({
        email: user.profiles?.email || '',
        effectiveDate: user.removal_effective_date
      }))
    }

    console.log('[SeatInfo] Response data:', {
      paidSeats,
      activeMembers,
      pendingInvitations,
      totalSeats: seatInfo.totalSeats,
      totalUsedSeats: seatInfo.totalUsedSeats,
      availableSeats: seatInfo.availableSeats,
      response
    })

    return NextResponse.json(response, { status: 200 })

  } catch (error) {
    console.error('[SeatInfo] Unexpected error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
