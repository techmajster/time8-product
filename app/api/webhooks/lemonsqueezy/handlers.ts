/**
 * Lemon Squeezy Webhook Event Handlers
 *
 * Handles processing of subscription lifecycle events from Lemon Squeezy webhooks.
 */

import { createAdminClient } from '@/lib/supabase/server';

export interface EventResult {
  success: boolean;
  error?: string;
  data?: any;
}

/**
 * Valid subscription statuses according to Lemon Squeezy
 */
const VALID_SUBSCRIPTION_STATUSES = [
  'active',
  'past_due',
  'cancelled',
  'expired',
  'on_trial',
  'paused'
] as const;

type SubscriptionStatus = typeof VALID_SUBSCRIPTION_STATUSES[number];

/**
 * Logs billing events to the database
 */
export async function logBillingEvent(
  eventType: string,
  eventId: string,
  payload: any,
  status: 'processed' | 'failed' | 'skipped' = 'processed',
  errorMessage?: string
): Promise<void> {
  try {
    const supabase = createAdminClient();
    
    await supabase
      .from('billing_events')
      .insert({
        event_type: eventType,
        lemonsqueezy_event_id: eventId,
        payload,
        status,
        error_message: errorMessage || null
      });
  } catch (error) {
    console.error('Failed to log billing event:', error);
    // Don't throw - logging failure shouldn't break webhook processing
  }
}

/**
 * Checks if an event has already been processed (idempotency)
 */
export async function isEventAlreadyProcessed(eventId: string): Promise<boolean> {
  try {
    const supabase = createAdminClient();
    
    const { data, error } = await supabase
      .from('billing_events')
      .select('id')
      .eq('lemonsqueezy_event_id', eventId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error checking event status:', error);
      return false; // If we can't check, process anyway
    }

    return !!data;
  } catch (error) {
    console.error('Error checking event processing status:', error);
    return false;
  }
}

/**
 * Validates subscription payload structure
 * Note: event_id is optional in some webhooks, quantity may be undefined for cancelled subscriptions
 */
function validateSubscriptionPayload(payload: any): boolean {
  // Check if payload has basic structure
  if (!payload || !payload.data) {
    console.error('❌ [Validation] Missing payload or payload.data');
    return false;
  }

  // Check meta object exists
  if (!payload.meta) {
    console.error('❌ [Validation] Missing payload.meta');
    return false;
  }

  // Check required fields
  const hasEventName = !!payload.meta.event_name;
  const hasDataId = !!payload.data.id;
  const hasAttributes = !!payload.data.attributes;
  const hasStatus = typeof payload.data.attributes?.status === 'string';

  console.log('🔍 [Validation] Payload structure check:', {
    hasEventName,
    hasDataId,
    hasAttributes,
    hasStatus,
    eventName: payload.meta?.event_name,
    dataId: payload.data?.id,
    status: payload.data?.attributes?.status
  });

  return (
    hasEventName &&
    hasDataId &&
    hasAttributes &&
    hasStatus
    // Note: event_id, quantity, and customer_id are optional depending on webhook type
  );
}

/**
 * Ensures event_id exists, generates one if not provided by LemonSqueezy
 */
function ensureEventId(payload: any): string {
  if (payload?.meta?.event_id) {
    return payload.meta.event_id;
  }
  // Generate fallback event_id if not provided
  const eventName = payload?.meta?.event_name || 'unknown';
  const subscriptionId = payload?.data?.id || 'unknown';
  return `${eventName}-${subscriptionId}-${Date.now()}`;
}

/**
 * Validates subscription status
 */
function isValidSubscriptionStatus(status: string): status is SubscriptionStatus {
  return VALID_SUBSCRIPTION_STATUSES.includes(status as SubscriptionStatus);
}

/**
 * Finds or creates customer record by LemonSqueezy customer ID only
 * Multi-workspace support: One LemonSqueezy customer can have multiple subscriptions
 * Organization linkage happens at the SUBSCRIPTION level via custom_data
 */
async function findOrCreateCustomer(
  supabase: any,
  lemonsqueezyCustomerId: string,
  customerEmail?: string
): Promise<{ data: any; error: any }> {
  console.log(`🔍 Looking up customer by lemonsqueezy_customer_id: ${lemonsqueezyCustomerId}`);

  // Try to find existing customer by LemonSqueezy customer ID
  const { data: existingCustomer, error: findError } = await supabase
    .from('customers')
    .select('*')
    .eq('lemonsqueezy_customer_id', lemonsqueezyCustomerId)
    .single();

  if (findError && findError.code !== 'PGRST116') {
    // Error other than "not found"
    console.error('❌ Error finding customer:', findError);
    return { data: null, error: findError };
  }

  if (existingCustomer) {
    console.log(`✅ Found existing customer: ${existingCustomer.email} (${existingCustomer.id})`);
    return { data: existingCustomer, error: null };
  }

  // Customer doesn't exist - create new one
  // NOTE: organization_id is now nullable, we don't need to link customers to orgs
  console.log(`📝 Creating new customer record for: ${customerEmail}`);

  const { data: newCustomer, error: customerError } = await supabase
    .from('customers')
    .insert({
      organization_id: null, // No longer tie customers to specific organizations
      lemonsqueezy_customer_id: lemonsqueezyCustomerId,
      email: customerEmail
    })
    .select()
    .single();

  if (customerError) {
    console.error('❌ Error creating customer:', customerError);
    return { data: null, error: customerError };
  }

  console.log(`✅ Created customer record: ${newCustomer.email} (${newCustomer.id}), lemon_squeezy=${lemonsqueezyCustomerId}`);
  return { data: newCustomer, error: null };
}

/**
 * Updates organization subscription based on status and quantity
 * Note: quantity from Lemon Squeezy represents total users (volume pricing)
 * paid_seats = total_users - 3 free seats
 */
async function updateOrganizationSubscription(
  supabase: any,
  organizationId: string,
  totalUsers: number,
  status: string
): Promise<void> {
  try {
    const FREE_TIER_LIMIT = 3;
    // Business logic: Up to 3 users are free. 4+ users pay for ALL seats.
    const paidSeats = totalUsers > FREE_TIER_LIMIT ? totalUsers : 0;

    const updates: any = { paid_seats: paidSeats };
    
    // Update subscription tier based on status and quantity
    if (status === 'active' && totalUsers > 0) {
      updates.subscription_tier = 'active';
    } else {
      updates.subscription_tier = 'free';
    }

    await supabase
      .from('organizations')
      .update(updates)
      .eq('id', organizationId);
      
    console.log(`✅ Updated organization ${organizationId}: total_users=${totalUsers}, paid_seats=${paidSeats}, subscription_tier=${updates.subscription_tier}`);
  } catch (error) {
    console.error('Failed to update organization subscription:', error);
    // Don't throw - subscription update failure shouldn't break webhook processing
  }
}

