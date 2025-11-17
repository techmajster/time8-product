/**
 * Webhook Renewal Processing Integration Test Suite
 *
 * Tests for Tasks 9.4 & 9.5: E2E test for background job execution cycle
 * and webhook processing at renewal
 *
 * This comprehensive test suite validates:
 * - Processing subscription_payment_success webhook
 * - Applying pending_seats changes at renewal
 * - Archiving pending_removal users
 * - Updating current_seats to match pending_seats
 * - Clearing pending_seats after successful processing
 * - Marking subscription as synced
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals'
import { createClient } from '@supabase/supabase-js'
import { removeUser } from '@/lib/seat-management'
import { processSubscriptionPaymentSuccess } from '@/app/api/webhooks/lemonsqueezy/handlers'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

describe('Webhook Renewal Processing E2E Tests', () => {
  let testOrgId: string
  let testAdminId: string
  let testEmployee1Id: string
  let testEmployee2Id: string
  let testEmployee3Id: string
  let testSubscriptionId: string
  let testLemonSqueezySubId: string

  beforeEach(async () => {
    // Create test organization
    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizations')
      .insert({
        name: `Webhook Test Org ${Date.now()}`,
        country_code: 'PL'
      })
      .select()
      .single()

    if (orgError) throw new Error(`Failed to create test org: ${orgError.message}`)
    testOrgId = org.id

    // Create test subscription with future renewal
    const renewalDate = new Date()
    renewalDate.setDate(renewalDate.getDate() + 1) // Tomorrow

    testLemonSqueezySubId = `test_sub_${Date.now()}`

    const { data: sub, error: subError } = await supabaseAdmin
      .from('subscriptions')
      .insert({
        organization_id: testOrgId,
        status: 'active',
        current_seats: 4, // admin + 3 employees
        pending_seats: null,
        renews_at: renewalDate.toISOString(),
        lemonsqueezy_subscription_id: testLemonSqueezySubId,
        lemonsqueezy_subscription_item_id: `test_item_${Date.now()}`,
        lemonsqueezy_quantity_synced: true
      })
      .select()
      .single()

    if (subError) throw new Error(`Failed to create subscription: ${subError.message}`)
    testSubscriptionId = sub.id

    // Create test users
    const createUser = async (email: string, role: string) => {
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: 'TestPassword123!',
        email_confirm: true
      })

      if (authError) throw new Error(`Failed to create auth user: ${authError.message}`)

      await supabaseAdmin.from('profiles').insert({
        id: authUser.user.id,
        email: authUser.user.email,
        full_name: `Test User ${email}`
      })

      await supabaseAdmin.from('user_organizations').insert({
        user_id: authUser.user.id,
        organization_id: testOrgId,
        role,
        is_active: true,
        status: 'active',
        is_default: true,
        joined_via: 'created'
      })

      return authUser.user.id
    }

    testAdminId = await createUser(`admin-${Date.now()}@test.com`, 'admin')
    testEmployee1Id = await createUser(`emp1-${Date.now()}@test.com`, 'employee')
    testEmployee2Id = await createUser(`emp2-${Date.now()}@test.com`, 'employee')
    testEmployee3Id = await createUser(`emp3-${Date.now()}@test.com`, 'employee')
  })

  afterEach(async () => {
    if (testAdminId) await supabaseAdmin.auth.admin.deleteUser(testAdminId)
    if (testEmployee1Id) await supabaseAdmin.auth.admin.deleteUser(testEmployee1Id)
    if (testEmployee2Id) await supabaseAdmin.auth.admin.deleteUser(testEmployee2Id)
    if (testEmployee3Id) await supabaseAdmin.auth.admin.deleteUser(testEmployee3Id)

    if (testOrgId) {
      await supabaseAdmin.from('user_organizations').delete().eq('organization_id', testOrgId)
      await supabaseAdmin.from('subscriptions').delete().eq('organization_id', testOrgId)
      await supabaseAdmin.from('organizations').delete().eq('id', testOrgId)
    }
  })

  test('9.4.1: Webhook applies pending_seats and archives pending_removal users', async () => {
    // Remove 2 employees (current: 4, pending: 2)
    await removeUser(testEmployee1Id, testOrgId, testAdminId)
    await removeUser(testEmployee2Id, testOrgId, testAdminId)

    // Verify pending state
    let { data: sub } = await supabaseAdmin
      .from('subscriptions')
      .select('current_seats, pending_seats, lemonsqueezy_quantity_synced')
      .eq('id', testSubscriptionId)
      .single()

    expect(sub?.current_seats).toBe(4)
    expect(sub?.pending_seats).toBe(2)
    expect(sub?.lemonsqueezy_quantity_synced).toBe(false)

    // Simulate webhook payload
    const webhookPayload = {
      meta: {
        event_name: 'subscription_payment_success',
        event_id: `evt_${Date.now()}`
      },
      data: {
        id: testLemonSqueezySubId,
        attributes: {
          status: 'active',
          quantity: 2,
          renews_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          customer_id: 12345
        }
      }
    }

    // Process webhook
    const result = await processSubscriptionPaymentSuccess(webhookPayload)

    expect(result.success).toBe(true)
    expect(result.data?.previousSeats).toBe(4)
    expect(result.data?.newSeats).toBe(2)
    expect(result.data?.usersArchived).toBe(2)

    // Verify subscription updated
    sub = (await supabaseAdmin
      .from('subscriptions')
      .select('current_seats, pending_seats, lemonsqueezy_quantity_synced')
      .eq('id', testSubscriptionId)
      .single()).data

    expect(sub?.current_seats).toBe(2)
    expect(sub?.pending_seats).toBeNull()
    expect(sub?.lemonsqueezy_quantity_synced).toBe(true)

    // Verify users archived
    const { data: users } = await supabaseAdmin
      .from('user_organizations')
      .select('user_id, status')
      .eq('organization_id', testOrgId)
      .in('user_id', [testEmployee1Id, testEmployee2Id])

    expect(users).toHaveLength(2)
    users?.forEach(user => {
      expect(user.status).toBe('archived')
    })
  })

  test('9.4.2: Webhook with no pending changes does not modify anything', async () => {
    // No removals - no pending changes

    const webhookPayload = {
      meta: {
        event_name: 'subscription_payment_success',
        event_id: `evt_${Date.now()}`
      },
      data: {
        id: testLemonSqueezySubId,
        attributes: {
          status: 'active',
          quantity: 4,
          renews_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          customer_id: 12345
        }
      }
    }

    const result = await processSubscriptionPaymentSuccess(webhookPayload)

    expect(result.success).toBe(true)
    expect(result.data?.message).toBe('No pending changes to apply')

    // Verify subscription unchanged
    const { data: sub } = await supabaseAdmin
      .from('subscriptions')
      .select('current_seats, pending_seats')
      .eq('id', testSubscriptionId)
      .single()

    expect(sub?.current_seats).toBe(4)
    expect(sub?.pending_seats).toBeNull()
  })

  test('9.4.3: Webhook archives only users with removal_effective_date', async () => {
    // Remove employee1
    await removeUser(testEmployee1Id, testOrgId, testAdminId)

    // Manually set employee2 to pending_removal WITHOUT removal_effective_date
    await supabaseAdmin
      .from('user_organizations')
      .update({
        status: 'pending_removal',
        removal_effective_date: null
      })
      .eq('user_id', testEmployee2Id)
      .eq('organization_id', testOrgId)

    const webhookPayload = {
      meta: {
        event_name: 'subscription_payment_success',
        event_id: `evt_${Date.now()}`
      },
      data: {
        id: testLemonSqueezySubId,
        attributes: {
          status: 'active',
          quantity: 3,
          renews_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          customer_id: 12345
        }
      }
    }

    const result = await processSubscriptionPaymentSuccess(webhookPayload)

    expect(result.success).toBe(true)
    expect(result.data?.usersArchived).toBe(1) // Only employee1

    // Verify employee1 archived
    const { data: emp1 } = await supabaseAdmin
      .from('user_organizations')
      .select('status')
      .eq('user_id', testEmployee1Id)
      .eq('organization_id', testOrgId)
      .single()

    expect(emp1?.status).toBe('archived')

    // Verify employee2 still pending_removal
    const { data: emp2 } = await supabaseAdmin
      .from('user_organizations')
      .select('status')
      .eq('user_id', testEmployee2Id)
      .eq('organization_id', testOrgId)
      .single()

    expect(emp2?.status).toBe('pending_removal')
  })

  test('9.4.4: Multiple webhook deliveries are idempotent', async () => {
    // Remove employee1
    await removeUser(testEmployee1Id, testOrgId, testAdminId)

    const eventId = `evt_${Date.now()}`
    const webhookPayload = {
      meta: {
        event_name: 'subscription_payment_success',
        event_id: eventId
      },
      data: {
        id: testLemonSqueezySubId,
        attributes: {
          status: 'active',
          quantity: 3,
          renews_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          customer_id: 12345
        }
      }
    }

    // First webhook delivery
    const result1 = await processSubscriptionPaymentSuccess(webhookPayload)
    expect(result1.success).toBe(true)

    // Second delivery of same event (should be skipped)
    const result2 = await processSubscriptionPaymentSuccess(webhookPayload)
    expect(result2.success).toBe(true)
    expect(result2.data?.message).toBe('Event already processed')

    // Verify only 1 user archived (not doubled)
    const { count } = await supabaseAdmin
      .from('user_organizations')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', testOrgId)
      .eq('status', 'archived')

    expect(count).toBe(1)
  })

  test('9.4.5: Webhook handles removal of all employees', async () => {
    // Remove all 3 employees
    await removeUser(testEmployee1Id, testOrgId, testAdminId)
    await removeUser(testEmployee2Id, testOrgId, testAdminId)
    await removeUser(testEmployee3Id, testOrgId, testAdminId)

    const webhookPayload = {
      meta: {
        event_name: 'subscription_payment_success',
        event_id: `evt_${Date.now()}`
      },
      data: {
        id: testLemonSqueezySubId,
        attributes: {
          status: 'active',
          quantity: 1, // Only admin
          renews_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          customer_id: 12345
        }
      }
    }

    const result = await processSubscriptionPaymentSuccess(webhookPayload)

    expect(result.success).toBe(true)
    expect(result.data?.usersArchived).toBe(3)

    // Verify subscription updated to 1 seat
    const { data: sub } = await supabaseAdmin
      .from('subscriptions')
      .select('current_seats, pending_seats')
      .eq('id', testSubscriptionId)
      .single()

    expect(sub?.current_seats).toBe(1)
    expect(sub?.pending_seats).toBeNull()

    // Verify only admin remains active
    const { count: activeCount } = await supabaseAdmin
      .from('user_organizations')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', testOrgId)
      .eq('status', 'active')

    expect(activeCount).toBe(1)
  })

  test('9.4.6: Webhook updates renews_at date', async () => {
    const newRenewalDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

    const webhookPayload = {
      meta: {
        event_name: 'subscription_payment_success',
        event_id: `evt_${Date.now()}`
      },
      data: {
        id: testLemonSqueezySubId,
        attributes: {
          status: 'active',
          quantity: 4,
          renews_at: newRenewalDate,
          customer_id: 12345
        }
      }
    }

    await processSubscriptionPaymentSuccess(webhookPayload)

    const { data: sub } = await supabaseAdmin
      .from('subscriptions')
      .select('renews_at')
      .eq('id', testSubscriptionId)
      .single()

    // Compare dates after parsing to handle timezone format differences
    expect(new Date(sub?.renews_at || '').toISOString()).toBe(newRenewalDate)
  })
})
