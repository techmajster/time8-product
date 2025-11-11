/**
 * Seat Calculation Logic
 * 
 * Centralized logic for calculating seat requirements, limits, and billing.
 * Used across billing endpoints and UI components.
 */

export const BILLING_CONSTANTS = {
  FREE_SEATS: 3,
  MIN_PAID_SEATS: 1,
  MAX_SEATS_PER_VARIANT: 100 // Adjust based on business rules
} as const;

/**
 * Calculate required paid seats based on employee count
 * Business logic: Up to 3 users are free. 4+ users pay for ALL seats.
 */
export function calculateRequiredPaidSeats(currentEmployees: number): number {
  const FREE_TIER_LIMIT = BILLING_CONSTANTS.FREE_SEATS; // 3
  // If 4+ users, pay for ALL seats. If 1-3 users, free tier (0 paid seats).
  return currentEmployees > FREE_TIER_LIMIT ? currentEmployees : 0;
}

/**
 * Calculate total available seats for graduated pricing model
 *
 * GRADUATED PRICING MODEL:
 * - Tier 1 (1-3 users): FREE - paidSeats = 0, totalSeats = 3
 * - Tier 2 (4+ users): Pay for ALL seats - paidSeats = totalUsers, totalSeats = paidSeats
 *
 * Example:
 * - 2 users: paidSeats = 0, returns 3 (free tier)
 * - 9 users: paidSeats = 9, returns 9 (paid tier - the 3 free seats are INCLUDED, not ADDITIONAL)
 *
 * Note: The FREE_SEATS constant (3) represents a pricing tier threshold,
 * not additional capacity on top of paid seats.
 */
export function calculateTotalSeats(paidSeats: number): number {
  // If organization has paid seats (4+ users), total capacity = paid seats
  // If organization has no paid seats (0-3 users), capacity = free tier limit
  return paidSeats > 0 ? paidSeats : BILLING_CONSTANTS.FREE_SEATS;
}

/**
 * Calculate remaining seats available
 */
export function calculateRemainingSeats(paidSeats: number, currentEmployees: number): number {
  const totalSeats = calculateTotalSeats(paidSeats);
  return Math.max(0, totalSeats - currentEmployees);
}

/**
 * Check if organization needs to upgrade to add more employees
 */
export function needsUpgrade(currentEmployees: number, paidSeats: number): boolean {
  const totalSeats = calculateTotalSeats(paidSeats);
  return currentEmployees >= totalSeats;
}

/**
 * Validate if a variant provides enough seats for current employee count
 */
export function validateVariantForEmployeeCount(
  currentEmployees: number, 
  variantSeats: number
): boolean {
  const requiredPaidSeats = calculateRequiredPaidSeats(currentEmployees);
  return variantSeats >= requiredPaidSeats;
}

/**
 * Get the minimum variant size needed for an organization
 */
export function getMinimumVariantSize(currentEmployees: number): number {
  return calculateRequiredPaidSeats(currentEmployees);
}

/**
 * Calculate seat utilization percentage
 */
export function calculateSeatUtilization(currentEmployees: number, paidSeats: number): number {
  const totalSeats = calculateTotalSeats(paidSeats);
  if (totalSeats === 0) return 0;
  return Math.round((currentEmployees / totalSeats) * 100);
}

/**
 * Determine seat status (safe, warning, full, over)
 */
export function getSeatStatus(
  currentEmployees: number, 
  paidSeats: number
): 'safe' | 'warning' | 'full' | 'over' {
  const totalSeats = calculateTotalSeats(paidSeats);
  const utilization = calculateSeatUtilization(currentEmployees, paidSeats);

  if (currentEmployees > totalSeats) {
    return 'over';
  } else if (currentEmployees === totalSeats) {
    return 'full';
  } else if (utilization >= 80) {
    return 'warning';
  } else {
    return 'safe';
  }
}

/**
 * Get seat status message for UI display
 */
export function getSeatStatusMessage(
  currentEmployees: number, 
  paidSeats: number
): string {
  const status = getSeatStatus(currentEmployees, paidSeats);
  const totalSeats = calculateTotalSeats(paidSeats);
  const remaining = calculateRemainingSeats(paidSeats, currentEmployees);

  switch (status) {
    case 'over':
      const overage = currentEmployees - totalSeats;
      return `Over capacity by ${overage} seat${overage > 1 ? 's' : ''}. Upgrade required.`;
    
    case 'full':
      return 'At full capacity. Upgrade to add more employees.';
    
    case 'warning':
      return `${remaining} seat${remaining > 1 ? 's' : ''} remaining. Consider upgrading soon.`;
    
    case 'safe':
      return `${remaining} seat${remaining > 1 ? 's' : ''} available.`;
    
    default:
      return 'Seat status unavailable';
  }
}

/**
 * Calculate billing impact of adding employees
 */
export function calculateBillingImpact(
  currentEmployees: number,
  newEmployeeCount: number,
  currentPaidSeats: number
): {
  needsUpgrade: boolean;
  requiredPaidSeats: number;
  additionalSeats: number;
  canAddWithoutUpgrade: boolean;
} {
  const totalEmployeesAfter = currentEmployees + newEmployeeCount;
  const requiredPaidSeats = calculateRequiredPaidSeats(totalEmployeesAfter);
  const additionalSeats = Math.max(0, requiredPaidSeats - currentPaidSeats);
  
  return {
    needsUpgrade: requiredPaidSeats > currentPaidSeats,
    requiredPaidSeats,
    additionalSeats,
    canAddWithoutUpgrade: additionalSeats === 0
  };
}

