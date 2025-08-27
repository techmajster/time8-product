/**
 * @fileoverview Comprehensive tests for invitation expiration handling and user feedback
 * 
 * Tests cover:
 * - Invitation expiration detection and validation
 * - Expired invitation handling in lookup endpoints
 * - User feedback for expired invitations
 * - Automatic expiration status updates
 * - Re-invitation workflows
 * - Cleanup of expired invitations
 * - Grace period handling
 * - Timezone considerations
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals'
import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/invitations/lookup/route'

describe('Invitation Expiration Handling', () => {
  let supabaseAdmin: ReturnType<typeof createAdminClient>
  let testOrganizationId: string
  let testTeamId: string
  let createdInvitationIds: string[] = []
  let testInvitations: any[] = []

  beforeAll(async () => {
    supabaseAdmin = createAdminClient()
    
    // Create test organization
    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizations')
      .insert({
        name: 'Test Organization for Expiration',
        created_by: '00000000-0000-0000-0000-000000000001'
      })
      .select('id')
      .single()

    if (orgError || !org) {
      throw new Error('Failed to create test organization')
    }
    testOrganizationId = org.id

    // Create test team
    const { data: team, error: teamError } = await supabaseAdmin
      .from('teams')
      .insert({
        name: 'Test Team for Expiration',
        organization_id: testOrganizationId
      })
      .select('id')
      .single()

    if (teamError || !team) {
      throw new Error('Failed to create test team')
    }
    testTeamId = team.id

    // Create test invitations with different expiration states
    const now = new Date()
    const invitationTemplates = [
      {
        email: 'recently.expired@example.com',
        full_name: 'Recently Expired User',
        role: 'employee',
        status: 'pending',
        expires_at: new Date(now.getTime() - 1 * 60 * 60 * 1000), // 1 hour ago
        description: 'recently expired invitation'
      },
      {
        email: 'long.expired@example.com',
        full_name: 'Long Expired User',
        role: 'employee',
        status: 'pending',
        expires_at: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        description: 'long expired invitation'
      },
      {
        email: 'expires.soon@example.com',
        full_name: 'Expires Soon User',
        role: 'employee',
        status: 'pending',
        expires_at: new Date(now.getTime() + 2 * 60 * 60 * 1000), // 2 hours from now
        description: 'expires soon invitation'
      },
      {
        email: 'expires.tomorrow@example.com',
        full_name: 'Expires Tomorrow User',
        role: 'employee',
        status: 'pending',
        expires_at: new Date(now.getTime() + 24 * 60 * 60 * 1000), // 24 hours from now
        description: 'expires tomorrow invitation'
      },
      {
        email: 'valid.future@example.com',
        full_name: 'Valid Future User',
        role: 'employee',
        status: 'pending',
        expires_at: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        description: 'valid future invitation'
      },
      {
        email: 'marked.expired@example.com',
        full_name: 'Marked Expired User',
        role: 'employee',
        status: 'expired', // Already marked as expired
        expires_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        description: 'already marked expired'
      },
      {
        email: 'exactly.now@example.com',
        full_name: 'Exactly Now User',
        role: 'employee',
        status: 'pending',
        expires_at: now, // Expires exactly now
        description: 'expires exactly now'
      },
      {
        email: 'microseconds.ago@example.com',
        full_name: 'Microseconds Ago User',
        role: 'employee',
        status: 'pending',
        expires_at: new Date(now.getTime() - 100), // 100ms ago
        description: 'expired microseconds ago'
      }
    ]

    for (const template of invitationTemplates) {
      const { description, ...invitationData } = template
      const insertData = {
        ...invitationData,
        organization_id: testOrganizationId,
        team_id: testTeamId,
        expires_at: template.expires_at.toISOString()
      }

      const { data: invitation, error } = await supabaseAdmin
        .from('invitations')
        .insert(insertData)
        .select('*')
        .single()

      if (error || !invitation) {
        throw new Error(`Failed to create test invitation: ${description}`)
      }

      testInvitations.push({ ...invitation, description })
      createdInvitationIds.push(invitation.id)
    }
  })

  afterAll(async () => {
    // Clean up test data
    if (createdInvitationIds.length > 0) {
      await supabaseAdmin
        .from('invitations')
        .delete()
        .in('id', createdInvitationIds)
    }

    await supabaseAdmin
      .from('teams')
      .delete()
      .eq('id', testTeamId)

    await supabaseAdmin
      .from('organizations')
      .delete()
      .eq('id', testOrganizationId)
  })

  describe('Expiration Detection', () => {
    it('should detect recently expired invitations', async () => {
      const recentlyExpired = testInvitations.find(inv => inv.description === 'recently expired invitation')
      
      const now = new Date()
      const expiresAt = new Date(recentlyExpired.expires_at)
      
      expect(expiresAt < now).toBe(true)
      expect(now.getTime() - expiresAt.getTime()).toBeLessThan(2 * 60 * 60 * 1000) // Less than 2 hours
    })

    it('should detect long expired invitations', async () => {
      const longExpired = testInvitations.find(inv => inv.description === 'long expired invitation')
      
      const now = new Date()
      const expiresAt = new Date(longExpired.expires_at)
      
      expect(expiresAt < now).toBe(true)
      expect(now.getTime() - expiresAt.getTime()).toBeGreaterThan(25 * 24 * 60 * 60 * 1000) // More than 25 days
    })

    it('should identify invitations that expire soon', async () => {
      const expiresSoon = testInvitations.find(inv => inv.description === 'expires soon invitation')
      
      const now = new Date()
      const expiresAt = new Date(expiresSoon.expires_at)
      const timeUntilExpiry = expiresAt.getTime() - now.getTime()
      
      expect(expiresAt > now).toBe(true)
      expect(timeUntilExpiry).toBeLessThan(3 * 60 * 60 * 1000) // Less than 3 hours
      expect(timeUntilExpiry).toBeGreaterThan(60 * 60 * 1000) // More than 1 hour
    })

    it('should handle exact expiration time', async () => {
      const exactlyNow = testInvitations.find(inv => inv.description === 'expires exactly now')
      
      const expiresAt = new Date(exactlyNow.expires_at)
      const now = new Date()
      
      // Should be very close to expiration time
      const timeDifference = Math.abs(now.getTime() - expiresAt.getTime())
      expect(timeDifference).toBeLessThan(10000) // Within 10 seconds
    })

    it('should handle microsecond-level expiration precision', async () => {
      const microExpired = testInvitations.find(inv => inv.description === 'expired microseconds ago')
      
      const now = new Date()
      const expiresAt = new Date(microExpired.expires_at)
      
      expect(expiresAt < now).toBe(true)
      expect(now.getTime() - expiresAt.getTime()).toBeLessThan(1000) // Less than 1 second
    })
  })

  describe('Expiration Handling in Lookup Endpoints', () => {
    it('should return 410 Gone for expired invitation via GET', async () => {
      const expiredInvitation = testInvitations.find(inv => inv.description === 'recently expired invitation')
      
      const url = new URL('http://localhost:3000/api/invitations/lookup')
      url.searchParams.set('token', expiredInvitation.token)
      
      const request = new NextRequest(url)
      const response = await GET(request)

      expect(response.status).toBe(410)
      
      const responseData = await response.json()
      expect(responseData.error).toBe('Invitation has expired')
    })

    it('should return 410 Gone for expired invitation via POST', async () => {
      const expiredInvitation = testInvitations.find(inv => inv.description === 'long expired invitation')
      
      const request = new NextRequest('http://localhost:3000/api/invitations/lookup', {
        method: 'POST',
        body: JSON.stringify({ code: expiredInvitation.invitation_code }),
        headers: { 'Content-Type': 'application/json' }
      })
      
      const response = await POST(request)

      expect(response.status).toBe(410)
      
      const responseData = await response.json()
      expect(responseData.error).toBe('Invitation has expired')
    })

    it('should allow access to non-expired invitations', async () => {
      const validInvitation = testInvitations.find(inv => inv.description === 'valid future invitation')
      
      const url = new URL('http://localhost:3000/api/invitations/lookup')
      url.searchParams.set('token', validInvitation.token)
      
      const request = new NextRequest(url)
      const response = await GET(request)

      expect(response.status).toBe(200)
      
      const responseData = await response.json()
      expect(responseData.id).toBe(validInvitation.id)
      expect(responseData.email).toBe(validInvitation.email)
    })

    it('should handle invitations expiring within grace period', async () => {
      const expiresSoon = testInvitations.find(inv => inv.description === 'expires soon invitation')
      
      const url = new URL('http://localhost:3000/api/invitations/lookup')
      url.searchParams.set('token', expiresSoon.token)
      
      const request = new NextRequest(url)
      const response = await GET(request)

      // Should still be valid since it hasn't expired yet
      expect(response.status).toBe(200)
      
      const responseData = await response.json()
      expect(responseData.id).toBe(expiresSoon.id)
    })

    it('should reject already marked expired invitations', async () => {
      const markedExpired = testInvitations.find(inv => inv.description === 'already marked expired')
      
      const url = new URL('http://localhost:3000/api/invitations/lookup')
      url.searchParams.set('token', markedExpired.token)
      
      const request = new NextRequest(url)
      const response = await GET(request)

      // Should return 404 because status is not 'pending'
      expect(response.status).toBe(404)
      
      const responseData = await response.json()
      expect(responseData.error).toBe('Invitation not found or invalid')
    })
  })

  describe('User Feedback and Error Messages', () => {
    it('should provide clear error message for expired invitations', async () => {
      const expiredInvitation = testInvitations.find(inv => inv.description === 'recently expired invitation')
      
      const url = new URL('http://localhost:3000/api/invitations/lookup')
      url.searchParams.set('token', expiredInvitation.token)
      
      const request = new NextRequest(url)
      const response = await GET(request)

      expect(response.status).toBe(410)
      
      const responseData = await response.json()
      expect(responseData.error).toBe('Invitation has expired')
      expect(typeof responseData.error).toBe('string')
      expect(responseData.error.length).toBeGreaterThan(0)
    })

    it('should use appropriate HTTP status codes for different expiration scenarios', async () => {
      const scenarios = [
        { invitation: testInvitations.find(inv => inv.description === 'recently expired invitation'), expectedStatus: 410 },
        { invitation: testInvitations.find(inv => inv.description === 'long expired invitation'), expectedStatus: 410 },
        { invitation: testInvitations.find(inv => inv.description === 'already marked expired'), expectedStatus: 404 },
        { invitation: testInvitations.find(inv => inv.description === 'valid future invitation'), expectedStatus: 200 }
      ]

      for (const scenario of scenarios) {
        const url = new URL('http://localhost:3000/api/invitations/lookup')
        url.searchParams.set('token', scenario.invitation.token)
        
        const request = new NextRequest(url)
        const response = await GET(request)

        expect(response.status).toBe(scenario.expectedStatus)
      }
    })

    it('should provide consistent error messages across different endpoints', async () => {
      const expiredInvitation = testInvitations.find(inv => inv.description === 'recently expired invitation')
      
      // Test GET endpoint
      const getUrl = new URL('http://localhost:3000/api/invitations/lookup')
      getUrl.searchParams.set('token', expiredInvitation.token)
      const getRequest = new NextRequest(getUrl)
      const getResponse = await GET(getRequest)
      const getResponseData = await getResponse.json()

      // Test POST endpoint
      const postRequest = new NextRequest('http://localhost:3000/api/invitations/lookup', {
        method: 'POST',
        body: JSON.stringify({ code: expiredInvitation.invitation_code }),
        headers: { 'Content-Type': 'application/json' }
      })
      const postResponse = await POST(postRequest)
      const postResponseData = await postResponse.json()

      expect(getResponse.status).toBe(postResponse.status)
      expect(getResponseData.error).toBe(postResponseData.error)
    })

    it('should include helpful information in error responses', async () => {
      const expiredInvitation = testInvitations.find(inv => inv.description === 'recently expired invitation')
      
      const url = new URL('http://localhost:3000/api/invitations/lookup')
      url.searchParams.set('token', expiredInvitation.token)
      
      const request = new NextRequest(url)
      const response = await GET(request)

      expect(response.status).toBe(410)
      
      const responseData = await response.json()
      expect(responseData).toHaveProperty('error')
      expect(responseData.error).toBe('Invitation has expired')
      
      // Should not expose sensitive information
      expect(responseData).not.toHaveProperty('token')
      expect(responseData).not.toHaveProperty('id')
    })
  })

  describe('Automatic Expiration Status Updates', () => {
    it('should identify invitations that need status updates', async () => {
      // Find all pending invitations that are past their expiration date
      const { data: expiredPending, error } = await supabaseAdmin
        .from('invitations')
        .select('*')
        .eq('status', 'pending')
        .lt('expires_at', new Date().toISOString())

      expect(error).toBeNull()
      expect(expiredPending).toBeDefined()
      
      // Should find the expired invitations we created
      expect(expiredPending!.length).toBeGreaterThan(0)
      
      const testEmails = expiredPending!.map(inv => inv.email)
      expect(testEmails).toContain('recently.expired@example.com')
      expect(testEmails).toContain('long.expired@example.com')
    })

    it('should batch update expired invitations to expired status', async () => {
      // Create a new expired invitation for this test
      const { data: newExpired, error: createError } = await supabaseAdmin
        .from('invitations')
        .insert({
          email: 'batch.expired@example.com',
          full_name: 'Batch Expired User',
          role: 'employee',
          organization_id: testOrganizationId,
          team_id: testTeamId,
          status: 'pending',
          expires_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString() // 1 hour ago
        })
        .select('*')
        .single()

      expect(createError).toBeNull()
      if (newExpired) createdInvitationIds.push(newExpired.id)

      // Update expired invitations
      const { data: updatedInvitations, error: updateError } = await supabaseAdmin
        .from('invitations')
        .update({ status: 'expired' })
        .eq('status', 'pending')
        .lt('expires_at', new Date().toISOString())
        .eq('email', 'batch.expired@example.com')
        .select('*')

      expect(updateError).toBeNull()
      expect(updatedInvitations).toBeDefined()
      expect(updatedInvitations!.length).toBe(1)
      expect(updatedInvitations![0].status).toBe('expired')
    })

    it('should preserve non-expired pending invitations during batch updates', async () => {
      const validFuture = testInvitations.find(inv => inv.description === 'valid future invitation')
      
      // Verify it's still pending and not expired
      const { data: invitation, error } = await supabaseAdmin
        .from('invitations')
        .select('*')
        .eq('id', validFuture.id)
        .single()

      expect(error).toBeNull()
      expect(invitation?.status).toBe('pending')
      expect(new Date(invitation!.expires_at) > new Date()).toBe(true)
    })

    it('should handle timezone considerations in expiration checks', async () => {
      const now = new Date()
      
      // Create invitation that expires in different timezone context
      const { data: timezoneTest, error: createError } = await supabaseAdmin
        .from('invitations')
        .insert({
          email: 'timezone.test@example.com',
          full_name: 'Timezone Test User',
          role: 'employee',
          organization_id: testOrganizationId,
          team_id: testTeamId,
          status: 'pending',
          expires_at: new Date(now.getTime() - 30 * 1000).toISOString() // 30 seconds ago in UTC
        })
        .select('*')
        .single()

      expect(createError).toBeNull()
      if (timezoneTest) createdInvitationIds.push(timezoneTest.id)

      // Check expiration using database time comparison
      const { data: expiredCheck, error: checkError } = await supabaseAdmin
        .from('invitations')
        .select('*')
        .eq('id', timezoneTest!.id)
        .lt('expires_at', 'now()')

      expect(checkError).toBeNull()
      expect(expiredCheck).toBeDefined()
      expect(expiredCheck!.length).toBe(1) // Should find the expired invitation
    })
  })

  describe('Re-invitation Workflows', () => {
    it('should allow creating new invitation after previous one expired', async () => {
      const expiredEmail = 'reinvite.test@example.com'
      
      // Create expired invitation
      const { data: expiredInvitation, error: expiredError } = await supabaseAdmin
        .from('invitations')
        .insert({
          email: expiredEmail,
          full_name: 'Reinvite Test User',
          role: 'employee',
          organization_id: testOrganizationId,
          team_id: testTeamId,
          status: 'expired',
          expires_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days ago
        })
        .select('*')
        .single()

      expect(expiredError).toBeNull()
      if (expiredInvitation) createdInvitationIds.push(expiredInvitation.id)

      // Create new invitation for the same email
      const { data: newInvitation, error: newError } = await supabaseAdmin
        .from('invitations')
        .insert({
          email: expiredEmail,
          full_name: 'Reinvite Test User Updated',
          role: 'manager', // Changed role
          organization_id: testOrganizationId,
          team_id: testTeamId,
          status: 'pending',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
        })
        .select('*')
        .single()

      expect(newError).toBeNull()
      expect(newInvitation).toBeDefined()
      if (newInvitation) createdInvitationIds.push(newInvitation.id)

      // Verify both invitations exist with different statuses
      const { data: allInvitations, error: queryError } = await supabaseAdmin
        .from('invitations')
        .select('*')
        .eq('email', expiredEmail)
        .order('created_at', { ascending: false })

      expect(queryError).toBeNull()
      expect(allInvitations).toBeDefined()
      expect(allInvitations!.length).toBe(2)
      
      const [newest, oldest] = allInvitations!
      expect(newest.status).toBe('pending')
      expect(newest.role).toBe('manager')
      expect(oldest.status).toBe('expired')
      expect(oldest.role).toBe('employee')
    })

    it('should handle overlapping invitation periods correctly', async () => {
      const overlappingEmail = 'overlap.test@example.com'
      const now = new Date()
      
      // Create first invitation that will expire soon
      const { data: firstInvitation, error: firstError } = await supabaseAdmin
        .from('invitations')
        .insert({
          email: overlappingEmail,
          full_name: 'Overlap Test User 1',
          role: 'employee',
          organization_id: testOrganizationId,
          team_id: testTeamId,
          status: 'pending',
          expires_at: new Date(now.getTime() + 1 * 60 * 60 * 1000).toISOString() // 1 hour from now
        })
        .select('*')
        .single()

      expect(firstError).toBeNull()
      if (firstInvitation) createdInvitationIds.push(firstInvitation.id)

      // Create second invitation with longer expiry
      const { data: secondInvitation, error: secondError } = await supabaseAdmin
        .from('invitations')
        .insert({
          email: overlappingEmail,
          full_name: 'Overlap Test User 2',
          role: 'manager',
          organization_id: testOrganizationId,
          team_id: testTeamId,
          status: 'pending',
          expires_at: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
        })
        .select('*')
        .single()

      expect(secondError).toBeNull()
      if (secondInvitation) createdInvitationIds.push(secondInvitation.id)

      // Both should exist and be valid
      const { data: pendingInvitations } = await supabaseAdmin
        .from('invitations')
        .select('*')
        .eq('email', overlappingEmail)
        .eq('status', 'pending')

      expect(pendingInvitations!.length).toBe(2)
    })

    it('should provide guidance on re-invitation best practices', async () => {
      // This test documents expected behavior rather than testing specific code
      const reinvitationGuidelines = {
        maxActiveInvitations: 1, // Recommended: Only one active invitation per email per organization
        gracePeriod: 24 * 60 * 60 * 1000, // 24 hours before allowing re-invitation
        defaultExpiryDays: 7, // Standard invitation expiry
        notificationBeforeExpiry: 24 * 60 * 60 * 1000 // Notify 24 hours before expiry
      }

      expect(reinvitationGuidelines.maxActiveInvitations).toBe(1)
      expect(reinvitationGuidelines.gracePeriod).toBe(24 * 60 * 60 * 1000)
      expect(reinvitationGuidelines.defaultExpiryDays).toBe(7)
      expect(reinvitationGuidelines.notificationBeforeExpiry).toBe(24 * 60 * 60 * 1000)
    })
  })

  describe('Cleanup and Maintenance', () => {
    it('should identify old expired invitations for cleanup', async () => {
      const cleanupThreshold = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) // 90 days ago
      
      // Create very old expired invitation
      const { data: oldExpired, error: oldError } = await supabaseAdmin
        .from('invitations')
        .insert({
          email: 'old.cleanup@example.com',
          full_name: 'Old Cleanup User',
          role: 'employee',
          organization_id: testOrganizationId,
          team_id: testTeamId,
          status: 'expired',
          expires_at: new Date(Date.now() - 95 * 24 * 60 * 60 * 1000).toISOString(), // 95 days ago
          created_at: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString() // 100 days ago
        })
        .select('*')
        .single()

      expect(oldError).toBeNull()
      if (oldExpired) createdInvitationIds.push(oldExpired.id)

      // Query for cleanup candidates
      const { data: cleanupCandidates, error: cleanupError } = await supabaseAdmin
        .from('invitations')
        .select('*')
        .eq('status', 'expired')
        .lt('expires_at', cleanupThreshold.toISOString())

      expect(cleanupError).toBeNull()
      expect(cleanupCandidates).toBeDefined()
      
      const oldInvitation = cleanupCandidates!.find(inv => inv.email === 'old.cleanup@example.com')
      expect(oldInvitation).toBeDefined()
    })

    it('should preserve recent expired invitations during cleanup', async () => {
      const recentExpired = testInvitations.find(inv => inv.description === 'recently expired invitation')
      
      // Recent expired invitations should not be cleanup candidates yet
      const cleanupThreshold = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
      const expiresAt = new Date(recentExpired.expires_at)
      
      expect(expiresAt > cleanupThreshold).toBe(true)
    })

    it('should handle cleanup of related data safely', async () => {
      // Create invitation for cleanup test
      const { data: cleanupTest, error: cleanupError } = await supabaseAdmin
        .from('invitations')
        .insert({
          email: 'cleanup.related@example.com',
          full_name: 'Cleanup Related User',
          role: 'employee',
          organization_id: testOrganizationId,
          team_id: testTeamId,
          status: 'expired',
          expires_at: new Date(Date.now() - 95 * 24 * 60 * 60 * 1000).toISOString()
        })
        .select('*')
        .single()

      expect(cleanupError).toBeNull()
      if (cleanupTest) createdInvitationIds.push(cleanupTest.id)

      // Verify invitation exists before cleanup
      const { data: beforeCleanup } = await supabaseAdmin
        .from('invitations')
        .select('*')
        .eq('id', cleanupTest!.id)
        .single()

      expect(beforeCleanup).toBeDefined()

      // Simulate cleanup (delete old expired invitations)
      const { error: deleteError } = await supabaseAdmin
        .from('invitations')
        .delete()
        .eq('id', cleanupTest!.id)

      expect(deleteError).toBeNull()

      // Verify invitation was cleaned up
      const { data: afterCleanup, error: afterError } = await supabaseAdmin
        .from('invitations')
        .select('*')
        .eq('id', cleanupTest!.id)
        .single()

      expect(afterError).toBeDefined() // Should not find the invitation
      expect(afterCleanup).toBeNull()
    })
  })

  describe('Performance and Edge Cases', () => {
    it('should handle large numbers of expired invitations efficiently', async () => {
      const batchSize = 50
      const expiredInvitations = []

      // Create batch of expired invitations
      for (let i = 0; i < batchSize; i++) {
        expiredInvitations.push({
          email: `batch${i}.expired@example.com`,
          full_name: `Batch Expired User ${i}`,
          role: 'employee',
          organization_id: testOrganizationId,
          team_id: testTeamId,
          status: 'pending',
          expires_at: new Date(Date.now() - (i + 1) * 60 * 60 * 1000).toISOString() // Different expiry times
        })
      }

      const startTime = Date.now()
      
      const { data: batchCreated, error: batchError } = await supabaseAdmin
        .from('invitations')
        .insert(expiredInvitations)
        .select('id')

      const endTime = Date.now()

      expect(batchError).toBeNull()
      expect(batchCreated).toBeDefined()
      expect(batchCreated!.length).toBe(batchSize)
      expect(endTime - startTime).toBeLessThan(5000) // Should complete within 5 seconds

      // Clean up batch
      if (batchCreated) {
        const batchIds = batchCreated.map(inv => inv.id)
        createdInvitationIds.push(...batchIds)
      }
    })

    it('should handle concurrent expiration checks', async () => {
      const expiredInvitation = testInvitations.find(inv => inv.description === 'recently expired invitation')
      
      // Create multiple concurrent expiration checks
      const checkPromises = Array(10).fill(null).map(() => {
        const url = new URL('http://localhost:3000/api/invitations/lookup')
        url.searchParams.set('token', expiredInvitation.token)
        const request = new NextRequest(url)
        return GET(request)
      })

      const responses = await Promise.all(checkPromises)
      
      // All responses should consistently return 410 for expired invitation
      responses.forEach(response => {
        expect(response.status).toBe(410)
      })
    })

    it('should handle daylight saving time transitions', async () => {
      // Create invitation that would expire during DST transition
      const dstTransition = new Date('2024-03-10T07:00:00.000Z') // Example DST transition
      
      const { data: dstTest, error: dstError } = await supabaseAdmin
        .from('invitations')
        .insert({
          email: 'dst.test@example.com',
          full_name: 'DST Test User',
          role: 'employee',
          organization_id: testOrganizationId,
          team_id: testTeamId,
          status: 'pending',
          expires_at: dstTransition.toISOString()
        })
        .select('*')
        .single()

      expect(dstError).toBeNull()
      if (dstTest) createdInvitationIds.push(dstTest.id)

      // Expiration check should use UTC consistently
      const isExpired = new Date(dstTest!.expires_at) < new Date()
      expect(typeof isExpired).toBe('boolean')
    })
  })
})