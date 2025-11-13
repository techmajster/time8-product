/**
 * SeatManager Service
 *
 * Centralized service for managing seats in hybrid billing system.
 * Routes to correct billing method based on subscription type:
 * - usage_based (monthly): Creates usage records, charged at end of period
 * - quantity_based (yearly): PATCH subscription quantity, charged immediately with proration
 *
 * CRITICAL: Do NOT modify existing monthly subscription workflow
 */

import { createAdminClient } from '@/lib/supabase/server';

/**
 * Result returned after seat change operations
 */
export interface SeatChangeResult {
  success: boolean;
  billingType: 'usage_based' | 'quantity_based';
  chargedAt: 'immediately' | 'end_of_period';
  prorationAmount?: number;
  daysRemaining?: number;
  message: string;
  currentSeats: number;
}

/**
 * Proration calculation details (only for quantity-based)
 */
export interface ProrationDetails {
  amount: number;
  daysRemaining: number;
  seatsAdded: number;
  yearlyPricePerSeat?: number;
  message: string;
}

/**
 * Internal subscription data structure
 */
interface Subscription {
  id: string;
  billing_type: 'usage_based' | 'quantity_based' | 'volume';
  current_seats: number;
  lemonsqueezy_subscription_item_id: string | null;
  lemonsqueezy_subscription_id?: string | null;
  organization_id: string;
}

/**
 * SeatManager handles seat additions and removals for both billing types
 */
export class SeatManager {
  /**
   * Add seats to a subscription
   * Routes to correct method based on billing_type
   *
   * @param subscriptionId - Database subscription ID (NOT LemonSqueezy ID)
   * @param newQuantity - Total desired seats (not additional, but final count)
   * @returns Result with billing-specific information
   */
  async addSeats(subscriptionId: string, newQuantity: number): Promise<SeatChangeResult> {
    console.log(`🎫 [SeatManager] addSeats called:`, {
      subscriptionId,
      newQuantity
    });

    // Fetch subscription from database
    const subscription = await this.getSubscription(subscriptionId);

    if (subscription.current_seats === newQuantity) {
      throw new Error('New quantity must be different from current seats');
    }

    if (newQuantity < subscription.current_seats) {
      throw new Error('Use removeSeats() to decrease seat count');
    }

    // Route based on billing type
    if (subscription.billing_type === 'usage_based') {
      return await this.addSeatsUsageBased(subscription, newQuantity);
    } else if (subscription.billing_type === 'quantity_based') {
      return await this.addSeatsQuantityBased(subscription, newQuantity);
    } else {
      throw new Error(`Unknown billing type: ${subscription.billing_type}`);
    }
  }

  /**
   * Remove seats from a subscription
   * Routes to correct method based on billing_type
   *
   * @param subscriptionId - Database subscription ID
   * @param newQuantity - Total desired seats after removal
   * @returns Result with billing-specific information
   */
  async removeSeats(subscriptionId: string, newQuantity: number): Promise<SeatChangeResult> {
    console.log(`🎫 [SeatManager] removeSeats called:`, {
      subscriptionId,
      newQuantity
    });

    // Fetch subscription from database
    const subscription = await this.getSubscription(subscriptionId);

    if (newQuantity >= subscription.current_seats) {
      throw new Error('Use addSeats() to increase seat count');
    }

    // Route based on billing type (same logic as addSeats, just lower quantity)
    if (subscription.billing_type === 'usage_based') {
      return await this.addSeatsUsageBased(subscription, newQuantity);
    } else if (subscription.billing_type === 'quantity_based') {
      return await this.addSeatsQuantityBased(subscription, newQuantity);
    } else {
      throw new Error(`Unknown billing type: ${subscription.billing_type}`);
    }
  }

  /**
   * Calculate proration cost for UI preview (only for quantity-based)
   *
   * @param subscriptionId - Database subscription ID
   * @param newQuantity - Desired total seats
   * @returns Proration details including amount and days remaining
   */
  async calculateProration(subscriptionId: string, newQuantity: number): Promise<ProrationDetails> {
    // Fetch subscription from database
    const subscription = await this.getSubscription(subscriptionId);

    // Proration only applies to quantity-based (yearly) subscriptions
    if (subscription.billing_type !== 'quantity_based') {
      return {
        amount: 0,
        daysRemaining: 0,
        seatsAdded: 0,
        message: 'Proration not applicable for usage-based subscriptions'
      };
    }

    // Fetch subscription details from LemonSqueezy for renews_at date
    if (!subscription.lemonsqueezy_subscription_id) {
      throw new Error(`Missing lemonsqueezy_subscription_id for subscription ${subscription.id}`);
    }

    const response = await fetch(
      `https://api.lemonsqueezy.com/v1/subscriptions/${subscription.lemonsqueezy_subscription_id}`,
      {
        headers: {
          'Accept': 'application/vnd.api+json',
          'Authorization': `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch subscription from LemonSqueezy`);
    }

    const data = await response.json();
    const renewsAt = new Date(data.data.attributes.renews_at);
    const now = new Date();

    // Calculate days remaining in current billing period
    const msRemaining = renewsAt.getTime() - now.getTime();
    const daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));
    const totalDays = 365; // Yearly subscription