/**
 * Processes subscription.created event
 */
export async function processSubscriptionCreated(payload: any): Promise<EventResult> {
  try {
    // Validate payload structure
    if (!validateSubscriptionPayload(payload)) {
      const error = 'Invalid payload structure for subscription.created event';
      await logBillingEvent(
        payload?.meta?.event_name || 'subscription_created',
        payload?.meta?.event_id || 'unknown',
        payload,
        'failed',
        error
      );
      return { success: false, error };
    }

    const { meta, data } = payload;
    const { id: subscriptionId, attributes } = data;
    const { status, customer_id, variant_id, product_id, renews_at, ends_at, trial_ends_at, first_subscription_item } = attributes;

    // Extract quantity from first_subscription_item (where LemonSqueezy stores it)
    const quantity = first_subscription_item?.quantity || 0;

    // Validate subscription status
    if (!isValidSubscriptionStatus(status)) {
      const error = `Invalid subscription status: ${status}`;
      await logBillingEvent(meta.event_name, meta.event_id, payload, 'failed', error);
      return { success: false, error };
    }

    // Check if event already processed
    if (await isEventAlreadyProcessed(meta.event_id)) {
      await logBillingEvent(meta.event_name, meta.event_id, payload, 'skipped', 'Event already processed');
      return { success: true, data: { message: 'Event already processed' } };
    }

    const supabase = createAdminClient();

    // TWO-PRODUCT MIGRATION: Detect migration BEFORE customer lookup
    // If this is a migration (monthly→yearly upgrade), reuse existing customer
    const migrationFromSubscriptionId = meta.custom_data?.migration_from_subscription_id;
    let customer = null;
    let customerError = null;

    if (migrationFromSubscriptionId) {
      console.log(`🔄 [Webhook] Migration detected from subscription ${migrationFromSubscriptionId}`);
      console.log(`   Reusing existing customer instead of creating new one`);

      // Find the old subscription to get its customer
      const { data: oldSubscription, error: oldSubError } = await supabase
        .from('subscriptions')
        .select('customer_id, organization_id')
        .eq('lemonsqueezy_subscription_id', migrationFromSubscriptionId)
        .single();

      if (oldSubError || !oldSubscription) {
        const error = `Migration failed: Could not find old subscription ${migrationFromSubscriptionId}`;
        await logBillingEvent(meta.event_name, meta.event_id, payload, 'failed', error);
        return { success: false, error };
      }

      // Reuse the existing customer from the old subscription
      const { data: existingCustomer, error: existingCustomerError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', oldSubscription.customer_id)
        .single();

      if (existingCustomerError || !existingCustomer) {
        const error = `Migration failed: Could not find existing customer for old subscription`;
        await logBillingEvent(meta.event_name, meta.event_id, payload, 'failed', error);
        return { success: false, error };
      }

      customer = existingCustomer;
      console.log(`✅ [Webhook] Reusing existing customer ${customer.id} for organization ${customer.organization_id}`);
    } else {
      // Normal flow: Find or create customer
      const result = await findOrCreateCustomer(
        supabase,
        customer_id.toString(),
        attributes.user_email
      );
      customer = result.data;
      customerError = result.error;

      if (customerError) {
        const error = `Customer lookup failed: ${customerError.message}`;
        await logBillingEvent(meta.event_name, meta.event_id, payload, 'failed', error);
        return { success: false, error };
      }

      if (!customer) {
        const error = 'Customer not found and could not be created';
        await logBillingEvent(meta.event_name, meta.event_id, payload, 'failed', error);
        return { success: false, error };
      }
    }

    // CRITICAL FIX: Extract organization_id from custom_data for multi-workspace support
    // Do NOT use customer.organization_id (which may be null or from a different workspace)
    const organizationId = meta.custom_data?.organization_id;

    if (!organizationId) {
      const error = 'Missing organization_id in webhook custom_data - cannot link subscription to organization';
      console.error(`❌ [Webhook] ${error}`, { customData: meta.custom_data });
      await logBillingEvent(meta.event_name, meta.event_id, payload, 'failed', error);
      return { success: false, error };
    }

    // Validate that organization exists before creating subscription
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('id', organizationId)
      .single();

    if (orgError || !organization) {
      const error = `Organization not found: ${organizationId}`;
      console.error(`❌ [Webhook] ${error}`, { organizationId, orgError });
      await logBillingEvent(meta.event_name, meta.event_id, payload, 'failed', error);
      return { success: false, error };
    }

    console.log(`✅ [Webhook] Validated organization: ${organization.name} (${organization.id})`);


    // Extract subscription_item_id for usage records API
    const subscriptionItemId = first_subscription_item?.id;

    if (!subscriptionItemId) {
      console.error(`❌ [Webhook] Missing subscription_item_id in payload:`, {
        subscriptionId,
        organizationId // Use organizationId from custom_data
      });
    }

    // DETECT billing type based on variant_id (monthly vs yearly)
    let billingType: 'usage_based' | 'quantity_based' | 'volume';

    const monthlyVariantId = parseInt(process.env.LEMONSQUEEZY_MONTHLY_VARIANT_ID || '0');
    const yearlyVariantId = parseInt(process.env.LEMONSQUEEZY_YEARLY_VARIANT_ID || '0');

    if (variant_id === monthlyVariantId) {
      billingType = 'usage_based'; // Monthly: usage records, charged at end of period
      console.log(`🎫 [Webhook] Detected MONTHLY subscription (usage_based):`, {
        subscriptionId,
        variantId: variant_id,
        organizationId, // Use organizationId from custom_data
        note: 'Will create usage records - charged at end of billing period'
      });
    } else if (variant_id === yearlyVariantId) {
      billingType = 'quantity_based'; // Yearly: quantity updates, charged immediately with proration
      console.log(`🎫 [Webhook] Detected YEARLY subscription (quantity_based):`, {
        subscriptionId,
        variantId: variant_id,
        organizationId, // Use organizationId from custom_data
        note: 'Will use quantity updates - charged immediately with proration'
      });
    } else {
      // Unknown variant - this should not happen in production
      const error = `Unknown variant ID: ${variant_id}. Expected ${monthlyVariantId} (monthly) or ${yearlyVariantId} (yearly)`;
      console.error(`❌ [Webhook] ${error}`);
      await logBillingEvent(meta.event_name, meta.event_id, payload, 'failed', error);
      return { success: false, error };
    }

    // Log before state for comprehensive debugging
    console.log(`📊 [Webhook] subscription_created - Before:`, {
      subscriptionId,
      subscriptionItemId,
      organizationId, // Use organizationId from custom_data
      customerId: customer.id,
      status,
      quantity,
      variant_id,
      billingType, // NEW: Log detected billing type
      correlationId: meta.event_id,
      usageBasedBilling: first_subscription_item?.is_usage_based,
      note: `Billing type: ${billingType}`
    });

    // Calculate user_count for subscription setup
    // For usage-based billing: user_count from custom_data drives access control
    const userCount = parseInt(meta.custom_data?.user_count || '0');

    // CRITICAL BUG FIX: Extract billing_period from custom_data
    // The tier field ('monthly' or 'annual') is set during checkout
    // Map 'annual' to 'yearly' for consistency with database enum
    let billingPeriod: 'monthly' | 'yearly' | null = null;
    const tier = meta.custom_data?.tier;

    if (tier === 'monthly') {
      billingPeriod = 'monthly';
    } else if (tier === 'annual') {
      billingPeriod = 'yearly'; // Map 'annual' → 'yearly'
    } else {
      // Fallback: Infer from variant_id if tier not in custom_data
      if (variant_id === monthlyVariantId) {
        billingPeriod = 'monthly';
      } else if (variant_id === yearlyVariantId) {
        billingPeriod = 'yearly';
      }
    }

    console.log(`💳 [Webhook] Billing period determination:`, {
      tier_from_custom_data: tier,
      calculated_billing_period: billingPeriod,
      variant_id,
      fallback_used: !tier
    });

    // Create subscription record - CRITICAL FIX: Use organizationId from custom_data
    const { data: subscription, error: subscriptionError } = await supabase
      .from('subscriptions')
      .insert({
        organization_id: organizationId, // CRITICAL FIX: Use organizationId from custom_data, not customer.organization_id
        customer_id: customer.id,
        lemonsqueezy_subscription_id: subscriptionId,
        lemonsqueezy_subscription_item_id: subscriptionItemId || null,
        lemonsqueezy_variant_id: variant_id || null,
        lemonsqueezy_product_id: product_id?.toString() || null,
        billing_type: billingType, // NEW: Use detected billing type (usage_based or quantity_based)
        billing_period: billingPeriod, // CRITICAL FIX: Save billing period from custom_data
        status,
        quantity,
        current_seats: userCount,  // Use user_count from custom_data, not quantity from LemonSqueezy
        renews_at: renews_at || null,
        ends_at: ends_at || null,
        trial_ends_at: trial_ends_at || null
      })
      .select()
      .single();

    if (subscriptionError) {
      const error = `Subscription creation failed: ${subscriptionError.message}`;
      await logBillingEvent(meta.event_name, meta.event_id, payload, 'failed', error);
      return { success: false, error };
    }

    // Update organization subscription (pass total user_count, function calculates paid_seats)
    await updateOrganizationSubscription(supabase, organizationId, userCount, status);

    // Calculate paid_seats for logging (function already updated organization)
    const paidSeats = userCount > 3 ? userCount : 0;

    // Log after state for comprehensive debugging
    console.log(`✅ [Webhook] subscription_created - After:`, {
      subscriptionId,
      subscriptionItemId,
      organizationId, // Use organizationId from custom_data
      customerId: customer.id,
      status,
      quantity,
      current_seats: userCount,
      variant_id,
      userCount,
      paid_seats: paidSeats,
      freeTier: userCount <= 3,
      subscription_tier: status === 'active' && userCount > 0 ? 'active' : 'free',
      renewsAt: renews_at,
      endsAt: ends_at,
      trialEndsAt: trial_ends_at,
      correlationId: meta.event_id,
      usageBasedBilling: first_subscription_item?.is_usage_based,
      note: 'Subscription created with usage-based billing enabled'
    });

    // For usage-based billing ONLY: Create initial usage record if user_count is in custom_data
    // CRITICAL: Only create usage records for monthly (usage_based) subscriptions
    // Yearly (quantity_based) subscriptions do NOT use usage records
    // FREE TIER: 1-3 users = quantity 0 (no billing)
    // PAID TIER: 4+ users = quantity equals total users (pay for ALL seats)
    const desiredUserCount = parseInt(meta.custom_data?.user_count || '0');

    if (desiredUserCount > 0 && subscriptionItemId && billingType === 'usage_based') {
      // Calculate billable quantity based on free tier
      // 1-3 users: Free tier, quantity = 0
      // 4+ users: Pay for all seats, quantity = desiredUserCount
      const billableQuantity = desiredUserCount > 3 ? desiredUserCount : 0;

      console.log(`📊 [Webhook] Creating initial usage record:`, {
        subscriptionItemId,
        desiredUserCount,
        billableQuantity,
        freeTier: desiredUserCount <= 3,
        organizationName: meta.custom_data?.organization_name
      });

      try {
        const usageResponse = await fetch(
          'https://api.lemonsqueezy.com/v1/usage-records',
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`,
              'Accept': 'application/vnd.api+json',
              'Content-Type': 'application/vnd.api+json'
            },
            body: JSON.stringify({
              data: {
                type: 'usage-records',
                attributes: {
                  quantity: billableQuantity
                },
                relationships: {
                  'subscription-item': {
                    data: {
                      type: 'subscription-items',
                      id: subscriptionItemId.toString()
                    }
                  }
                }
              }
            })
          }
        );

        if (!usageResponse.ok) {
          const errorText = await usageResponse.text();
          console.error(`❌ [Webhook] Failed to create initial usage record:`, errorText);
        } else {
          const usageData = await usageResponse.json();
          console.log(`✅ [Webhook] Initial usage record created:`, {
            usageRecordId: usageData.data?.id,
            quantity: billableQuantity,
            freeTier: desiredUserCount <= 3
          });
        }
      } catch (usageError) {
        console.error(`❌ [Webhook] Error creating initial usage record:`, usageError);
        // Don't fail the webhook - log the error and continue
      }
    } else if (billingType === 'quantity_based') {
      // Yearly subscriptions: Skip usage record creation
      console.log(`⏭️  [Webhook] Skipping usage record for yearly (quantity_based) subscription:`, {
        subscriptionId,
        variantId: variant_id,
        organizationId, // Use organizationId from custom_data
        userCount: desiredUserCount,
        note: 'Yearly subscriptions use quantity updates, not usage records'
      });
    }

    // TWO-PRODUCT MIGRATION: Cancel old subscription if this was a migration
    // migrationFromSubscriptionId was already extracted earlier (line 359)
    if (migrationFromSubscriptionId) {
      console.log(`🔄 [Webhook] Migration cleanup: Canceling old subscription ${migrationFromSubscriptionId}`);

      try {
        // Cancel old subscription via LemonSqueezy API
        const cancelResponse = await fetch(
          `https://api.lemonsqueezy.com/v1/subscriptions/${migrationFromSubscriptionId}`,
          {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`,
              'Accept': 'application/vnd.api+json'
            }
          }
        );

        if (!cancelResponse.ok) {
          const errorData = await cancelResponse.json();
          console.error(`❌ [Webhook] Failed to cancel old subscription ${migrationFromSubscriptionId}:`, errorData);
          // Log error but don't fail the webhook - new subscription is already created
          await logBillingEvent(
            meta.event_name,
            meta.event_id,
            { error: 'Failed to cancel old subscription', details: errorData },
            'failed',
            `Migration cleanup failed for ${migrationFromSubscriptionId}`
          );
        } else {
          console.log(`✅ [Webhook] Successfully canceled old subscription ${migrationFromSubscriptionId}`);

          // Update old subscription status in database
          const { error: updateError } = await supabase
            .from('subscriptions')
            .update({
              status: 'migrated',
              migrated_to_subscription_id: subscriptionId,
              updated_at: new Date().toISOString()
            })
            .eq('lemonsqueezy_subscription_id', migrationFromSubscriptionId);

          if (updateError) {
            console.error(`⚠️ [Webhook] Failed to update old subscription status:`, updateError);
            // Log but don't fail - the cancellation succeeded
          } else {
            console.log(`✅ [Webhook] Updated old subscription status to 'migrated'`);
          }
        }
      } catch (error) {
        console.error(`❌ [Webhook] Error during migration cleanup:`, error);
        // Log error but don't fail the webhook
        await logBillingEvent(
          meta.event_name,
          meta.event_id,
          { error: 'Migration cleanup exception', details: error },
          'failed',
          `Migration cleanup exception for ${migrationFromSubscriptionId}`
        );
      }
    }

    await logBillingEvent(meta.event_name, meta.event_id, payload, 'processed');

    return {
      success: true,
      data: {
        subscription: subscription.id,
        organization: customer.organization_id,
        quantity,
        initialUsageRecordCreated: desiredUserCount > 0 && subscriptionItemId ? true : false
      }
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await logBillingEvent(
      payload?.meta?.event_name || 'subscription_created',
      payload?.meta?.event_id || 'unknown',
      payload,
      'failed',
      errorMessage
    );
    return { success: false, error: errorMessage };
  }
}

/**
 * Processes subscription.updated event
 */
export async function processSubscriptionUpdated(payload: any): Promise<EventResult> {
  try {
    // Validate payload structure
    if (!validateSubscriptionPayload(payload)) {
      const error = 'Invalid payload structure for subscription.updated event';
      await logBillingEvent(
        payload?.meta?.event_name || 'subscription_updated',
        payload?.meta?.event_id || 'unknown',
        payload,
        'failed',
        error
      );
      return { success: false, error };
    }

    const { meta, data } = payload;
    const { id: subscriptionId, attributes } = data;
    const { status, variant_id, renews_at, ends_at, trial_ends_at, first_subscription_item } = attributes;

    // Extract quantity from first_subscription_item (where LemonSqueezy stores it)
    const quantity = first_subscription_item?.quantity || 0;

    // Validate subscription status
    if (!isValidSubscriptionStatus(status)) {
      const error = `Invalid subscription status: ${status}`;
      await logBillingEvent(meta.event_name, meta.event_id, payload, 'failed', error);
      return { success: false, error };
    }

    // Check if event already processed
    if (await isEventAlreadyProcessed(meta.event_id)) {
      await logBillingEvent(meta.event_name, meta.event_id, payload, 'skipped', 'Event already processed');
      return { success: true, data: { message: 'Event already processed' } };
    }

    const supabase = createAdminClient();

    // Find existing subscription
    const { data: existingSubscription, error: findError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('lemonsqueezy_subscription_id', subscriptionId)
      .single();

    if (findError || !existingSubscription) {
      const error = 'Subscription not found for update';
      await logBillingEvent(meta.event_name, meta.event_id, payload, 'failed', error);
      return { success: false, error };
    }

    // Log before state for comprehensive debugging
    console.log(`📊 [Webhook] subscription_updated - Before:`, {
      subscriptionId,
      quantity: existingSubscription.quantity,
      current_seats: existingSubscription.current_seats,
      billing_type: existingSubscription.billing_type,
      variant_id: existingSubscription.lemonsqueezy_variant_id,
      status: existingSubscription.status,
      correlationId: meta.event_id,
      note: 'Processing subscription update'
    });

    // For usage-based billing: quantity is always 0, current_seats comes from user_count in custom_data
    // For volume billing: quantity reflects the seats, sync current_seats with quantity
    const isUsageBased = existingSubscription.billing_type === 'usage_based';
    const updateData: any = {
      status,
      quantity,
      lemonsqueezy_variant_id: variant_id || null,
      renews_at: renews_at || null,
      ends_at: ends_at || null,
      trial_ends_at: trial_ends_at || null,
      updated_at: new Date().toISOString()
    };

    // CRITICAL: For usage-based billing, preserve current_seats (don't overwrite with quantity:0)
    // current_seats is managed by our app based on actual user count, not by LemonSqueezy quantity
    if (!isUsageBased) {
      // For legacy volume billing, sync current_seats with quantity from LemonSqueezy
      updateData.current_seats = quantity;
    }

    const { data: updatedSubscription, error: updateError } = await supabase
      .from('subscriptions')
      .update(updateData)
      .eq('lemonsqueezy_subscription_id', subscriptionId)
      .select();

    if (updateError) {
      const error = `Subscription update failed: ${updateError.message}`;
      await logBillingEvent(meta.event_name, meta.event_id, payload, 'failed', error);
      return { success: false, error };
    }

    // Update organization subscription
    // For usage-based billing: use existing current_seats (actual user count)
    // For volume billing: use quantity from LemonSqueezy
    const seatsForOrg = isUsageBased ? existingSubscription.current_seats : quantity;
    await updateOrganizationSubscription(supabase, existingSubscription.organization_id, seatsForOrg, status);

    // Log changes for comprehensive debugging
    const variantChanged = existingSubscription.lemonsqueezy_variant_id !== variant_id;
    const quantityChanged = existingSubscription.quantity !== quantity;
    const statusChanged = existingSubscription.status !== status;

    if (variantChanged) {
      console.log(
        `✅ [Webhook] Variant changed for subscription ${subscriptionId}: ` +
        `${existingSubscription.lemonsqueezy_variant_id} → ${variant_id}`
      );
    }
    if (quantityChanged) {
      console.log(
        `✅ [Webhook] Quantity changed for subscription ${subscriptionId}: ` +
        `${existingSubscription.quantity} → ${quantity} seats`
      );
    }
    if (statusChanged) {
      console.log(
        `✅ [Webhook] Status changed for subscription ${subscriptionId}: ` +
        `${existingSubscription.status} → ${status}`
      );
    }

    // Log after state for comprehensive debugging
    const finalCurrentSeats = isUsageBased ? existingSubscription.current_seats : quantity;
    console.log(`✅ [Webhook] subscription_updated - After:`, {
      subscriptionId,
      billing_type: existingSubscription.billing_type,
      quantity,
      current_seats: finalCurrentSeats,
      variant_id,
      status,
      paid_seats: seatsForOrg > 3 ? seatsForOrg : 0,
      subscription_tier: status === 'active' && seatsForOrg > 0 ? 'active' : 'free',
      correlationId: meta.event_id,
      note: isUsageBased
        ? 'Usage-based: current_seats preserved, quantity=0'
        : 'Volume: current_seats synced with quantity'
    });

    // Log successful processing
    await logBillingEvent(meta.event_name, meta.event_id, payload, 'processed');

    return {
      success: true,
      data: {
        subscription: existingSubscription.id,
        organization: existingSubscription.organization_id,
        previousQuantity: existingSubscription.quantity,
        newQuantity: quantity
      }
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await logBillingEvent(
      payload?.meta?.event_name || 'subscription_updated',
      payload?.meta?.event_id || 'unknown',
      payload,
      'failed',
      errorMessage
    );
    return { success: false, error: errorMessage };
  }
}

/**
 * Processes subscription.cancelled event
 */
export async function processSubscriptionCancelled(payload: any): Promise<EventResult> {
  try {
    // Validate payload structure
    if (!validateSubscriptionPayload(payload)) {
      const error = 'Invalid payload structure for subscription.cancelled event';
      const eventId = ensureEventId(payload);
      await logBillingEvent(
        payload?.meta?.event_name || 'subscription_cancelled',
        eventId,
        payload,
        'failed',
        error
      );
      return { success: false, error };
    }

    const { meta, data } = payload;
    const { id: subscriptionId, attributes } = data;
    const { status, ends_at } = attributes;

    // Ensure event_id exists
    const eventId = ensureEventId(payload);

    // Check if event already processed
    if (await isEventAlreadyProcessed(eventId)) {
      await logBillingEvent(meta.event_name, eventId, payload, 'skipped', 'Event already processed');
      return { success: true, data: { message: 'Event already processed' } };
    }

    const supabase = createAdminClient();

    // Find existing subscription
    const { data: existingSubscription, error: findError} = await supabase
      .from('subscriptions')
      .select('*')
      .eq('lemonsqueezy_subscription_id', subscriptionId)
      .single();

    if (findError || !existingSubscription) {
      const error = 'Subscription not found for cancellation';
      await logBillingEvent(meta.event_name, eventId, payload, 'failed', error);
      return { success: false, error };
    }

    // Log before state for comprehensive debugging
    console.log(`📊 [Webhook] subscription_cancelled - Before:`, {
      subscriptionId,
      organizationId: existingSubscription.organization_id,
      status: existingSubscription.status,
      quantity: existingSubscription.quantity,
      current_seats: existingSubscription.current_seats,
      renews_at: existingSubscription.renews_at,
      correlationId: eventId
    });

    // Update subscription to cancelled/expired status
    // IMPORTANT: Reset quantity and current_seats to 0 for cancelled subscriptions
    const { data: updatedSubscription, error: updateError } = await supabase
      .from('subscriptions')
      .update({
        status,
        quantity: 0,             // Reset quantity to 0
        current_seats: 0,        // Reset current_seats to 0
        ends_at: ends_at || null,
        renews_at: null,         // Cancelled subscriptions don't renew
        updated_at: new Date().toISOString()
      })
      .eq('lemonsqueezy_subscription_id', subscriptionId)
      .select();

    if (updateError) {
      const error = `Subscription cancellation failed: ${updateError.message}`;
      await logBillingEvent(meta.event_name, eventId, payload, 'failed', error);
      return { success: false, error };
    }

    // Reset organization subscription to free tier
    await updateOrganizationSubscription(supabase, existingSubscription.organization_id, 0, status);

    // Log after state for comprehensive debugging
    console.log(`✅ [Webhook] subscription_cancelled - After:`, {
      subscriptionId,
      organizationId: existingSubscription.organization_id,
      status,
      quantity: 0,              // Reset to 0
      current_seats: 0,         // Reset to 0
      paid_seats: 0,            // Organization reset to free tier
      subscription_tier: 'free',
      ends_at: ends_at || null,
      renews_at: null,
      correlationId: eventId
    });

    // Log successful processing
    await logBillingEvent(meta.event_name, eventId, payload, 'processed');

    return {
      success: true,
      data: {
        subscription: existingSubscription.id,
        organization: existingSubscription.organization_id,
        status
      }
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await logBillingEvent(
      payload?.meta?.event_name || 'subscription_cancelled',
      payload?.meta?.event_id || 'unknown',
      payload,
      'failed',
      errorMessage
    );
    return { success: false, error: errorMessage };
  }
}

/**
 * Processes subscription_payment_failed event
 */
export async function processSubscriptionPaymentFailed(payload: any): Promise<EventResult> {
  try {
    // Validate payload structure
    if (!validateSubscriptionPayload(payload)) {
      const error = 'Invalid payload structure for subscription_payment_failed event';
      await logBillingEvent(
        payload?.meta?.event_name || 'subscription_payment_failed',
        payload?.meta?.event_id || 'unknown',
        payload,
        'failed',
        error
      );
      return { success: false, error };
    }

    const { meta, data } = payload;
    const { id: subscriptionId, attributes } = data;
    const { status } = attributes;

    // Check if event already processed
    if (await isEventAlreadyProcessed(meta.event_id)) {
      await logBillingEvent(meta.event_name, meta.event_id, payload, 'skipped', 'Event already processed');
      return { success: true, data: { message: 'Event already processed' } };
    }

    const supabase = createAdminClient();

    // Find existing subscription
    const { data: existingSubscription, error: findError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('lemonsqueezy_subscription_id', subscriptionId)
      .single();

    if (findError || !existingSubscription) {
      const error = 'Subscription not found for payment failure event';
      await logBillingEvent(meta.event_name, meta.event_id, payload, 'failed', error);
      return { success: false, error };
    }

    // Log before state for comprehensive debugging
    console.log(`📊 [Webhook] subscription_payment_failed - Before:`, {
      subscriptionId,
      organizationId: existingSubscription.organization_id,
      status: existingSubscription.status,
      quantity: existingSubscription.quantity,
      current_seats: existingSubscription.current_seats,
      correlationId: meta.event_id
    });

    // Update subscription status to past_due
    const { data: updatedSubscription, error: updateError } = await supabase
      .from('subscriptions')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('lemonsqueezy_subscription_id', subscriptionId)
      .select();

    if (updateError) {
      const error = `Subscription payment failure update failed: ${updateError.message}`;
      await logBillingEvent(meta.event_name, meta.event_id, payload, 'failed', error);
      return { success: false, error };
    }

    // Log after state for comprehensive debugging
    console.log(`⚠️ [Webhook] subscription_payment_failed - After:`, {
      subscriptionId,
      organizationId: existingSubscription.organization_id,
      status,
      quantity: existingSubscription.quantity,
      current_seats: existingSubscription.current_seats,
      note: 'Payment failed - subscription marked as past_due',
      correlationId: meta.event_id
    });

    // Log successful processing
    await logBillingEvent(meta.event_name, meta.event_id, payload, 'processed');

    return {
      success: true,
      data: {
        subscription: existingSubscription.id,
        organization: existingSubscription.organization_id,
        status
      }
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await logBillingEvent(
      payload?.meta?.event_name || 'subscription_payment_failed',
      payload?.meta?.event_id || 'unknown',
      payload,
      'failed',
      errorMessage
    );
    return { success: false, error: errorMessage };
  }
}

/**
 * Processes subscription_paused event
 */
export async function processSubscriptionPaused(payload: any): Promise<EventResult> {
  try {
    // Validate payload structure
    if (!validateSubscriptionPayload(payload)) {
      const error = 'Invalid payload structure for subscription_paused event';
      await logBillingEvent(
        payload?.meta?.event_name || 'subscription_paused',
        payload?.meta?.event_id || 'unknown',
        payload,
        'failed',
        error
      );
      return { success: false, error };
    }

    const { meta, data } = payload;
    const { id: subscriptionId, attributes } = data;
    const { status } = attributes;

    // Check if event already processed
    if (await isEventAlreadyProcessed(meta.event_id)) {
      await logBillingEvent(meta.event_name, meta.event_id, payload, 'skipped', 'Event already processed');
      return { success: true, data: { message: 'Event already processed' } };
    }

    const supabase = createAdminClient();

    // Find existing subscription
    const { data: existingSubscription, error: findError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('lemonsqueezy_subscription_id', subscriptionId)
      .single();

    if (findError || !existingSubscription) {
      const error = 'Subscription not found for paused event';
      await logBillingEvent(meta.event_name, meta.event_id, payload, 'failed', error);
      return { success: false, error };
    }

    // Log before state for comprehensive debugging
    console.log(`📊 [Webhook] subscription_paused - Before:`, {
      subscriptionId,
      organizationId: existingSubscription.organization_id,
      status: existingSubscription.status,
      quantity: existingSubscription.quantity,
      current_seats: existingSubscription.current_seats,
      renews_at: existingSubscription.renews_at,
      correlationId: meta.event_id
    });

    // Update subscription to paused status
    const { data: updatedSubscription, error: updateError } = await supabase
      .from('subscriptions')
      .update({
        status,
        renews_at: null, // Paused subscriptions don't renew
        updated_at: new Date().toISOString()
      })
      .eq('lemonsqueezy_subscription_id', subscriptionId)
      .select();

    if (updateError) {
      const error = `Subscription pause update failed: ${updateError.message}`;
      await logBillingEvent(meta.event_name, meta.event_id, payload, 'failed', error);
      return { success: false, error };
    }

    // Log after state for comprehensive debugging
    console.log(`⏸️ [Webhook] subscription_paused - After:`, {
      subscriptionId,
      organizationId: existingSubscription.organization_id,
      status,
      quantity: existingSubscription.quantity,
      current_seats: existingSubscription.current_seats,
      renews_at: null,
      note: 'Subscription paused - no renewal date',
      correlationId: meta.event_id
    });

    // Log successful processing
    await logBillingEvent(meta.event_name, meta.event_id, payload, 'processed');

    return {
      success: true,
      data: {
        subscription: existingSubscription.id,
        organization: existingSubscription.organization_id,
        status
      }
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await logBillingEvent(
      payload?.meta?.event_name || 'subscription_paused',
      payload?.meta?.event_id || 'unknown',
      payload,
      'failed',
      errorMessage
    );
    return { success: false, error: errorMessage };
  }
}

/**
 * Processes subscription_resumed event
 */
export async function processSubscriptionResumed(payload: any): Promise<EventResult> {
  try {
    // Validate payload structure
    if (!validateSubscriptionPayload(payload)) {
      const error = 'Invalid payload structure for subscription_resumed event';
      await logBillingEvent(
        payload?.meta?.event_name || 'subscription_resumed',
        payload?.meta?.event_id || 'unknown',
        payload,
        'failed',
        error
      );
      return { success: false, error };
    }

    const { meta, data } = payload;
    const { id: subscriptionId, attributes } = data;
    const { status, renews_at, quantity } = attributes;

    // Check if event already processed
    if (await isEventAlreadyProcessed(meta.event_id)) {
      await logBillingEvent(meta.event_name, meta.event_id, payload, 'skipped', 'Event already processed');
      return { success: true, data: { message: 'Event already processed' } };
    }

    const supabase = createAdminClient();

    // Find existing subscription
    const { data: existingSubscription, error: findError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('lemonsqueezy_subscription_id', subscriptionId)
      .single();

    if (findError || !existingSubscription) {
      const error = 'Subscription not found for resumed event';
      await logBillingEvent(meta.event_name, meta.event_id, payload, 'failed', error);
      return { success: false, error };
    }

    // Log before state for comprehensive debugging
    console.log(`📊 [Webhook] subscription_resumed - Before:`, {
      subscriptionId,
      organizationId: existingSubscription.organization_id,
      status: existingSubscription.status,
      quantity: existingSubscription.quantity,
      current_seats: existingSubscription.current_seats,
      renews_at: existingSubscription.renews_at,
      correlationId: meta.event_id
    });

    // Update subscription to active status
    const { data: updatedSubscription, error: updateError } = await supabase
      .from('subscriptions')
      .update({
        status,
        renews_at: renews_at || null,
        updated_at: new Date().toISOString()
      })
      .eq('lemonsqueezy_subscription_id', subscriptionId)
      .select();

    if (updateError) {
      const error = `Subscription resume update failed: ${updateError.message}`;
      await logBillingEvent(meta.event_name, meta.event_id, payload, 'failed', error);
      return { success: false, error };
    }

    // Restore organization subscription with seats
    await updateOrganizationSubscription(supabase, existingSubscription.organization_id, quantity, status);

    // Log after state for comprehensive debugging
    console.log(`▶️ [Webhook] subscription_resumed - After:`, {
      subscriptionId,
      organizationId: existingSubscription.organization_id,
      status,
      quantity,
      current_seats: existingSubscription.current_seats,
      paid_seats: quantity > 3 ? quantity : 0,
      subscription_tier: status === 'active' && quantity > 0 ? 'active' : 'free',
      renews_at: renews_at || null,
      note: 'Subscription resumed - active again',
      correlationId: meta.event_id
    });

    // Log successful processing
    await logBillingEvent(meta.event_name, meta.event_id, payload, 'processed');

    return {
      success: true,
      data: {
        subscription: existingSubscription.id,
        organization: existingSubscription.organization_id,
        status
      }
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await logBillingEvent(
      payload?.meta?.event_name || 'subscription_resumed',
      payload?.meta?.event_id || 'unknown',
      payload,
      'failed',
      errorMessage
    );
    return { success: false, error: errorMessage };
  }
}

/**
 * Processes subscription_payment_success event
 *
 * This handler supports TWO different payment confirmation patterns:
 *
 * 1. **Immediate Upgrades** (adding seats mid-cycle):
 *    - User paid NOW via Subscription Items API
 *    - `quantity` already updated in database (what user is paying for)
 *    - `current_seats` NOT yet updated (waiting for payment confirmation)
 *    - No `pending_seats` set (immediate upgrade pattern)
 *    - This webhook confirms payment succeeded → grant access
 *
 * 2. **Deferred Downgrades** (removing seats at renewal):
 *    - User scheduled downgrade for next renewal
 *    - `pending_seats` contains the target seat count
 *    - `current_seats` stays at current value until renewal
 *    - This webhook fires at renewal → apply pending change
 *
 * This is part of Layer 2 of the multi-layer billing guarantee system.
 */
export async function processSubscriptionPaymentSuccess(payload: any): Promise<EventResult> {
  try {
    // Validate payload structure
    if (!validateSubscriptionPayload(payload)) {
      const error = 'Invalid payload structure for subscription_payment_success event';
      await logBillingEvent(
        payload?.meta?.event_name || 'subscription_payment_success',
        payload?.meta?.event_id || 'unknown',
        payload,
        'failed',
        error
      );
      return { success: false, error };
    }

    const { meta, data } = payload;
    const { attributes } = data;
    // Note: data.id is the invoice ID, not subscription ID
    const subscriptionId = attributes.subscription_id; // Get subscription ID from attributes
    const { status } = attributes;

    // Check if event already processed
    if (await isEventAlreadyProcessed(meta.event_id)) {
      await logBillingEvent(meta.event_name, meta.event_id, payload, 'skipped', 'Event already processed');
      return { success: true, data: { message: 'Event already processed' } };
    }

    const supabase = createAdminClient();

    // Find existing subscription with retry logic to handle race conditions
    // The subscription_payment_success webhook may arrive before subscription_created completes
    let existingSubscription = null;
    let retryCount = 0;
    const maxRetries = 3;
    const retryDelay = 2000; // 2 seconds base delay

    while (!existingSubscription && retryCount < maxRetries) {
      const { data, error: findError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('lemonsqueezy_subscription_id', subscriptionId)
        .single();

      if (data) {
        existingSubscription = data;
        if (retryCount > 0) {
          console.log(`✅ Subscription found after ${retryCount} retries`);
        }
        break;
      }

      if (findError && findError.code !== 'PGRST116') {
        // Real error, not just "not found" (PGRST116)
        const error = `Subscription lookup error: ${findError.message}`;
        await logBillingEvent(meta.event_name, meta.event_id, payload, 'failed', error);
        return { success: false, error };
      }

      retryCount++;
      if (retryCount < maxRetries) {
        const delay = retryDelay * retryCount; // Exponential backoff: 2s, 4s, 6s
        console.log(`⏳ Subscription ${subscriptionId} not found yet, retry ${retryCount}/${maxRetries} in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    if (!existingSubscription) {
      const error = `Subscription not found for payment success event after ${maxRetries} retries`;
      await logBillingEvent(meta.event_name, meta.event_id, payload, 'failed', error);
      return { success: false, error };
    }

    // Log before state for debugging
    console.log(`📊 [Webhook] subscription_payment_success - Before:`, {
      subscriptionId,
      quantity: existingSubscription.quantity,
      current_seats: existingSubscription.current_seats,
      billing_type: existingSubscription.billing_type,
      correlationId: meta.event_id,
      note: 'Confirming payment'
    });

    // For usage-based and quantity-based billing: Payment confirmation only, no seat changes
    // Seats are managed via usage records or checkout quantity, not via payment webhook
    if (existingSubscription.billing_type === 'usage_based' || existingSubscription.billing_type === 'quantity_based') {
      console.log(`✅ [Webhook] ${existingSubscription.billing_type} billing payment confirmed for subscription ${subscriptionId}`);

      await logBillingEvent(
        meta.event_name,
        meta.event_id,
        payload,
        'processed',
        `${existingSubscription.billing_type} billing payment confirmed`
      );

      return {
        success: true,
        data: {
          subscription: existingSubscription.id,
          organization: existingSubscription.organization_id,
          billingType: existingSubscription.billing_type,
          note: 'Payment confirmed - seats already set during subscription creation'
        }
      };
    }

    // LEGACY VOLUME BILLING: Apply grace period logic
    // NOTE: This code only runs for legacy subscriptions with billing_type='volume'
    const hasPendingChanges = existingSubscription.pending_seats !== null;
    const needsImmediateUpgrade = !hasPendingChanges && existingSubscription.current_seats !== existingSubscription.quantity;

    // Pattern 1: Immediate Upgrade (no pending_seats, but seats mismatch)
    if (needsImmediateUpgrade) {
      const previousSeats = existingSubscription.current_seats;
      const newSeats = existingSubscription.quantity;

      console.log(`✅ [Webhook] Immediate upgrade payment confirmed for subscription ${subscriptionId}: ${previousSeats} → ${newSeats} seats`);

      // Update subscription: grant access by syncing current_seats with quantity
      const { data: updatedSubscription, error: updateError } = await supabase
        .from('subscriptions')
        .update({
          current_seats: newSeats,  // Grant access now that payment is confirmed
          status,
          updated_at: new Date().toISOString()
        })
        .eq('lemonsqueezy_subscription_id', subscriptionId)
        .select()
        .single();

      if (updateError) {
        const error = `Failed to grant seats after payment confirmation: ${updateError.message}`;
        await logBillingEvent(meta.event_name, meta.event_id, payload, 'failed', error);
        return { success: false, error };
      }

      // Update organization paid_seats
      await updateOrganizationSubscription(supabase, existingSubscription.organization_id, newSeats, status);

      // Log successful processing
      await logBillingEvent(
        meta.event_name,
        meta.event_id,
        payload,
        'processed',
        `Immediate upgrade confirmed: ${previousSeats} → ${newSeats} seats`
      );

      console.log(`✅ [Webhook] subscription_payment_success - After (immediate upgrade):`, {
        subscriptionId,
        quantity: newSeats,
        current_seats: newSeats,
        paid_seats: newSeats,
        correlationId: meta.event_id,
        usageBasedBilling: true,
        note: 'Payment confirmed - seats granted from usage records'
      });

      return {
        success: true,
        data: {
          subscription: existingSubscription.id,
          organization: existingSubscription.organization_id,
          previousSeats,
          newSeats,
          upgradeType: 'immediate'
        }
      };
    }

    // Pattern 2: Deferred Downgrade (has pending_seats)
    if (hasPendingChanges) {
      const previousSeats = existingSubscription.current_seats;
      const newSeats = existingSubscription.pending_seats;

      console.log(`✅ [Webhook] Applying deferred seat change for subscription ${subscriptionId}: ${previousSeats} → ${newSeats} seats`);

      // Update subscription: apply pending changes
      // NOTE: pending_seats column was removed in migration 20251113000000_migrate_to_usage_based_billing.sql
      // This code only runs for legacy 'volume' billing subscriptions
      const { data: updatedSubscription, error: updateError } = await supabase
        .from('subscriptions')
        .update({
          current_seats: newSeats,
          quantity: newSeats,
          status,
          updated_at: new Date().toISOString()
        })
        .eq('lemonsqueezy_subscription_id', subscriptionId)
        .select()
        .single();

      if (updateError) {
        const error = `Failed to apply pending seat changes: ${updateError.message}`;
        await logBillingEvent(meta.event_name, meta.event_id, payload, 'failed', error);
        return { success: false, error };
      }

      // Archive users marked as pending_removal
      const { data: usersToArchive, error: usersError } = await supabase
        .from('user_organizations')
        .select('user_id, removal_effective_date')
        .eq('organization_id', existingSubscription.organization_id)
        .eq('status', 'pending_removal')
        .not('removal_effective_date', 'is', null);

      let archivedCount = 0;

      if (usersError) {
        console.error(`[Webhook] Failed to fetch users for archival: ${usersError.message}`);
      } else if (usersToArchive && usersToArchive.length > 0) {
        console.log(`[Webhook] Archiving ${usersToArchive.length} users marked as pending_removal`);

        // Update all users to archived status using composite key
        const { error: archiveError } = await supabase
          .from('user_organizations')
          .update({
            status: 'archived',
            updated_at: new Date().toISOString()
          })
          .eq('organization_id', existingSubscription.organization_id)
          .in('user_id', usersToArchive.map(u => u.user_id));

        if (archiveError) {
          console.error(`[Webhook] Failed to archive users: ${archiveError.message}`);
        } else {
          archivedCount = usersToArchive.length;
          console.log(`[Webhook] Successfully archived ${archivedCount} users`);
        }
      }

      // Update organization subscription with new seat count
      await updateOrganizationSubscription(supabase, existingSubscription.organization_id, newSeats, status);

      // Log successful processing
      await logBillingEvent(
        meta.event_name,
        meta.event_id,
        payload,
        'processed',
        `Deferred downgrade applied: ${previousSeats} → ${newSeats} seats, archived ${archivedCount} users`
      );

      console.log(`✅ [Webhook] subscription_payment_success - After (deferred downgrade):`, {
        subscriptionId,
        quantity: newSeats,
        current_seats: newSeats,
        pending_seats: null,
        usersArchived: archivedCount,
        correlationId: meta.event_id,
        usageBasedBilling: true,
        note: 'Deferred downgrade applied - usage records reflected'
      });

      return {
        success: true,
        data: {
          subscription: existingSubscription.id,
          organization: existingSubscription.organization_id,
          previousSeats,
          newSeats,
          usersArchived: archivedCount,
          upgradeType: 'deferred'
        }
      };
    }

    // Pattern 3: No changes needed (renewal payment with no seat changes)
    console.log(`[Webhook] subscription_payment_success: No pending changes for subscription ${subscriptionId}`, {
      usageBasedBilling: true,
      note: 'Renewal payment - quantity already synced via usage records'
    });

    await supabase
      .from('subscriptions')
      .update({
        updated_at: new Date().toISOString()
      })
      .eq('lemonsqueezy_subscription_id', subscriptionId);

    await logBillingEvent(meta.event_name, meta.event_id, payload, 'processed', 'No pending changes to apply');

    return {
      success: true,
      data: {
        subscription: existingSubscription.id,
        organization: existingSubscription.organization_id,
        message: 'No pending changes to apply'
      }
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await logBillingEvent(
      payload?.meta?.event_name || 'subscription_payment_success',
      payload?.meta?.event_id || 'unknown',
      payload,
      'failed',
      errorMessage
    );
    return { success: false, error: errorMessage };
  }
}