import { createClient } from './supabase/server'

export interface LeaveBalanceUpdate {
  user_id: string
  leave_type_id: string
  days_change: number // positive to add days back, negative to deduct days
  organization_id: string
  year: number
}

/**
 * Updates leave balance for a user when their leave request status changes
 * Only applies to leave types that require balance tracking
 */
export async function updateLeaveBalance(update: LeaveBalanceUpdate) {
  const supabase = await createClient()

  try {
    // First check if this leave type requires balance tracking
    const { data: leaveType, error: leaveTypeError } = await supabase
      .from('leave_types')
      .select('requires_balance, days_per_year')
      .eq('id', update.leave_type_id)
      .eq('organization_id', update.organization_id)
      .single()

    if (leaveTypeError) {
      console.error('Error fetching leave type:', leaveTypeError)
      throw new Error('Failed to fetch leave type information')
    }

    // If leave type doesn't require balance, skip the update
    if (!leaveType.requires_balance) {
      console.log(`Skipping balance update for leave type ${update.leave_type_id} - does not require balance tracking`)
      return null
    }

    // Get current balance
    const { data: currentBalance, error: fetchError } = await supabase
      .from('leave_balances')
      .select('*')
      .eq('user_id', update.user_id)
      .eq('leave_type_id', update.leave_type_id)
      .eq('year', update.year)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      console.error('Error fetching leave balance:', fetchError)
      throw new Error('Failed to fetch current leave balance')
    }

    // If no balance exists, create one (this should rarely happen as balances are typically pre-created)
    if (!currentBalance) {
      const newUsedDays = Math.max(0, -update.days_change) // Only count negative changes as used days
      const newBalance = {
        user_id: update.user_id,
        leave_type_id: update.leave_type_id,
        organization_id: update.organization_id,
        year: update.year,
        entitled_days: leaveType.days_per_year,
        used_days: newUsedDays,
        // Don't set remaining_days as it's a generated column
      }

      const { error: createError } = await supabase
        .from('leave_balances')
        .insert(newBalance)

      if (createError) {
        console.error('Error creating leave balance:', createError)
        throw new Error('Failed to create leave balance')
      }

      return newBalance
    }

    // Update existing balance - only update used_days, remaining_days will be calculated automatically
    const newUsedDays = Math.max(0, currentBalance.used_days - update.days_change)

    const { data: updatedBalance, error: updateError } = await supabase
      .from('leave_balances')
      .update({
        used_days: newUsedDays,
        // Don't update remaining_days as it's a generated column - it will auto-calculate
      })
      .eq('id', currentBalance.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating leave balance:', updateError)
      throw new Error('Failed to update leave balance')
    }

    return updatedBalance

  } catch (error) {
    console.error('Error in updateLeaveBalance:', error)
    throw error
  }
}

/**
 * Handles balance changes when a leave request is approved
 */
export async function handleLeaveRequestApproval(
  user_id: string,
  leave_type_id: string,
  days_requested: number,
  organization_id: string,
  year: number = new Date().getFullYear()
) {
  return updateLeaveBalance({
    user_id,
    leave_type_id,
    days_change: -days_requested, // Negative to deduct days
    organization_id,
    year
  })
}

/**
 * Handles balance changes when a leave request is cancelled (only if it was previously approved)
 */
export async function handleLeaveRequestCancellation(
  user_id: string,
  leave_type_id: string,
  days_requested: number,
  organization_id: string,
  previous_status: string,
  year: number = new Date().getFullYear()
) {
  // Only restore balance if the request was previously approved
  if (previous_status === 'approved') {
    return updateLeaveBalance({
      user_id,
      leave_type_id,
      days_change: days_requested, // Positive to add days back
      organization_id,
      year
    })
  }
  
  return null // No balance change needed for pending/rejected requests
}

/**
 * Handles balance changes when a leave request is edited
 */
export async function handleLeaveRequestEdit(
  user_id: string,
  old_leave_type_id: string,
  old_days_requested: number,
  new_leave_type_id: string,
  new_days_requested: number,
  organization_id: string,
  previous_status: string,
  year: number = new Date().getFullYear()
) {
  // Only handle balance changes if the request was previously approved
  if (previous_status !== 'approved') {
    return null
  }

  // If leave type changed, handle both old and new types
  if (old_leave_type_id !== new_leave_type_id) {
    // Restore days to old leave type
    await updateLeaveBalance({
      user_id,
      leave_type_id: old_leave_type_id,
      days_change: old_days_requested, // Positive to add days back
      organization_id,
      year
    })

    // Deduct days from new leave type
    return updateLeaveBalance({
      user_id,
      leave_type_id: new_leave_type_id,
      days_change: -new_days_requested, // Negative to deduct days
      organization_id,
      year
    })
  } else {
    // Same leave type, just adjust the difference
    const daysDifference = new_days_requested - old_days_requested
    if (daysDifference !== 0) {
      return updateLeaveBalance({
        user_id,
        leave_type_id: new_leave_type_id,
        days_change: -daysDifference, // Negative to deduct additional days
        organization_id,
        year
      })
    }
  }

  return null // No balance change needed
} 