/**
 * Seat Enforcement & Billing Override Tests
 * 
 * Tests seat limit enforcement in the invitation system and billing override logic.
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

describe('Seat Enforcement', () => {
  let testOrgId: string
  let testUserId: string
  let adminAuthToken: string

  beforeAll(async () => {
    // Create test organization and admin user
    const { data: org } = await supabase
      .from('organizations')
      .insert({
        name: 'Seat Test Org',
        slug: 'seat-test-org',
        subscription_tier: 'free',
        paid_seats: 0
      })
      .select()
      .single()

    testOrgId = org.id

    const { data: { user } } = await supabase.auth.signUp({
      email: 'seat-admin@test.com',
      password: 'password123'
    })
    testUserId = user!.id

    // Add user to organization as admin
    await supabase
      .from('user_organizations')
      .insert({
        user_id: testUserId,
        organization_id: testOrgId,
        role: 'admin',
        is_active: true
      })

    // Get auth token for API calls
    const { data: { session } } = await supabase.auth.signInWithPassword({
      email: 'seat-admin@test.com',
      password: 'password123'
    })
    adminAuthToken = session!.access_token
  })

  afterAll(async () => {
    // Cleanup test data
    await supabase
      .from('user_organizations')
      .delete()
      .eq('organization_id', testOrgId)

    await supabase
      .from('invitations')
      .delete()
      .eq('organization_id', testOrgId)

    await supabase
      .from('organizations')
      .delete()
      .eq('id', testOrgId)

    await supabase.auth.signOut()
  })

  describe('Free Plan Seat Limits', () => {
    test('should allow invitations within free plan limit (3 seats)', async () => {
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/employees`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminAuthToken}`
        },
        body: JSON.stringify({
          employees: [
            {
              email: 'employee1@test.com',
              full_name: 'Employee One',
              role: 'employee',
              send_invitation: false
            },
            {
              email: 'employee2@test.com', 
              full_name: 'Employee Two',
              role: 'employee',
              send_invitation: false
            }
          ]
        })
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.results).toHaveLength(2)
    })

    test('should block invitations exceeding free plan limit', async () => {
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/employees`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminAuthToken}`
        },
        body: JSON.stringify({
          employees: [
            {
              email: 'overflow1@test.com',
              full_name: 'Overflow One',
              role: 'employee',
              send_invitation: false
            }
          ]
        })
      })

      expect(response.status).toBe(409)
      const data = await response.json()
      expect(data.error).toBe('Seat limit exceeded')
      expect(data.details.upgrade_required).toBe(true)
      expect(data.details.available).toBe(0)
    })
  })

  describe('Paid Plan Seat Limits', () => {
    beforeAll(async () => {
      // Upgrade organization to paid plan
      await supabase
        .from('organizations')
        .update({
          subscription_tier: 'paid',
          paid_seats: 5
        })
        .eq('id', testOrgId)
    })

    test('should allow invitations within paid plan limit (3 free + 5 paid = 8 total)', async () => {
      // Clear existing invitations for clean test
      await supabase
        .from('invitations')
        .delete()
        .eq('organization_id', testOrgId)

      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/employees`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminAuthToken}`
        },
        body: JSON.stringify({
          employees: [
            {
              email: 'paid1@test.com',
              full_name: 'Paid Employee 1',
              role: 'employee',
              send_invitation: false
            },
            {
              email: 'paid2@test.com',
              full_name: 'Paid Employee 2', 
              role: 'employee',
              send_invitation: false
            }
          ]
        })
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
    })

    test('should block invitations exceeding paid plan limit', async () => {
      // Try to invite more users than remaining seats
      const employees = Array.from({ length: 10 }, (_, i) => ({
        email: `bulk${i}@test.com`,
        full_name: `Bulk Employee ${i}`,
        role: 'employee',
        send_invitation: false
      }))

      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/employees`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminAuthToken}`
        },
        body: JSON.stringify({ employees })
      })

      expect(response.status).toBe(409)
      const data = await response.json()
      expect(data.error).toBe('Seat limit exceeded')
      expect(data.details.upgrade_required).toBe(true)
    })
  })

  describe('Billing Override Logic', () => {
    beforeAll(async () => {
      // Add billing override to organization
      await supabase
        .from('organizations')
        .update({
          billing_override_reason: 'Enterprise trial',
          billing_override_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        })
        .eq('id', testOrgId)
    })

    test('should allow unlimited invitations with billing override', async () => {
      const employees = Array.from({ length: 20 }, (_, i) => ({
        email: `override${i}@test.com`,
        full_name: `Override Employee ${i}`,
        role: 'employee',
        send_invitation: false
      }))

      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/employees`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminAuthToken}`
        },
        body: JSON.stringify({ employees })
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.results).toHaveLength(20)
    })

    test('should include pending invitations in seat calculation', async () => {
      // Remove billing override
      await supabase
        .from('organizations')
        .update({
          billing_override_reason: null,
          billing_override_expires_at: null,
          subscription_tier: 'free',
          paid_seats: 0
        })
        .eq('id', testOrgId)

      // Clear existing data
      await supabase.from('invitations').delete().eq('organization_id', testOrgId)
      await supabase.from('user_organizations').delete().eq('organization_id', testOrgId).neq('role', 'admin')

      // Add 2 pending invitations
      await supabase
        .from('invitations')
        .insert([
          {
            email: 'pending1@test.com',
            full_name: 'Pending One',
            role: 'employee',
            organization_id: testOrgId,
            invited_by: testUserId,
            token: 'test-token-1',
            invitation_code: 'TEST01',
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'pending'
          },
          {
            email: 'pending2@test.com',
            full_name: 'Pending Two',
            role: 'employee',
            organization_id: testOrgId,
            invited_by: testUserId,
            token: 'test-token-2',
            invitation_code: 'TEST02',
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'pending'
          }
        ])

      // Try to invite 2 more (should fail - 1 admin + 2 pending + 2 new = 5, but limit is 3)
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/employees`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminAuthToken}`
        },
        body: JSON.stringify({
          employees: [
            {
              email: 'additional1@test.com',
              full_name: 'Additional One',
              role: 'employee',
              send_invitation: false
            },
            {
              email: 'additional2@test.com',
              full_name: 'Additional Two',
              role: 'employee', 
              send_invitation: false
            }
          ]
        })
      })

      expect(response.status).toBe(409)
      const data = await response.json()
      expect(data.error).toBe('Seat limit exceeded')
      expect(data.details.current_members).toBe(1) // 1 admin
      expect(data.details.pending_invitations).toBe(2)
      expect(data.details.requested).toBe(2)
      expect(data.details.available).toBe(0) // 3 total - 1 admin - 2 pending = 0
    })

    afterAll(async () => {
      // Clean up billing override
      await supabase
        .from('organizations')
        .update({
          billing_override_reason: null,
          billing_override_expires_at: null
        })
        .eq('id', testOrgId)
    })
  })
})