/**
 * Get upgrade suggestions based on current usage
 */
export function getUpgradeSuggestions(
  currentEmployees: number,
  paidSeats: number,
  availableVariants: Array<{ quantity: number; name: string; price: number }>
): Array<{
  variant: { quantity: number; name: string; price: number };
  suitability: 'minimum' | 'recommended' | 'growth';
  totalSeats: number;
  additionalSeats: number;
}> {
  const requiredPaidSeats = calculateRequiredPaidSeats(currentEmployees);
  
  return availableVariants
    .filter(variant => variant.quantity > paidSeats) // Only show upgrades
    .map(variant => {
      const totalSeats = calculateTotalSeats(variant.quantity);
      const additionalSeats = variant.quantity - paidSeats;
      
      let suitability: 'minimum' | 'recommended' | 'growth';
      if (variant.quantity === requiredPaidSeats) {
        suitability = 'minimum';
      } else if (variant.quantity <= requiredPaidSeats + 2) {
        suitability = 'recommended';
      } else {
        suitability = 'growth';
      }

      return {
        variant,
        suitability,
        totalSeats,
        additionalSeats
      };
    })
    .sort((a, b) => a.variant.quantity - b.variant.quantity);
}

/**
 * Check if billing override is active and valid
 */
export function checkBillingOverride(
  billingOverrideSeats: number | null,
  billingOverrideExpiresAt: string | null
): {
  isActive: boolean;
  isExpired: boolean;
  effectiveSeats: number | null;
} {
  if (!billingOverrideSeats || billingOverrideSeats <= 0) {
    return {
      isActive: false,
      isExpired: false,
      effectiveSeats: null
    };
  }

  const isExpired = billingOverrideExpiresAt ? 
    new Date(billingOverrideExpiresAt) < new Date() : 
    false;

  return {
    isActive: !isExpired,
    isExpired,
    effectiveSeats: isExpired ? null : billingOverrideSeats
  };
}

/**
 * Calculate effective seat limit considering overrides
 */
export function calculateEffectiveSeatLimit(
  paidSeats: number,
  billingOverrideSeats: number | null,
  billingOverrideExpiresAt: string | null
): number {
  const override = checkBillingOverride(billingOverrideSeats, billingOverrideExpiresAt);
  
  if (override.isActive && override.effectiveSeats) {
    return calculateTotalSeats(override.effectiveSeats);
  }
  
  return calculateTotalSeats(paidSeats);
}

/**
 * Calculate comprehensive seat information including pending invitations
 * This is the SINGLE SOURCE OF TRUTH for seat calculations across the app
 */
export function calculateComprehensiveSeatInfo(
  paidSeats: number,
  currentActiveMembers: number,
  pendingInvitations: number,
  billingOverrideSeats: number | null = null,
  billingOverrideExpiresAt: string | null = null
): {
  totalSeats: number;
  paidSeats: number;
  freeSeats: number;
  currentActiveMembers: number;
  pendingInvitations: number;
  totalUsedSeats: number;
  availableSeats: number;
  utilizationPercentage: number;
  canAddMore: boolean;
} {
  const seatLimit = calculateEffectiveSeatLimit(
    paidSeats,
    billingOverrideSeats,
    billingOverrideExpiresAt
  );

  const totalUsedSeats = currentActiveMembers + pendingInvitations;
  const availableSeats = Math.max(0, seatLimit - totalUsedSeats);
  const utilizationPercentage = seatLimit > 0 ? Math.round((totalUsedSeats / seatLimit) * 100) : 0;

  return {
    totalSeats: seatLimit,
    paidSeats: paidSeats,
    freeSeats: BILLING_CONSTANTS.FREE_SEATS,
    currentActiveMembers,
    pendingInvitations,
    totalUsedSeats,
    availableSeats,
    utilizationPercentage,
    canAddMore: availableSeats > 0
  };
}

/**
 * Validate employee invitation against seat limits
 * IMPORTANT: Use calculateComprehensiveSeatInfo() for accurate seat counts
 */
export function validateEmployeeInvitation(
  currentEmployees: number,
  paidSeats: number,
  newInvitations: number = 1,
  billingOverrideSeats: number | null = null,
  billingOverrideExpiresAt: string | null = null
): {
  canInvite: boolean;
  reason?: string;
  availableSeats: number;
  totalSeatsAfterInvite: number;
  seatLimit: number;
} {
  const seatLimit = calculateEffectiveSeatLimit(
    paidSeats,
    billingOverrideSeats,
    billingOverrideExpiresAt
  );

  const totalSeatsAfterInvite = currentEmployees + newInvitations;
  const availableSeats = seatLimit - currentEmployees;
  const canInvite = totalSeatsAfterInvite <= seatLimit;

  let reason: string | undefined;
  if (!canInvite) {
    if (availableSeats <= 0) {
      reason = 'No available seats. Upgrade required to invite more employees.';
    } else {
      reason = `Only ${availableSeats} seat${availableSeats > 1 ? 's' : ''} available. Cannot invite ${newInvitations} employee${newInvitations > 1 ? 's' : ''}.`;
    }
  }

  return {
    canInvite,
    reason,
    availableSeats,
    totalSeatsAfterInvite,
    seatLimit
  };
}