/**
 * Seat Management Utilities
 *
 * Handles user removal with grace periods and seat reactivation
 * for subscription-based seat management.
 */

import { createAdminClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/permissions'
import { getTotalOccupiedSeats } from '@/lib/billing/seat-validation'

export interface RemoveUserResult {
  success: boolean
  error?: string
  data?: {
    userId: string
    organizationId: string
    removalEffectiveDate: string
    currentSeats: number
  }
}

export interface ReactivateUserResult {
  success: boolean
  error?: string
  data?: {
    userId: string
    organizationId: string
    currentSeats: number
  }
}

/**
 * Removes a user from an organization with grace period
 *
 * Marks user as pending_removal. User retains access until next subscription renewal
 * when the webhook will archive them.
 *
 * @param userId - ID of user to remove
 * @param organizationId - ID of the organization
 * @param requestingUserId - ID of admin performing the removal
 * @returns Result with removal details
 */
export async function removeUser(
  userId: string,
  organizationId: string,
  requestingUserId: string
): Promise<RemoveUserResult> {
  try {
    const supabase = await createAdminClient()

    // Validate admin permission
    const { data: requestingUserOrg, error: permError } = await supabase
      .from('user_organizations')
      .select('role')
      .eq('user_id', requestingUserId)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .single()

    if (permError || !requestingUserOrg) {
      return {
        success: false,
        error: 'Failed to verify permissions'
      }
    }

    if (!isAdmin(requestingUserOrg.role)) {
      return {
        success: false,
        error: 'Only admins can remove users'
      }
    }

    // Prevent self-deletion
    if (userId === requestingUserId) {
      return {
        success: false,
        error: 'Cannot remove your own account'
      }
    }

    // Get subscription details (may not exist for free tier)
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('id, current_seats, renews_at')
      .eq('organization_id', organizationId)
      .in('status', ['active', 'on_trial'])
      .maybeSingle()

    // Check if user exists and is active
    // Note: Using maybeSingle() to handle potential duplicates
    const { data: userOrg, error: userError } = await supabase
      .from('user_organizations')
      .select('user_id, organization_id, status')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (userError || !userOrg) {
      return {
        success: false,
        error: 'User not found in organization'
      }
    }

    if (userOrg.status !== 'active') {
      return {
        success: false,
        error: `User is already ${userOrg.status}`
      }
    }

    // Update user status to pending_removal
    const { error: updateUserError } = await supabase
      .from('user_organizations')
      .update({
        status: 'pending_removal',
        removal_effective_date: subscription.renews_at,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('organization_id', organizationId)

    if (updateUserError) {
      return {
        success: false,
        error: `Failed to update user status: ${updateUserError.message}`
      }
    }

    console.log(`[SeatManagement] User ${userId} marked for removal, effective: ${subscription.renews_at}`)

    return {
      success: true,
      data: {
        userId,
        organizationId,
        removalEffectiveDate: subscription.renews_at,
        currentSeats: subscription.current_seats
      }
    }

  } catch (error) {
    console.error('[SeatManagement] removeUser error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Reactivates a user marked for removal
 *
 * Changes user status from pending_removal back to active.
 * Only works if user hasn't been archived yet.
 *
 * @param userId - ID of user to reactivate
 * @param organizationId - ID of the organization
 * @param requestingUserId - ID of admin performing the reactivation
 * @returns Result with reactivation details
 */
export async function reactivateUser(
  userId: string,
  organizationId: string,
  requestingUserId: string
): Promise<ReactivateUserResult> {
  try {
    const supabase = await createAdminClient()

    // Validate admin permission
    const { data: requestingUserOrg, error: permError } = await supabase
      .from('user_organizations')
      .select('role')
      .eq('user_id', requestingUserId)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .single()

    if (permError || !requestingUserOrg) {
      return {
        success: false,
        error: 'Failed to verify permissions'
      }
    }

    if (!isAdmin(requestingUserOrg.role)) {
      return {
        success: false,
        error: 'Only admins can reactivate users'
      }
    }

    // Get subscription details
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('id, current_seats')
      .eq('organization_id', organizationId)
      .in('status', ['active', 'on_trial'])
      .single()

    if (subError || !subscription) {
      return {
        success: false,
        error: 'Active subscription not found'
      }
    }

    // Check if user is pending_removal
    // Note: Using maybeSingle() to handle potential duplicates
    const { data: userOrg, error: userError } = await supabase
      .from('user_organizations')
      .select('user_id, organization_id, status')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (userError || !userOrg) {
      return {
        success: false,
        error: 'User not found in organization'
      }
    }

    if (userOrg.status !== 'pending_removal') {
      return {
        success: false,
        error: `Cannot reactivate user with status: ${userOrg.status}`
      }
    }

    // Update user status back to active
    const { error: updateUserError } = await supabase
      .from('user_organizations')
      .update({
        status: 'active',
        removal_effective_date: null,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('organization_id', organizationId)

    if (updateUserError) {
      return {
        success: false,
        error: `Failed to update user status: ${updateUserError.message}`
      }
    }

    console.log(`[SeatManagement] User ${userId} reactivated`)

    return {
      success: true,
      data: {
        userId,
        organizationId,
        currentSeats: subscription.current_seats
      }
    }

  } catch (error) {
    console.error('[SeatManagement] reactivateUser error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Reactivates an archived user
 *
 * Changes user status from archived back to active and increases seat count.
 * This will trigger a seat increase at next renewal.
 *
 * @param userId - ID of archived user to reactivate
 * @param organizationId - ID of the organization
 * @param requestingUserId - ID of admin performing the reactivation
 * @returns Result with reactivation details
 */
export async function reactivateArchivedUser(
  userId: string,
  organizationId: string,
  requestingUserId: string
): Promise<ReactivateUserResult> {
  try {
    const supabase = await createAdminClient()

    // Validate admin permission
    const { data: requestingUserOrg, error: permError } = await supabase
      .from('user_organizations')
      .select('role')
      .eq('user_id', requestingUserId)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .single()

    if (permError || !requestingUserOrg) {
      return {
        success: false,
        error: 'Failed to verify permissions'
      }
    }

    if (!isAdmin(requestingUserOrg.role)) {
      return {
        success: false,
        error: 'Only admins can reactivate users'
      }
    }

    // Get subscription and organization details for seat validation
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('id, current_seats')
      .eq('organization_id', organizationId)
      .in('status', ['active', 'on_trial'])
      .single()

    if (subError || !subscription) {
      return {
        success: false,
        error: 'Active subscription not found'
      }
    }

    // Validate seat availability BEFORE reactivating
    // Check that active + pending_invitations + 1 (for the user being reactivated) <= total_seats
    const { activeUsers, pendingInvitations, totalOccupied } = await getTotalOccupiedSeats(organizationId)

    // Calculate total seats using graduated pricing model
    // - Tier 1 (0-3 users): FREE tier = 3 seats
    // - Tier 2 (4+ users): Pay for ALL seats = current_seats (NOT 3 + current_seats)
    const totalSeats = subscription.current_seats > 0 ? subscription.current_seats : 3
    const availableSeats = Math.max(0, totalSeats - totalOccupied)

    if (availableSeats < 1) {
      return {
        success: false,
        error: `No available seats. You have ${activeUsers} active users and ${pendingInvitations} pending invitations. Upgrade your plan or archive users first.`
      }
    }

    // Check if user is archived
    // Note: Using maybeSingle() instead of single() to handle potential duplicates
    // and order by updated_at to get the most recent record
    const { data: userOrg, error: userError } = await supabase
      .from('user_organizations')
      .select('user_id, organization_id, status')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (userError || !userOrg) {
      console.error('[SeatManagement] User lookup failed:', {
        userId,
        organizationId,
        error: userError,
        userOrg
      })
      return {
        success: false,
        error: `User not found in organization: ${userError?.message || 'No user_organizations record found'}`
      }
    }

    if (userOrg.status !== 'archived') {
      return {
        success: false,
        error: `Cannot reactivate user with status: ${userOrg.status}`
      }
    }

    // Update user status to active
    const { error: updateUserError } = await supabase
      .from('user_organizations')
      .update({
        status: 'active',
        removal_effective_date: null,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('organization_id', organizationId)

    if (updateUserError) {
      return {
        success: false,
        error: `Failed to update user status: ${updateUserError.message}`
      }
    }

    console.log(`[SeatManagement] Archived user ${userId} reactivated`)

    return {
      success: true,
      data: {
        userId,
        organizationId,
        currentSeats: subscription.current_seats
      }
    }

  } catch (error) {
    console.error('[SeatManagement] reactivateArchivedUser error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Gets current seat usage including pending removals
 *
 * @param organizationId - ID of the organization
 * @returns Seat usage details
 */
export async function getSeatUsage(organizationId: string) {
  const supabase = await createAdminClient()

  // Count active users (including pending_removal since they still have access)
  const { count: activeSeats, error: activeError } = await supabase
    .from('user_organizations')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .in('status', ['active', 'pending_removal'])

  // Count pending removals
  const { count: pendingRemovals, error: pendingError } = await supabase
    .from('user_organizations')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('status', 'pending_removal')

  // Get subscription
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('current_seats, renews_at')
    .eq('organization_id', organizationId)
    .in('status', ['active', 'on_trial'])
    .single()

  if (activeError || pendingError) {
    return null
  }

  return {
    activeSeats: activeSeats || 0,
    pendingRemovals: pendingRemovals || 0,
    currentSeats: subscription?.current_seats || 0,
    renewsAt: subscription?.renews_at
  }
}
