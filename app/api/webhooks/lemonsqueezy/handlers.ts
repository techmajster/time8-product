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
 */
function validateSubscriptionPayload(payload: any): boolean {
  return (
    payload?.meta?.event_name &&
    payload?.meta?.event_id &&
    payload?.data?.id &&
    payload?.data?.attributes &&
    typeof payload.data.attributes.status === 'string' &&
    typeof payload.data.attributes.quantity === 'number' &&
    typeof payload.data.attributes.customer_id === 'number'
  );
}

/**
 * Validates subscription status
 */
function isValidSubscriptionStatus(status: string): status is SubscriptionStatus {
  return VALID_SUBSCRIPTION_STATUSES.includes(status as SubscriptionStatus);
}

/**
 * Finds or creates customer record, handling organization data from checkout
 * Updated to prioritize organization_id over slug-based lookup
 */
async function findOrCreateCustomer(
  supabase: any,
  lemonsqueezyCustomerId: string,
  customData: any,
  customerEmail?: string
): Promise<{ data: any; error: any }> {
  // First try to find existing customer
  const { data: existingCustomer, error: findError } = await supabase
    .from('customers')
    .select('*')
    .eq('lemonsqueezy_customer_id', lemonsqueezyCustomerId)
    .single();

  if (findError && findError.code !== 'PGRST116') {
    return { data: null, error: findError };
  }

  if (existingCustomer) {
    return { data: existingCustomer, error: null };
  }

  // Customer doesn't exist - try to find organization from custom checkout data
  if (!customData) {
    return { 
      data: null, 
      error: { message: 'No custom data available to identify organization' }
    };
  }

  console.log('🔍 Processing webhook custom data:', customData);
  
  let organization = null;
  let organizationData = null;

  // First, parse organization_data from custom fields
  try {
    organizationData = typeof customData.organization_data === 'string' 
      ? JSON.parse(customData.organization_data)
      : customData.organization_data;
    
    console.log('📋 Parsed organization data:', organizationData);
  } catch (error) {
    console.error('❌ Failed to parse organization_data:', error);
    return {
      data: null,
      error: { message: 'Invalid organization data in checkout custom fields' }
    };
  }

  if (!organizationData) {
    return {
      data: null,
      error: { message: 'No organization_data found in checkout custom fields' }
    };
  }

  // Method 1: Direct organization ID (preferred for existing orgs)
  if (organizationData.id) {
    console.log(`🎯 Looking up organization by ID: ${organizationData.id}`);
    
    const { data: orgById, error: orgByIdError } = await supabase
      .from('organizations')
      .select('id, name, slug')
      .eq('id', organizationData.id)
      .single();

    if (orgByIdError) {
      console.error('❌ Failed to find organization by ID:', orgByIdError);
    } else {
      organization = orgById;
      console.log(`✅ Found organization by ID: ${organization.name} (${organization.id})`);
    }
  }

  // Method 2: Lookup by slug (for new orgs during onboarding or fallback)
  if (!organization && organizationData.slug) {
    console.log(`🔍 Looking up organization by slug: ${organizationData.slug}`);
    
    const { data: orgBySlug, error: orgBySlugError } = await supabase
      .from('organizations')
      .select('id, name, slug')
      .eq('slug', organizationData.slug)
      .single();

    if (orgBySlugError) {
      console.error('❌ Failed to find organization by slug:', orgBySlugError);
    } else {
      organization = orgBySlug;
      console.log(`✅ Found organization by slug: ${organization.name} (${organization.id})`);
    }
  }

  if (!organization) {
    return {
      data: null,
      error: { message: 'Organization not found using either ID or slug from checkout data' }
    };
  }

  // Create customer record linking the organization to Lemon Squeezy customer
  const { data: newCustomer, error: customerError } = await supabase
    .from('customers')
    .insert({
      organization_id: organization.id,
      lemonsqueezy_customer_id: lemonsqueezyCustomerId,
      email: customerEmail
    })
    .select()
    .single();

  if (customerError) {
    return { data: null, error: customerError };
  }

  console.log(`✅ Created customer record: org=${organization.name} (${organization.id}), lemon_squeezy=${lemonsqueezyCustomerId}`);
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
    const { status, quantity, customer_id, variant_id, renews_at, ends_at, trial_ends_at } = attributes;

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

    // Find customer record, passing custom data from checkout
    const { data: customer, error: customerError } = await findOrCreateCustomer(
      supabase,
      customer_id.toString(),
      attributes.custom_data || null,
      attributes.user_email
    );

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

    // Create subscription record
    const { data: subscription, error: subscriptionError } = await supabase
      .from('subscriptions')
      .insert({
        organization_id: customer.organization_id,
        customer_id: customer.id,
        lemonsqueezy_subscription_id: subscriptionId,
        lemonsqueezy_variant_id: variant_id || null,
        status,
        quantity,
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

    // Update organization subscription (paid seats + tier)
    await updateOrganizationSubscription(supabase, customer.organization_id, quantity, status);

    // Log successful processing
    await logBillingEvent(meta.event_name, meta.event_id, payload, 'processed');

    return {
      success: true,
      data: {
        subscription: subscription.id,
        organization: customer.organization_id,
        quantity
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
    const { status, quantity, variant_id, renews_at, ends_at, trial_ends_at } = attributes;

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

    // Update subscription
    const { data: updatedSubscription, error: updateError } = await supabase
      .from('subscriptions')
      .update({
        status,
        quantity,
        lemonsqueezy_variant_id: variant_id || null,
        renews_at: renews_at || null,
        ends_at: ends_at || null,
        trial_ends_at: trial_ends_at || null,
        updated_at: new Date().toISOString()
      })
      .eq('lemonsqueezy_subscription_id', subscriptionId)
      .select();

    if (updateError) {
      const error = `Subscription update failed: ${updateError.message}`;
      await logBillingEvent(meta.event_name, meta.event_id, payload, 'failed', error);
      return { success: false, error };
    }

    // Update organization subscription if EITHER quantity OR variant changed
    // This is critical for detecting plan changes (e.g., monthly→yearly with same seat count)
    const variantChanged = existingSubscription.lemonsqueezy_variant_id !== variant_id;
    const quantityChanged = existingSubscription.quantity !== quantity;

    if (variantChanged || quantityChanged) {
      await updateOrganizationSubscription(supabase, existingSubscription.organization_id, quantity, status);

      // Log changes for debugging
      if (variantChanged) {
        console.log(
          `[Billing] Variant changed for subscription ${subscriptionId}: ` +
          `${existingSubscription.lemonsqueezy_variant_id} → ${variant_id}`
        );
      }
      if (quantityChanged) {
        console.log(
          `[Billing] Quantity changed for subscription ${subscriptionId}: ` +
          `${existingSubscription.quantity} → ${quantity} seats`
        );
      }
    }

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
      await logBillingEvent(
        payload?.meta?.event_name || 'subscription_cancelled',
        payload?.meta?.event_id || 'unknown',
        payload,
        'failed',
        error
      );
      return { success: false, error };
    }

    const { meta, data } = payload;
    const { id: subscriptionId, attributes } = data;
    const { status, ends_at } = attributes;

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
      const error = 'Subscription not found for cancellation';
      await logBillingEvent(meta.event_name, meta.event_id, payload, 'failed', error);
      return { success: false, error };
    }

    // Update subscription to cancelled/expired status
    const { data: updatedSubscription, error: updateError } = await supabase
      .from('subscriptions')
      .update({
        status,
        ends_at: ends_at || null,
        renews_at: null, // Cancelled subscriptions don't renew
        updated_at: new Date().toISOString()
      })
      .eq('lemonsqueezy_subscription_id', subscriptionId)
      .select();

    if (updateError) {
      const error = `Subscription cancellation failed: ${updateError.message}`;
      await logBillingEvent(meta.event_name, meta.event_id, payload, 'failed', error);
      return { success: false, error };
    }

    // Reset organization subscription to free tier
    await updateOrganizationSubscription(supabase, existingSubscription.organization_id, 0, status);

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
 * This handler applies pending seat changes when a subscription renews.
 * It is part of Layer 2 of the multi-layer billing guarantee system.
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
    const { id: subscriptionId, attributes } = data;
    const { status, quantity, renews_at } = attributes;

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
      const error = 'Subscription not found for payment success event';
      await logBillingEvent(meta.event_name, meta.event_id, payload, 'failed', error);
      return { success: false, error };
    }

    // Check if there are pending seat changes to apply
    const hasPendingChanges = existingSubscription.pending_seats !== null;
    const alreadySynced = existingSubscription.lemonsqueezy_quantity_synced === true;

    if (!hasPendingChanges) {
      // No pending changes - just update renews_at and return success
      await supabase
        .from('subscriptions')
        .update({
          renews_at: renews_at || null,
          updated_at: new Date().toISOString()
        })
        .eq('lemonsqueezy_subscription_id', subscriptionId);

      await logBillingEvent(meta.event_name, meta.event_id, payload, 'processed', 'No pending changes to apply');
      console.log(`[Webhook] subscription_payment_success: No pending changes for subscription ${subscriptionId}`);

      return {
        success: true,
        data: {
          subscription: existingSubscription.id,
          organization: existingSubscription.organization_id,
          message: 'No pending changes to apply'
        }
      };
    }

    if (alreadySynced && hasPendingChanges) {
      // Already synced by cron job - just apply the changes locally
      console.log(`[Webhook] subscription_payment_success: Changes already synced to Lemon Squeezy, applying locally for subscription ${subscriptionId}`);
    }

    // Apply pending seat changes
    const previousSeats = existingSubscription.current_seats;
    const newSeats = existingSubscription.pending_seats;

    console.log(`[Webhook] Applied pending seat change for subscription ${subscriptionId}: ${previousSeats} → ${newSeats} seats`);

    // Update subscription: apply pending changes
    const { data: updatedSubscription, error: updateError } = await supabase
      .from('subscriptions')
      .update({
        current_seats: newSeats,
        pending_seats: null,
        lemonsqueezy_quantity_synced: true,
        quantity: newSeats,
        status,
        renews_at: renews_at || null,
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
      `Applied pending seat change: ${previousSeats} → ${newSeats} seats, archived ${archivedCount} users`
    );

    return {
      success: true,
      data: {
        subscription: existingSubscription.id,
        organization: existingSubscription.organization_id,
        previousSeats,
        newSeats,
        usersArchived: archivedCount
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