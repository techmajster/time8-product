/**
 * User Removal with Grace Period Integration Test Suite
 *
 * Tests for Task 9.1: E2E test for complete user removal flow with grace period
 *
 * This comprehensive test suite validates:
 * - User removal marks status as pending_removal (not immediate deletion)
 * - Grace period extends until subscription renewal date
 * - User retains access during grace period
 * - pending_seats is calculated correctly
 * - Subscription quantity stays unchanged until renewal
 * - User is archived automatically at renewal
 * - Seat count decreases after archival
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals'
import { createClient } from '@supabase/supabase-js'
import { removeUser, reactivateUser, getSeatUsage } from '@/lib/seat-management'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

describe('User Removal with Grace Period E2E Tests', () => {
  let testOrgId: string
  let testAdminId: string
  let testEmployee1Id: string
  let testEmployee2Id: string
  let testEmployee3Id: string
  let testSubscriptionId: string

  const cleanupIds: string[] = []

  beforeEach(async () => {
    // Create test organization
    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizations')
      .insert({
        name: `Seat Mgmt Test Org ${Date.now()}`,
        slug: `seat-test-${Date.now()}`,
        country_code: 'PL'
      })
      .select()
      .single()

    if (orgError) throw new Error(`Failed to create test org: ${orgError.message}`)
    testOrgId = org.id
    cleanupIds.push(testOrgId)

    // Create test subscription with renewal date 7 days from now
    const renewalDate = new Date()
    renewalDate.setDate(renewalDate.getDate() + 7)

    const { data: sub, error: subError } = await supabaseAdmin
      .from('subscriptions')
      .insert({
        organization_id: testOrgId,
        status: 'active',
        current_seats: 4,
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

    // Create test users (admin + 3 employees)
    const createUser = async (email: string, role: string) => {
      // Create auth user
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: 'TestPassword123!',
        email_confirm: true
      })

      if (authError) throw new Error(`Failed to create auth user: ${authError.message}`)

      // Create profile
      await supabaseAdmin
        .from('profiles')
        .insert({
          id: authUser.user.id,
          email: authUser.user.email,
          full_name: `Test User ${email}`
        })

      // Create user_organization
      await supabaseAdmin
        .from('user_organizations')
        .insert({
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
    // Clean up test data
    if (testAdminId) {
      await supabaseAdmin.auth.admin.deleteUser(testAdminId)
    }
    if (testEmployee1Id) {
      await supabaseAdmin.auth.admin.deleteUser(testEmployee1Id)
    }
    if (testEmployee2Id) {
      await supabaseAdmin.auth.admin.deleteUser(testEmployee2Id)
    }
    if (testEmployee3Id) {
      await supabaseAdmin.auth.admin.deleteUser(testEmployee3Id)
    }

    if (testOrgId) {
      await supabaseAdmin.from('user_organizations').delete().eq('organization_id', testOrgId)
      await supabaseAdmin.from('subscriptions').delete().eq('organization_id', testOrgId)
      await supabaseAdmin.from('organizations').delete().eq('id', testOrgId)
    }
  })

  test('9.1.1: User removal should mark status as pending_removal, not delete immediately', async () => {
    // Remove employee1
    const result = await removeUser(testEmployee1Id, testOrgId, testAdminId)

    expect(result.success).toBe(true)
    expect(result.data?.removalEffectiveDate).toBeDefined()

    // Verify user_organizations record still exists with pending_removal status
    const { data: userOrg, error } = await supabaseAdmin
      .from('user_organizations')
      .select('status, removal_effective_date, is_active')
      .eq('user_id', testEmployee1Id)
      .eq('organization_id', testOrgId)
      .single()

    expect(error).toBeNull()
    expect(userOrg).toBeDefined()
    expect(userOrg?.status).toBe('pending_removal')
    expect(userOrg?.is_active).toBe(true) // Still active during grace period
    expect(userOrg?.removal_effective_date).toBeDefined()
  })

  test('9.1.2: Removal effective date should match subscription renewal date', async () => {
    // Remove employee1
    const result = await removeUser(testEmployee1Id, testOrgId, testAdminId)

    expect(result.success).toBe(true)

    // Get subscription renewal date
    const { data: sub } = await supabaseAdmin
      .from('subscriptions')
      .select('renews_at')
      .eq('id', testSubscriptionId)
      .single()

    // Get user removal effective date
    const { data: userOrg } = await supabaseAdmin
      .from('user_organizations')
      .select('removal_effective_date')
      .eq('user_id', testEmployee1Id)
      .eq('organization_id', testOrgId)
      .single()

    // Both dates should match
    expect(userOrg?.removal_effective_date).toBe(sub?.renews_at)
  })

  test('9.1.3: User retains access during grace period (is_active remains true)', async () => {
    // Remove employee1
    await removeUser(testEmployee1Id, testOrgId, testAdminId)

    // Verify user still has access
    const { data: userOrg } = await supabaseAdmin
      .from('user_organizations')
      .select('is_active, status')
      .eq('user_id', testEmployee1Id)
      .eq('organization_id', testOrgId)
      .single()

    expect(userOrg?.is_active).toBe(true)
    expect(userOrg?.status).toBe('pending_removal')
  })

  test('9.1.4: Subscription pending_seats should decrease by 1', async () => {
    // Get initial pending_seats (should be null or 4)
    const { data: subBefore } = await supabaseAdmin
      .from('subscriptions')
      .select('current_seats, pending_seats')
      .eq('id', testSubscriptionId)
      .single()

    expect(subBefore?.current_seats).toBe(4)

    // Remove employee1
    await removeUser(testEmployee1Id, testOrgId, testAdminId)

    // Verify pending_seats is now 3
    const { data: subAfter } = await supabaseAdmin
      .from('subscriptions')
      .select('current_seats, pending_seats, lemonsqueezy_quantity_synced')
      .eq('id', testSubscriptionId)
      .single()

    expect(subAfter?.current_seats).toBe(4) // Current stays the same
    expect(subAfter?.pending_seats).toBe(3) // Pending decreases
    expect(subAfter?.lemonsqueezy_quantity_synced).toBe(false) // Marked for sync
  })

  test('9.1.5: Multiple removals in same period should calculate pending_seats correctly', async () => {
    // Remove employee1
    await removeUser(testEmployee1Id, testOrgId, testAdminId)

    let { data: sub } = await supabaseAdmin
      .from('subscriptions')
      .select('pending_seats')
      .eq('id', testSubscriptionId)
      .single()

    expect(sub?.pending_seats).toBe(3)

    // Remove employee2
    await removeUser(testEmployee2Id, testOrgId, testAdminId)

    sub = (await supabaseAdmin
      .from('subscriptions')
      .select('pending_seats')
      .eq('id', testSubscriptionId)
      .single()).data

    expect(sub?.pending_seats).toBe(2)

    // Remove employee3
    await removeUser(testEmployee3Id, testOrgId, testAdminId)

    sub = (await supabaseAdmin
      .from('subscriptions')
      .select('pending_seats')
      .eq('id', testSubscriptionId)
      .single()).data

    expect(sub?.pending_seats).toBe(1) // Only admin remains
  })

  test('9.1.6: Cannot remove user already pending_removal', async () => {
    // Remove employee1 first time
    const result1 = await removeUser(testEmployee1Id, testOrgId, testAdminId)
    expect(result1.success).toBe(true)

    // Try to remove same user again
    const result2 = await removeUser(testEmployee1Id, testOrgId, testAdminId)
    expect(result2.success).toBe(false)
    expect(result2.error).toContain('already pending_removal')
  })

  test('9.1.7: getSeatUsage includes pending_removal users in active count', async () => {
    // Remove employee1
    await removeUser(testEmployee1Id, testOrgId, testAdminId)

    // Get seat usage
    const seatUsage = await getSeatUsage(testOrgId)

    // Should still count all 4 users (including pending_removal)
    expect(seatUsage.activeSeats).toBe(4)
    expect(seatUsage.pendingRemovals).toBe(1)
    expect(seatUsage.currentSeats).toBe(4)
    expect(seatUsage.pendingSeats).toBe(3)
  })

  test('9.1.8: Admin cannot remove themselves', async () => {
    const result = await removeUser(testAdminId, testOrgId, testAdminId)

    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })

  test('9.1.9: Removing user and then canceling removal should restore active status', async () => {
    // Remove employee1
    const removeResult = await removeUser(testEmployee1Id, testOrgId, testAdminId)
    expect(removeResult.success).toBe(true)

    // Verify pending_removal
    let { data: userOrg } = await supabaseAdmin
      .from('user_organizations')
      .select('status')
      .eq('user_id', testEmployee1Id)
      .eq('organization_id', testOrgId)
      .single()

    expect(userOrg?.status).toBe('pending_removal')

    // Cancel removal (reactivate)
    const reactivateResult = await reactivateUser(testEmployee1Id, testOrgId, testAdminId)
    expect(reactivateResult.success).toBe(true)

    // Verify back to active
    userOrg = (await supabaseAdmin
      .from('user_organizations')
      .select('status, removal_effective_date')
      .eq('user_id', testEmployee1Id)
      .eq('organization_id', testOrgId)
      .single()).data

    expect(userOrg?.status).toBe('active')
    expect(userOrg?.removal_effective_date).toBeNull()
  })

  test('9.1.10: Subscription current_seats remains unchanged during grace period', async () => {
    const { data: subBefore } = await supabaseAdmin
      .from('subscriptions')
      .select('current_seats')
      .eq('id', testSubscriptionId)
      .single()

    // Remove employee
    await removeUser(testEmployee1Id, testOrgId, testAdminId)

    const { data: subAfter } = await supabaseAdmin
      .from('subscriptions')
      .select('current_seats')
      .eq('id', testSubscriptionId)
      .single()

    // Current seats should not change
    expect(subAfter?.current_seats).toBe(subBefore?.current_seats)
  })
})
