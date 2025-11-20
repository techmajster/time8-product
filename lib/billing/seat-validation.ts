/**
 * Seat Validation Logic for Downgrade Prevention
 *
 * This module provides utilities for validating seat downgrades against active user counts.
 * Implements the auto-archive flow where users must archive members in Team Management
 * before being allowed to downgrade their subscription.
 *
 * Key Concepts:
 * - active users: status = 'active' (counts towards downgrade validation)
 * - pending_removal users: status = 'pending_removal' (DO NOT block downgrades, keep access until removal_effective_date)
 * - archived users: status = 'archived' (no workspace access)
 * - pending_invitations: unfilled invitations that count as occupied seats
 */

import { createAdminClient } from '@/lib/supabase/server'

/**
 * Get count of ONLY active users (excludes pending_removal and archived)
 * This is the count used for downgrade validation
 */
export async function getActiveUserCount(organizationId: string): Promise<number> {
  const supabase = createAdminClient()

  const { count, error } = await supabase
    .from('user_organizations')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('status', 'active')

  if (error) {
    console.error('❌ Failed to get active user count:', error)
    throw new Error('Failed to fetch active user count')
  }

  return count || 0
}

/**
 * Get count of pending invitations (occupy seats until accepted/declined)
 */
export async function getPendingInvitationsCount(organizationId: string): Promise<number> {
  const supabase = createAdminClient()

  const { count, error} = await supabase
    .from('invitations')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('status', 'pending')

  if (error) {
    console.error('❌ Failed to get pending invitations count:', error)
    throw new Error('Failed to fetch pending invitations count')
  }

  return count || 0
}

/**
 * Get total occupied seats (active users + pending invitations)
 * This is used for seat availability checks (e.g., unarchive validation)
 */
export async function getTotalOccupiedSeats(organizationId: string): Promise<{
  activeUsers: number
  pendingInvitations: number
  totalOccupied: number
}> {
  const [activeUsers, pendingInvitations] = await Promise.all([
    getActiveUserCount(organizationId),
    getPendingInvitationsCount(organizationId)
  ])

  return {
    activeUsers,
    pendingInvitations,
    totalOccupied: activeUsers + pendingInvitations
  }
}

/**
 * Check if user can reduce seats to target amount
 * Returns validation result with active user count for UI display
 */
export async function canReduceSeats(
  organizationId: string,
  targetSeats: number
): Promise<{
  canReduce: boolean
  activeUsers: number
  reason?: string
}> {
  const activeUsers = await getActiveUserCount(organizationId)

  // User can reduce seats if active users <= target seats
  // Pending_removal users DON'T block downgrades (they keep access until renewal)
  const canReduce = activeUsers <= targetSeats

  let reason: string | undefined
  if (!canReduce) {
    reason = `Cannot reduce to ${targetSeats} seats. You have ${activeUsers} active users. Archive users in Team Management first.`
  }

  return {
    canReduce,
    activeUsers,
    reason
  }
}

/**
 * Check if user can unarchive (reactivate) a user
 * Validates against total occupied seats (active + pending invitations)
 */
export async function canUnarchiveUser(
  organizationId: string,
  paidSeats: number
): Promise<{
  canUnarchive: boolean
  reason?: string
  activeUsers: number
  pendingInvitations: number
  availableSeats: number
}> {
  const { activeUsers, pendingInvitations, totalOccupied } = await getTotalOccupiedSeats(organizationId)

  // Calculate total available seats (free tier = 3, paid tier = paid_seats)
  const totalSeats = paidSeats > 0 ? paidSeats : 3
  const availableSeats = Math.max(0, totalSeats - totalOccupied)

  // Can unarchive if there's at least 1 available seat
  const canUnarchive = availableSeats >= 1

  let reason: string | undefined
  if (!canUnarchive) {
    reason = `No available seats. You have ${activeUsers} active users and ${pendingInvitations} pending invitations. Upgrade your plan or archive users first.`
  }

  return {
    canUnarchive,
    reason,
    activeUsers,
    pendingInvitations,
    availableSeats
  }
}

/**
 * Get comprehensive seat information for UI display
 */
export async function getSeatInfo(organizationId: string, paidSeats: number): Promise<{
  totalSeats: number
  paidSeats: number
  activeUsers: number
  pendingInvitations: number
  pendingRemovalUsers: number
  archivedUsers: number
  availableSeats: number
}> {
  const supabase = createAdminClient()

  // Get counts in parallel
  const [
    { data: activeCount },
    { data: pendingInvitationsData },
    { data: pendingRemovalCount },
    { data: archivedCount }
  ] = await Promise.all([
    supabase.from('user_organizations')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('status', 'active'),
    supabase.from('invitations')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('status', 'pending'),
    supabase.from('user_organizations')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('status', 'pending_removal'),
    supabase.from('user_organizations')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('status', 'archived')
  ])

  const activeUsers = activeCount?.count || 0
  const pendingInvitations = pendingInvitationsData?.count || 0
  const pendingRemovalUsers = pendingRemovalCount?.count || 0
  const archivedUsers = archivedCount?.count || 0

  const totalSeats = paidSeats > 0 ? paidSeats : 3
  const availableSeats = Math.max(0, totalSeats - activeUsers - pendingInvitations)

  return {
    totalSeats,
    paidSeats,
    activeUsers,
    pendingInvitations,
    pendingRemovalUsers,
    archivedUsers,
    availableSeats
  }
}
