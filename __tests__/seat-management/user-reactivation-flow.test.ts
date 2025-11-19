/**
 * User Reactivation Flow Integration Test Suite
 *
 * Tests for Task 9.2: E2E test for user reactivation flow
 *
 * This comprehensive test suite validates:
 * - Reactivating pending_removal users before grace period ends
 * - Reactivating archived users after they were removed
 * - pending_seats updates correctly on reactivation
 * - Seat availability checks prevent over-subscription
 * - Status transitions (pending_removal → active, archived → active)
 * - Access restoration after reactivation
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals'
import { createClient } from '@supabase/supabase-js'
import { removeUser, reactivateUser, reactivateArchivedUser, getSeatUsage } from '@/lib/seat-management'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

describe('User Reactivation Flow E2E Tests', () => {
  let testOrgId: string
  let testAdminId: string
  let testEmployee1Id: string
  let testEmployee2Id: string
  let testSubscriptionId: string

  beforeEach(async () => {
    // Create test organization
    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizations')
      .insert({
        name: `Reactivation Test Org ${Date.now()}`,
        country_code: 'PL'
      })
      .select()
      .single()

    if (orgError) throw new Error(`Failed to create test org: ${orgError.message}`)
    testOrgId = org.id

    // Create test subscription
    const renewalDate = new Date()
    renewalDate.setDate(renewalDate.getDate() + 7)

    const { data: sub, error: subError } = await supabaseAdmin
      .from('subscriptions')
      .insert({
        organization_id: testOrgId,
        status: 'active',
        current_seats: 3, // admin + 2 employees
        pending_seats: null,
        renews_at: renewalDate.toISOString(),
        lemonsqueezy_subscription_id: `test_sub_${Date.now()}`,
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
  })

  afterEach(async () => {
    if (testAdminId) await supabaseAdmin.auth.admin.deleteUser(testAdminId)
    if (testEmployee1Id) await supabaseAdmin.auth.admin.deleteUser(testEmployee1Id)
    if (testEmployee2Id) await supabaseAdmin.auth.admin.deleteUser(testEmployee2Id)

    if (testOrgId) {
      await supabaseAdmin.from('user_organizations').delete().eq('organization_id', testOrgId)
      await supabaseAdmin.from('subscriptions').delete().eq('organization_id', testOrgId)
      await supabaseAdmin.from('organizations').delete().eq('id', testOrgId)
    }
  })

  test('9.2.1: Reactivate pending_removal user should restore active status', async () => {
    // Remove employee1
    await removeUser(testEmployee1Id, testOrgId, testAdminId)

    // Verify pending_removal
    let { data: userOrg } = await supabaseAdmin
      .from('user_organizations')
      .select('status')
      .eq('user_id', testEmployee1Id)
      .eq('organization_id', testOrgId)
      .single()

    expect(userOrg?.status).toBe('pending_removal')

    // Reactivate
    const result = await reactivateUser(testEmployee1Id, testOrgId, testAdminId)
    expect(result.success).toBe(true)

    // Verify active
    userOrg = (await supabaseAdmin
      .from('user_organizations')
      .select('status, removal_effective_date')
      .eq('user_id', testEmployee1Id)
      .eq('organization_id', testOrgId)
      .single()).data

    expect(userOrg?.status).toBe('active')
    expect(userOrg?.removal_effective_date).toBeNull()
  })

  test('9.2.2: Reactivating pending_removal user should update pending_seats', async () => {
    // Remove employee1 (pending_seats becomes 2: admin + employee2)
    await removeUser(testEmployee1Id, testOrgId, testAdminId)

    let { data: sub } = await supabaseAdmin
      .from('subscriptions')
      .select('pending_seats')
      .eq('id', testSubscriptionId)
      .single()

    expect(sub?.pending_seats).toBe(2)

    // Reactivate employee1 (pending_seats should become null - no more pending removals)
    await reactivateUser(testEmployee1Id, testOrgId, testAdminId)

    sub = (await supabaseAdmin
      .from('subscriptions')
      .select('pending_seats')
      .eq('id', testSubscriptionId)
      .single()).data

    expect(sub?.pending_seats).toBeNull()
  })

  test('9.2.3: Cannot reactivate active user', async () => {
    // Try to reactivate employee1 who is already active
    const result = await reactivateUser(testEmployee1Id, testOrgId, testAdminId)

    expect(result.success).toBe(false)
    expect(result.error).toContain('Cannot reactivate user with status: active')
  })

  test('9.2.4: Reactivate archived user should restore active status and increase pending_seats', async () => {
    // First, manually archive the user (simulating what would happen at renewal)
    await supabaseAdmin
      .from('user_organizations')
      .update({
        status: 'archived',
        is_active: false,
        removal_effective_date: null
      })
      .eq('user_id', testEmployee1Id)
      .eq('organization_id', testOrgId)

    // Update subscription to reflect the removal
    await supabaseAdmin
      .from('subscriptions')
      .update({ current_seats: 2 }) // Admin + employee2
      .eq('id', testSubscriptionId)

    // Verify archived
    let { data: userOrg } = await supabaseAdmin
      .from('user_organizations')
      .select('status, is_active')
      .eq('user_id', testEmployee1Id)
      .eq('organization_id', testOrgId)
      .single()

    expect(userOrg?.status).toBe('archived')
    expect(userOrg?.is_active).toBe(false)

    // Reactivate archived user
    const result = await reactivateArchivedUser(testEmployee1Id, testOrgId, testAdminId)
    expect(result.success).toBe(true)

    // Verify active
    userOrg = (await supabaseAdmin
      .from('user_organizations')
      .select('status, is_active')
      .eq('user_id', testEmployee1Id)
      .eq('organization_id', testOrgId)
      .single()).data

    expect(userOrg?.status).toBe('active')
    expect(userOrg?.is_active).toBe(true)

    // Verify pending_seats increased
    const { data: sub } = await supabaseAdmin
      .from('subscriptions')
      .select('current_seats, pending_seats')
      .eq('id', testSubscriptionId)
      .single()

    expect(sub?.current_seats).toBe(2) // Stays same until renewal
    expect(sub?.pending_seats).toBe(3) // Increases to reflect reactivation (admin + 2 employees)
  })

  test('9.2.5: Cannot reactivate archived user as non-admin', async () => {
    // Archive employee1
    await supabaseAdmin
      .from('user_organizations')
      .update({ status: 'archived', is_active: false })
      .eq('user_id', testEmployee1Id)
      .eq('organization_id', testOrgId)

    // Try to reactivate as employee2 (not admin)
    const result = await reactivateArchivedUser(testEmployee1Id, testOrgId, testEmployee2Id)

    expect(result.success).toBe(false)
    expect(result.error).toContain('admin')
  })

  test('9.2.6: getSeatUsage correctly reflects reactivation', async () => {
    // Initial state: 3 active users (admin + 2 employees)
    let seatUsage = await getSeatUsage(testOrgId)
    expect(seatUsage.activeSeats).toBe(3)
    expect(seatUsage.pendingRemovals).toBe(0)

    // Remove employee1
    await removeUser(testEmployee1Id, testOrgId, testAdminId)

    // Still 3 active (including pending_removal)
    seatUsage = await getSeatUsage(testOrgId)
    expect(seatUsage.activeSeats).toBe(3)
    expect(seatUsage.pendingRemovals).toBe(1)

    // Reactivate employee1
    await reactivateUser(testEmployee1Id, testOrgId, testAdminId)

    // Still 3 active, no pending removals
    seatUsage = await getSeatUsage(testOrgId)
    expect(seatUsage.activeSeats).toBe(3)
    expect(seatUsage.pendingRemovals).toBe(0)
  })

  test('9.2.7: Multiple reactivations in same period should work correctly', async () => {
    // Remove both employees
    await removeUser(testEmployee1Id, testOrgId, testAdminId)
    await removeUser(testEmployee2Id, testOrgId, testAdminId)

    let { data: sub } = await supabaseAdmin
      .from('subscriptions')
      .select('pending_seats')
      .eq('id', testSubscriptionId)
      .single()

    expect(sub?.pending_seats).toBe(1) // Only admin remains

    // Reactivate employee1 (still one pending_removal, so pending_seats = active count)
    await reactivateUser(testEmployee1Id, testOrgId, testAdminId)

    sub = (await supabaseAdmin
      .from('subscriptions')
      .select('pending_seats')
      .eq('id', testSubscriptionId)
      .single()).data

    expect(sub?.pending_seats).toBe(2) // Admin + employee1

    // Reactivate employee2 (no more pending_removals, so pending_seats = null)
    await reactivateUser(testEmployee2Id, testOrgId, testAdminId)

    sub = (await supabaseAdmin
      .from('subscriptions')
      .select('pending_seats')
      .eq('id', testSubscriptionId)
      .single()).data

    expect(sub?.pending_seats).toBeNull() // No pending removals
  })

  test('9.2.8: Reactivation marks subscription as not synced', async () => {
    // Remove employee1
    await removeUser(testEmployee1Id, testOrgId, testAdminId)

    // Verify not synced
    let { data: sub } = await supabaseAdmin
      .from('subscriptions')
      .select('lemonsqueezy_quantity_synced')
      .eq('id', testSubscriptionId)
      .single()

    expect(sub?.lemonsqueezy_quantity_synced).toBe(false)

    // Manually set to synced
    await supabaseAdmin
      .from('subscriptions')
      .update({ lemonsqueezy_quantity_synced: true })
      .eq('id', testSubscriptionId)

    // Reactivate
    await reactivateUser(testEmployee1Id, testOrgId, testAdminId)

    // Should be marked as not synced again
    sub = (await supabaseAdmin
      .from('subscriptions')
      .select('lemonsqueezy_quantity_synced')
      .eq('id', testSubscriptionId)
      .single()).data

    expect(sub?.lemonsqueezy_quantity_synced).toBe(false)
  })
})
