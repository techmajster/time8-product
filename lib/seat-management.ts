/**
 * Seat Management Utilities
 *
 * Handles user removal with grace periods and seat reactivation
 * for subscription-based seat management.
 */

import { createAdminClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/permissions'

export interface RemoveUserResult {
  success: boolean
  error?: string
  data?: {
    userId: string
    organizationId: string
    removalEffectiveDate: string
    currentSeats: number
    pendingSeats: number
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
 * Marks user as pending_removal and calculates new pending_seats.
 * User retains access until next subscription renewal.
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

    // Get subscription details
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('id, current_seats, pending_seats, renews_at')
      .eq('organization_id', organizationId)
      .in('status', ['active', 'on_trial'])
      .single()

    if (subError || !subscription) {
      return {
        success: false,
        error: 'Active subscription not found'
      }
    }

    if (!subscription.renews_at) {
      return {
        success: false,
        error: 'Subscription renewal date not found'
      }
    }

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

    // Calculate new pending_seats
    // Count only truly active users (not pending_removal)
    const { count: activeCount, error: countError } = await supabase
      .from('user_organizations')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('status', 'active')

    if (countError) {
      return {
        success: false,
        error: 'Failed to count active users'
      }
    }

    // New pending_seats = active users minus the one being removed
    const newPendingSeats = (activeCount || 0) - 1

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

    // Update subscription with pending_seats
    const { error: updateSubError } = await supabase
      .from('subscriptions')
      .update({
        pending_seats: newPendingSeats,
        lemonsqueezy_quantity_synced: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', subscription.id)

    if (updateSubError) {
      // Rollback user status change
      await supabase
        .from('user_organizations')
        .update({
          status: 'active',
          removal_effective_date: null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('organization_id', organizationId)

      return {
        success: false,
        error: `Failed to update subscription: ${updateSubError.message}`
      }
    }

    console.log(`[SeatManagement] User ${userId} marked for removal. Pending seats: ${newPendingSeats}, effective: ${subscription.renews_at}`)

    return {
      success: true,
      data: {
        userId,
        organizationId,
        removalEffectiveDate: subscription.renews_at,
        currentSeats: subscription.current_seats,
        pendingSeats: newPendingSeats
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
      .select('id, current_seats, pending_seats')
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

    // Update user status back to active first
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

    // Recalculate pending_seats after status update
    // Count remaining pending_removal users
    const { count: pendingRemovalCount, error: pendingError } = await supabase
      .from('user_organizations')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('status', 'pending_removal')

    if (pendingError) {
      return {
        success: false,
        error: 'Failed to count pending removals'
      }
    }

    // If no pending removals remain, pending_seats should be null
    // Otherwise, count all active users (the new pending_seats value)
    let newPendingSeats: number | null = null

    if (pendingRemovalCount && pendingRemovalCount > 0) {
      // Still have pending removals, so calculate new pending_seats
      const { count: activeCount, error: countError } = await supabase
        .from('user_organizations')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('status', 'active')

      if (countError) {
        return {
          success: false,
          error: 'Failed to count active users'
        }
      }

      newPendingSeats = activeCount || 0
    }

    // Update subscription pending_seats
    const { error: updateSubError } = await supabase
      .from('subscriptions')
      .update({
        pending_seats: newPendingSeats,
        lemonsqueezy_quantity_synced: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', subscription.id)

    if (updateSubError) {
      // Rollback user status change
      await supabase
        .from('user_organizations')
        .update({
          status: 'pending_removal',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('organization_id', organizationId)

      return {
        success: false,
        error: `Failed to update subscription: ${updateSubError.message}`
      }
    }

    console.log(`[SeatManagement] User ${userId} reactivated. Pending seats: ${newPendingSeats}`)

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

    // Get subscription details
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('id, current_seats, pending_seats')
      .eq('organization_id', organizationId)
      .in('status', ['active', 'on_trial'])
      .single()

    if (subError || !subscription) {
      return {
        success: false,
        error: 'Active subscription not found'
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

    // Calculate new pending_seats
    // Count currently active users (including pending_removal)
    const { count: activeCount, error: countError } = await supabase
      .from('user_organizations')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .in('status', ['active', 'pending_removal'])

    if (countError) {
      return {
        success: false,
        error: 'Failed to count active users'
      }
    }

    // New pending_seats will be current active count plus 1 (the archived user being reactivated)
    const newPendingSeats = (activeCount || 0) + 1

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

    // Update subscription with new pending_seats (will increase seats at renewal)
    const { error: updateSubError } = await supabase
      .from('subscriptions')
      .update({
        pending_seats: newPendingSeats,
        lemonsqueezy_quantity_synced: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', subscription.id)

    if (updateSubError) {
      // Rollback user status change
      await supabase
        .from('user_organizations')
        .update({
          status: 'archived',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('organization_id', organizationId)

      return {
        success: false,
        error: `Failed to update subscription: ${updateSubError.message}`
      }
    }

    console.log(`[SeatManagement] Archived user ${userId} reactivated. Pending seats: ${newPendingSeats}`)

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
    .select('current_seats, pending_seats, renews_at')
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
    pendingSeats: subscription?.pending_seats,
    renewsAt: subscription?.renews_at
  }
}