    // Calculate seats added or removed
    const seatDiff = newQuantity - subscription.current_seats;
    const seatsAdded = Math.max(0, seatDiff);

    if (seatDiff <= 0) {
      // Removing seats - credit will be applied at renewal
      return {
        amount: 0,
        daysRemaining,
        seatsAdded: 0,
        message: 'Credit will be applied at next renewal'
      };
    }

    // Get yearly price per seat from environment
    const yearlyPricePerSeat = parseFloat(process.env.YEARLY_PRICE_PER_SEAT || '1200');

    // Calculate prorated amount
    // Formula: (seats_added × yearly_price × days_remaining) / total_days
    const prorationAmount = (seatsAdded * yearlyPricePerSeat * daysRemaining) / totalDays;

    console.log(`💵 [SeatManager] Proration calculated:`, {
      subscriptionId: subscription.id,
      currentSeats: subscription.current_seats,
      newQuantity,
      seatsAdded,
      yearlyPricePerSeat,
      daysRemaining,
      totalDays,
      prorationAmount: Math.round(prorationAmount * 100) / 100
    });

    return {
      amount: Math.round(prorationAmount * 100) / 100, // Round to 2 decimals
      daysRemaining,
      seatsAdded,
      yearlyPricePerSeat,
      message: `${seatsAdded} seat${seatsAdded > 1 ? 's' : ''} for ${daysRemaining} days`
    };
  }

  /**
   * PRIVATE: Handle seat changes for usage-based (monthly) subscriptions
   * Creates usage record with new quantity - charged at end of billing period
   *
   * @param subscription - Subscription data from database
   * @param newQuantity - Total desired seats
   * @returns Result with usage-based billing info
   */
  private async addSeatsUsageBased(
    subscription: Subscription,
    newQuantity: number
  ): Promise<SeatChangeResult> {
    console.log(`📊 [SeatManager] Adding seats via usage record (monthly)`, {
      subscriptionId: subscription.id,
      currentSeats: subscription.current_seats,
      newQuantity,
      billingType: 'usage_based',
      organizationId: subscription.organization_id
    });

    // Validate subscription_item_id exists
    if (!subscription.lemonsqueezy_subscription_item_id) {
      throw new Error(`Missing subscription_item_id for subscription ${subscription.id}. Cannot create usage record.`);
    }

    // POST to usage records endpoint (corrected: use /usage-records with subscription-item in relationships)
    const response = await fetch(
      `https://api.lemonsqueezy.com/v1/usage-records`,
      {
        method: 'POST',
        headers: {
          'Accept': 'application/vnd.api+json',
          'Content-Type': 'application/vnd.api+json',
          'Authorization': `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`
        },
        body: JSON.stringify({
          data: {
            type: 'usage-records',
            attributes: {
              quantity: newQuantity
            },
            relationships: {
              'subscription-item': {
                data: {
                  type: 'subscription-items',
                  id: subscription.lemonsqueezy_subscription_item_id.toString()
                }
              }
            }
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [SeatManager] Failed to create usage record:`, {
        status: response.status,
        error: errorText,
        subscriptionId: subscription.id,
        subscriptionItemId: subscription.lemonsqueezy_subscription_item_id
      });
      throw new Error(`Failed to create usage record: ${errorText}`);
    }

    const data = await response.json();
    console.log(`✅ [SeatManager] Usage record API Response:`, {
      status: response.status,
      usageRecordId: data.data?.id,
      returnedQuantity: data.data?.attributes?.quantity,
      requestedQuantity: newQuantity,
      fullResponse: JSON.stringify(data, null, 2),
      subscriptionId: subscription.id,
      subscriptionItemId: subscription.lemonsqueezy_subscription_item_id
    });

    // Update local database
    await this.updateSubscriptionSeats(subscription.id, newQuantity);

    return {
      success: true,
      billingType: 'usage_based',
      chargedAt: 'end_of_period',
      message: 'New seats will be billed at end of current billing period',
      currentSeats: newQuantity
    };
  }

  /**
   * PRIVATE: Handle seat changes for quantity-based (yearly) subscriptions
   * PATCH subscription quantity with immediate proration charge
   *
   * @param subscription - Subscription data from database
   * @param newQuantity - Total desired seats
   * @returns Result with quantity-based billing info including proration
   */
  private async addSeatsQuantityBased(
    subscription: Subscription,
    newQuantity: number
  ): Promise<SeatChangeResult> {
    console.log(`💰 [SeatManager] Adding seats via quantity update (yearly)`, {
      subscriptionId: subscription.id,
      currentSeats: subscription.current_seats,
      newQuantity,
      billingType: 'quantity_based',
      organizationId: subscription.organization_id
    });

    // Validate subscription_item_id exists
    if (!subscription.lemonsqueezy_subscription_item_id) {
      throw new Error(`Missing subscription_item_id for subscription ${subscription.id}. Cannot update quantity.`);
    }

    // Calculate proration for logging and response
    const proration = await this.calculateProration(subscription.id, newQuantity);

    console.log(`💵 [SeatManager] Proration calculated:`, {
      amount: proration.amount,
      daysRemaining: proration.daysRemaining,
      seatsAdded: proration.seatsAdded,
      subscriptionId: subscription.id
    });

    // PATCH to subscription-items endpoint
    const response = await fetch(
      `https://api.lemonsqueezy.com/v1/subscription-items/${subscription.lemonsqueezy_subscription_item_id}`,
      {
        method: 'PATCH',
        headers: {
          'Accept': 'application/vnd.api+json',
          'Content-Type': 'application/vnd.api+json',
          'Authorization': `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`
        },
        body: JSON.stringify({
          data: {
            type: 'subscription-items',
            id: subscription.lemonsqueezy_subscription_item_id,
            attributes: {
              quantity: newQuantity,
              invoice_immediately: true // CRITICAL: Charge now, not at renewal
            }
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [SeatManager] Failed to update quantity:`, {
        status: response.status,
        error: errorText,
        subscriptionId: subscription.id,
        subscriptionItemId: subscription.lemonsqueezy_subscription_item_id
      });
      throw new Error(`Failed to update subscription quantity: ${errorText}`);
    }

    const data = await response.json();
    console.log(`✅ [SeatManager] Quantity updated (LemonSqueezy API Response):`, {
      status: response.status,
      subscriptionItemId: data.data?.id,
      returnedQuantity: data.data?.attributes?.quantity,
      requestedQuantity: newQuantity,
      fullResponse: JSON.stringify(data, null, 2),
      subscriptionId: subscription.id
    });

    // Update local database
    await this.updateSubscriptionSeats(subscription.id, newQuantity);

    return {
      success: true,
      billingType: 'quantity_based',
      chargedAt: 'immediately',
      prorationAmount: proration.amount,
      daysRemaining: proration.daysRemaining,
      message: `You will be charged $${proration.amount.toFixed(2)} for ${proration.daysRemaining} remaining days`,
      currentSeats: newQuantity
    };
  }

  /**
   * PRIVATE: Fetch subscription from database
   *
   * @param subscriptionId - Database subscription ID
   * @returns Subscription data
   */
  private async getSubscription(subscriptionId: string): Promise<Subscription> {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('subscriptions')
      .select('id, billing_type, current_seats, lemonsqueezy_subscription_item_id, lemonsqueezy_subscription_id, organization_id')
      .eq('id', subscriptionId)
      .single();

    if (error || !data) {
      console.error(`❌ [SeatManager] Subscription not found:`, {
        subscriptionId,
        error: error?.message
      });
      throw new Error(`Subscription not found: ${subscriptionId}`);
    }

    return data as Subscription;
  }

  /**
   * PRIVATE: Update subscription seats in database
   *
   * @param subscriptionId - Database subscription ID
   * @param newQuantity - New seat count
   */
  private async updateSubscriptionSeats(subscriptionId: string, newQuantity: number): Promise<void> {
    const supabase = createAdminClient();

    const { error } = await supabase
      .from('subscriptions')
      .update({ current_seats: newQuantity })
      .eq('id', subscriptionId)
      .single();

    if (error) {
      console.error(`❌ [SeatManager] Failed to update database:`, {
        subscriptionId,
        newQuantity,
        error: error.message
      });
      throw new Error(`Failed to update subscription in database: ${error.message}`);
    }

    console.log(`✅ [SeatManager] Database updated:`, {
      subscriptionId,
      newSeats: newQuantity
    });
  }
}
