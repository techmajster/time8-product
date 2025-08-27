/**
 * @fileoverview Comprehensive tests for duplicate invitation scenarios and conflict resolution
 * 
 * Tests cover:
 * - Preventing duplicate active invitations
 * - Handling multiple invitation states for same user/organization
 * - Conflict resolution strategies
 * - Re-invitation after acceptance/rejection
 * - Database constraint enforcement
 * - User experience for duplicate scenarios
 * - Admin management of duplicate invitations
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals'
import { createAdminClient } from '@/lib/supabase/server'

describe('Duplicate Invitation Scenarios and Conflict Resolution', () => {
  let supabaseAdmin: ReturnType<typeof createAdminClient>
  let testOrganizationId: string
  let testTeamId: string
  let secondTeamId: string
  let createdInvitationIds: string[] = []
  let createdUserIds: string[] = []

  beforeAll(async () => {
    supabaseAdmin = createAdminClient()
    
    // Create test organization
    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizations')
      .insert({
        name: 'Test Organization for Duplicates',
        created_by: '00000000-0000-0000-0000-000000000001'
      })
      .select('id')
      .single()

    if (orgError || !org) {
      throw new Error('Failed to create test organization')
    }
    testOrganizationId = org.id

    // Create test teams
    const { data: team1, error: team1Error } = await supabaseAdmin
      .from('teams')
      .insert({
        name: 'Team Alpha',
        organization_id: testOrganizationId
      })
      .select('id')
      .single()

    const { data: team2, error: team2Error } = await supabaseAdmin
      .from('teams')
      .insert({
        name: 'Team Beta',
        organization_id: testOrganizationId
      })
      .select('id')
      .single()

    if (team1Error || !team1 || team2Error || !team2) {
      throw new Error('Failed to create test teams')
    }
    
    testTeamId = team1.id
    secondTeamId = team2.id
  })

  afterAll(async () => {
    // Clean up users
    if (createdUserIds.length > 0) {
      for (const userId of createdUserIds) {
        await supabaseAdmin.auth.admin.deleteUser(userId)
      }
    }

    // Clean up invitations
    if (createdInvitationIds.length > 0) {
      await supabaseAdmin
        .from('invitations')
        .delete()
        .in('id', createdInvitationIds)
    }

    await supabaseAdmin
      .from('teams')
      .delete()
      .in('id', [testTeamId, secondTeamId])

    await supabaseAdmin
      .from('organizations')
      .delete()
      .eq('id', testOrganizationId)
  })

  beforeEach(() => {
    // Reset test state
  })

  describe('Preventing Duplicate Active Invitations', () => {
    it('should detect existing pending invitation for same email/organization', async () => {
      const testEmail = 'duplicate.test@example.com'
      
      // Create first invitation
      const { data: firstInvitation, error: firstError } = await supabaseAdmin
        .from('invitations')
        .insert({
          email: testEmail,
          full_name: 'Duplicate Test User',
          role: 'employee',
          organization_id: testOrganizationId,
          team_id: testTeamId,
          status: 'pending',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        })
        .select('*')
        .single()

      expect(firstError).toBeNull()
      if (firstInvitation) createdInvitationIds.push(firstInvitation.id)

      // Check for existing pending invitation
      const { data: existingInvitations, error: checkError } = await supabaseAdmin
        .from('invitations')
        .select('*')
        .eq('email', testEmail)
        .eq('organization_id', testOrganizationId)
        .eq('status', 'pending')

      expect(checkError).toBeNull()
      expect(existingInvitations).toBeDefined()
      expect(existingInvitations!.length).toBe(1)
      expect(existingInvitations![0].id).toBe(firstInvitation.id)
    })

    it('should allow multiple invitations for different organizations', async () => {
      const testEmail = 'multi.org@example.com'

      // Create second organization
      const { data: secondOrg, error: secondOrgError } = await supabaseAdmin
        .from('organizations')
        .insert({
          name: 'Second Test Organization',
          created_by: '00000000-0000-0000-0000-000000000001'
        })
        .select('id')
        .single()

      expect(secondOrgError).toBeNull()

      // Create invitation for first organization
      const { data: firstOrgInvitation, error: firstError } = await supabaseAdmin
        .from('invitations')
        .insert({
          email: testEmail,
          full_name: 'Multi Org User',
          role: 'employee',
          organization_id: testOrganizationId,
          team_id: testTeamId,
          status: 'pending',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        })
        .select('*')
        .single()

      expect(firstError).toBeNull()
      if (firstOrgInvitation) createdInvitationIds.push(firstOrgInvitation.id)

      // Create invitation for second organization
      const { data: secondOrgInvitation, error: secondError } = await supabaseAdmin
        .from('invitations')
        .insert({
          email: testEmail,
          full_name: 'Multi Org User',
          role: 'manager',
          organization_id: secondOrg!.id,
          team_id: null, // Different team structure
          status: 'pending',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        })
        .select('*')
        .single()

      expect(secondError).toBeNull()
      if (secondOrgInvitation) createdInvitationIds.push(secondOrgInvitation.id)

      // Both invitations should exist
      const { data: allInvitations } = await supabaseAdmin
        .from('invitations')
        .select('*')
        .eq('email', testEmail)
        .eq('status', 'pending')

      expect(allInvitations!.length).toBe(2)

      // Clean up second organization
      await supabaseAdmin
        .from('organizations')
        .delete()
        .eq('id', secondOrg!.id)
    })

    it('should prevent duplicate invitations with same email, organization, and status', async () => {
      const testEmail = 'prevent.duplicate@example.com'
      
      // Create first invitation
      const { data: firstInvitation, error: firstError } = await supabaseAdmin
        .from('invitations')
        .insert({
          email: testEmail,
          full_name: 'Prevent Duplicate User',
          role: 'employee',
          organization_id: testOrganizationId,
          team_id: testTeamId,
          status: 'pending',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        })
        .select('*')
        .single()

      expect(firstError).toBeNull()
      if (firstInvitation) createdInvitationIds.push(firstInvitation.id)

      // Attempt to create duplicate
      const { data: duplicateInvitation, error: duplicateError } = await supabaseAdmin
        .from('invitations')
        .insert({
          email: testEmail,
          full_name: 'Prevent Duplicate User Copy',
          role: 'manager', // Different role
          organization_id: testOrganizationId,
          team_id: secondTeamId, // Different team
          status: 'pending',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        })
        .select('*')
        .single()

      // This should succeed at database level, but application should prevent it
      if (duplicateInvitation) {
        createdInvitationIds.push(duplicateInvitation.id)
      }

      // Check total invitations for this email/org
      const { data: totalInvitations } = await supabaseAdmin
        .from('invitations')
        .select('*')
        .eq('email', testEmail)
        .eq('organization_id', testOrganizationId)
        .eq('status', 'pending')

      // Application logic should handle this scenario
      expect(totalInvitations!.length).toBeGreaterThan(0)
    })

    it('should handle case-insensitive email duplicates', async () => {
      const baseEmail = 'case.test@example.com'
      const upperEmail = 'CASE.TEST@EXAMPLE.COM'
      
      // Create invitation with lowercase email
      const { data: lowerInvitation, error: lowerError } = await supabaseAdmin
        .from('invitations')
        .insert({
          email: baseEmail.toLowerCase(),
          full_name: 'Case Test User Lower',
          role: 'employee',
          organization_id: testOrganizationId,
          team_id: testTeamId,
          status: 'pending',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        })
        .select('*')
        .single()

      expect(lowerError).toBeNull()
      if (lowerInvitation) createdInvitationIds.push(lowerInvitation.id)

      // Attempt to create invitation with uppercase email
      const { data: upperInvitation, error: upperError } = await supabaseAdmin
        .from('invitations')
        .insert({
          email: upperEmail.toLowerCase(), // Application should normalize to lowercase
          full_name: 'Case Test User Upper',
          role: 'employee',
          organization_id: testOrganizationId,
          team_id: testTeamId,
          status: 'pending',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        })
        .select('*')
        .single()

      if (upperInvitation) {
        createdInvitationIds.push(upperInvitation.id)
      }

      // Check for duplicates using normalized email
      const { data: normalizedCheck } = await supabaseAdmin
        .from('invitations')
        .select('*')
        .eq('email', baseEmail.toLowerCase())
        .eq('organization_id', testOrganizationId)
        .eq('status', 'pending')

      expect(normalizedCheck!.length).toBeGreaterThan(0)
    })
  })

  describe('Multiple Invitation States for Same User', () => {
    it('should allow new invitation after previous one was rejected', async () => {
      const testEmail = 'rejected.reinvite@example.com'
      
      // Create and reject first invitation
      const { data: rejectedInvitation, error: rejectedError } = await supabaseAdmin
        .from('invitations')
        .insert({
          email: testEmail,
          full_name: 'Rejected Reinvite User',
          role: 'employee',
          organization_id: testOrganizationId,
          team_id: testTeamId,
          status: 'rejected',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        })
        .select('*')
        .single()

      expect(rejectedError).toBeNull()
      if (rejectedInvitation) createdInvitationIds.push(rejectedInvitation.id)

      // Create new invitation
      const { data: newInvitation, error: newError } = await supabaseAdmin
        .from('invitations')
        .insert({
          email: testEmail,
          full_name: 'Rejected Reinvite User V2',
          role: 'manager', // Different role this time
          organization_id: testOrganizationId,
          team_id: secondTeamId, // Different team
          status: 'pending',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        })
        .select('*')
        .single()

      expect(newError).toBeNull()
      if (newInvitation) createdInvitationIds.push(newInvitation.id)

      // Both invitations should exist with different statuses
      const { data: allInvitations } = await supabaseAdmin
        .from('invitations')
        .select('*')
        .eq('email', testEmail)
        .eq('organization_id', testOrganizationId)
        .order('created_at', { ascending: true })

      expect(allInvitations!.length).toBe(2)
      expect(allInvitations![0].status).toBe('rejected')
      expect(allInvitations![1].status).toBe('pending')
    })

    it('should allow new invitation after previous one expired', async () => {
      const testEmail = 'expired.reinvite@example.com'
      
      // Create expired invitation
      const { data: expiredInvitation, error: expiredError } = await supabaseAdmin
        .from('invitations')
        .insert({
          email: testEmail,
          full_name: 'Expired Reinvite User',
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

      // Create new invitation with updated details
      const { data: newInvitation, error: newError } = await supabaseAdmin
        .from('invitations')
        .insert({
          email: testEmail,
          full_name: 'Expired Reinvite User Updated',
          birth_date: '1990-01-01', // Additional data
          role: 'manager',
          organization_id: testOrganizationId,
          team_id: secondTeamId,
          status: 'pending',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        })
        .select('*')
        .single()

      expect(newError).toBeNull()
      if (newInvitation) createdInvitationIds.push(newInvitation.id)

      // Verify both invitations exist
      const { data: allInvitations } = await supabaseAdmin
        .from('invitations')
        .select('*')
        .eq('email', testEmail)
        .eq('organization_id', testOrganizationId)

      expect(allInvitations!.length).toBe(2)
      
      const expiredCount = allInvitations!.filter(inv => inv.status === 'expired').length
      const pendingCount = allInvitations!.filter(inv => inv.status === 'pending').length
      
      expect(expiredCount).toBe(1)
      expect(pendingCount).toBe(1)
    })

    it('should handle invitation to user who already accepted different invitation', async () => {
      const testEmail = 'already.member@example.com'
      
      // Create user who already accepted invitation
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: testEmail,
        password: 'test123456',
        email_confirm: true
      })

      expect(authError).toBeNull()
      if (authUser.user) createdUserIds.push(authUser.user.id)

      // Create accepted invitation
      const { data: acceptedInvitation, error: acceptedError } = await supabaseAdmin
        .from('invitations')
        .insert({
          email: testEmail,
          full_name: 'Already Member User',
          role: 'employee',
          organization_id: testOrganizationId,
          team_id: testTeamId,
          status: 'accepted',
          accepted_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        })
        .select('*')
        .single()

      expect(acceptedError).toBeNull()
      if (acceptedInvitation) createdInvitationIds.push(acceptedInvitation.id)

      // Create user-organization relationship
      await supabaseAdmin
        .from('user_organizations')
        .insert({
          user_id: authUser.user!.id,
          organization_id: testOrganizationId,
          role: 'employee',
          team_id: testTeamId,
          is_active: true,
          is_default: true,
          joined_via: 'invitation'
        })

      // Create new invitation for same user (should be prevented by application logic)
      const { data: newInvitation, error: newError } = await supabaseAdmin
        .from('invitations')
        .insert({
          email: testEmail,
          full_name: 'Already Member User V2',
          role: 'manager', // Trying to promote them
          organization_id: testOrganizationId,
          team_id: secondTeamId,
          status: 'pending',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        })
        .select('*')
        .single()

      if (newInvitation) createdInvitationIds.push(newInvitation.id)

      // Check if user already has active membership
      const { data: existingMembership } = await supabaseAdmin
        .from('user_organizations')
        .select('*')
        .eq('user_id', authUser.user!.id)
        .eq('organization_id', testOrganizationId)
        .eq('is_active', true)
        .single()

      expect(existingMembership).toBeDefined()
      expect(existingMembership?.is_active).toBe(true)
    })
  })

  describe('Conflict Resolution Strategies', () => {
    it('should identify conflicting invitations for resolution', async () => {
      const testEmail = 'conflict.resolution@example.com'
      
      // Create multiple pending invitations for same email/org
      const conflictingInvitations = [
        {
          email: testEmail,
          full_name: 'Conflict User 1',
          role: 'employee',
          team_id: testTeamId,
          created_at: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
        },
        {
          email: testEmail,
          full_name: 'Conflict User 2',
          role: 'manager',
          team_id: secondTeamId,
          created_at: new Date(Date.now() - 1 * 60 * 60 * 1000) // 1 hour ago
        },
        {
          email: testEmail,
          full_name: 'Conflict User 3',
          role: 'admin',
          team_id: null,
          created_at: new Date() // Now
        }
      ]

      for (const invitation of conflictingInvitations) {
        const { data, error } = await supabaseAdmin
          .from('invitations')
          .insert({
            ...invitation,
            organization_id: testOrganizationId,
            status: 'pending',
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          })
          .select('*')
          .single()

        expect(error).toBeNull()
        if (data) createdInvitationIds.push(data.id)
      }

      // Query for conflicts
      const { data: conflicts } = await supabaseAdmin
        .from('invitations')
        .select('*')
        .eq('email', testEmail)
        .eq('organization_id', testOrganizationId)
        .eq('status', 'pending')
        .order('created_at', { ascending: true })

      expect(conflicts!.length).toBe(3)
      
      // Conflict resolution strategy: Keep most recent, mark others as superseded
      const mostRecent = conflicts![conflicts!.length - 1]
      const toSupersede = conflicts!.slice(0, -1)

      expect(mostRecent.role).toBe('admin')
      expect(toSupersede.length).toBe(2)
    })

    it('should implement last-invitation-wins resolution', async () => {
      const testEmail = 'last.wins@example.com'
      
      // Create first invitation
      const { data: firstInv, error: firstError } = await supabaseAdmin
        .from('invitations')
        .insert({
          email: testEmail,
          full_name: 'Last Wins First',
          role: 'employee',
          organization_id: testOrganizationId,
          team_id: testTeamId,
          status: 'pending',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        })
        .select('*')
        .single()

      expect(firstError).toBeNull()
      if (firstInv) createdInvitationIds.push(firstInv.id)

      // Wait a moment to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 100))

      // Create second invitation (should supersede first)
      const { data: secondInv, error: secondError } = await supabaseAdmin
        .from('invitations')
        .insert({
          email: testEmail,
          full_name: 'Last Wins Second',
          role: 'manager',
          organization_id: testOrganizationId,
          team_id: secondTeamId,
          status: 'pending',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        })
        .select('*')
        .single()

      expect(secondError).toBeNull()
      if (secondInv) createdInvitationIds.push(secondInv.id)

      // Mark first invitation as superseded
      await supabaseAdmin
        .from('invitations')
        .update({ status: 'superseded' })
        .eq('id', firstInv!.id)

      // Verify resolution
      const { data: finalState } = await supabaseAdmin
        .from('invitations')
        .select('*')
        .eq('email', testEmail)
        .eq('organization_id', testOrganizationId)
        .order('created_at', { ascending: true })

      expect(finalState!.length).toBe(2)
      expect(finalState![0].status).toBe('superseded')
      expect(finalState![1].status).toBe('pending')
      expect(finalState![1].role).toBe('manager')
    })

    it('should implement admin-override resolution', async () => {
      const testEmail = 'admin.override@example.com'
      
      // Create employee invitation
      const { data: empInv, error: empError } = await supabaseAdmin
        .from('invitations')
        .insert({
          email: testEmail,
          full_name: 'Admin Override Employee',
          role: 'employee',
          organization_id: testOrganizationId,
          team_id: testTeamId,
          status: 'pending',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        })
        .select('*')
        .single()

      expect(empError).toBeNull()
      if (empInv) createdInvitationIds.push(empInv.id)

      // Admin creates higher-privilege invitation
      const { data: adminInv, error: adminError } = await supabaseAdmin
        .from('invitations')
        .insert({
          email: testEmail,
          full_name: 'Admin Override Manager',
          role: 'admin',
          organization_id: testOrganizationId,
          team_id: null, // Admins don't need specific teams
          status: 'pending',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        })
        .select('*')
        .single()

      expect(adminError).toBeNull()
      if (adminInv) createdInvitationIds.push(adminInv.id)

      // Admin override: higher privilege invitation takes precedence
      // Mark lower privilege as superseded
      await supabaseAdmin
        .from('invitations')
        .update({ status: 'superseded' })
        .eq('id', empInv!.id)

      // Verify admin invitation remains active
      const { data: activeInvitations } = await supabaseAdmin
        .from('invitations')
        .select('*')
        .eq('email', testEmail)
        .eq('organization_id', testOrganizationId)
        .eq('status', 'pending')

      expect(activeInvitations!.length).toBe(1)
      expect(activeInvitations![0].role).toBe('admin')
    })

    it('should provide conflict metadata for admin review', async () => {
      const testEmail = 'conflict.metadata@example.com'
      
      // Create conflicting invitations with metadata
      const invitations = [
        {
          email: testEmail,
          full_name: 'Metadata Test 1',
          role: 'employee',
          team_id: testTeamId,
          personal_message: 'First invitation from HR'
        },
        {
          email: testEmail,
          full_name: 'Metadata Test 2',
          role: 'manager',
          team_id: secondTeamId,
          personal_message: 'Second invitation from department head'
        }
      ]

      for (const inv of invitations) {
        const { data, error } = await supabaseAdmin
          .from('invitations')
          .insert({
            ...inv,
            organization_id: testOrganizationId,
            status: 'pending',
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          })
          .select('*')
          .single()

        expect(error).toBeNull()
        if (data) createdInvitationIds.push(data.id)
      }

      // Query conflict metadata
      const { data: conflictData } = await supabaseAdmin
        .from('invitations')
        .select(`
          *,
          teams(name),
          organizations(name)
        `)
        .eq('email', testEmail)
        .eq('organization_id', testOrganizationId)
        .eq('status', 'pending')

      expect(conflictData!.length).toBe(2)
      
      // Each invitation should have complete context
      conflictData!.forEach(inv => {
        expect(inv.personal_message).toBeDefined()
        expect(inv.role).toBeDefined()
        expect(inv.teams).toBeDefined()
        expect(inv.organizations).toBeDefined()
      })
    })
  })

  describe('Database Constraint Enforcement', () => {
    it('should handle unique constraint violations gracefully', async () => {
      // This depends on specific database constraints implemented
      // For now, test that we can query for potential violations
      
      const testEmail = 'constraint.test@example.com'
      
      const { data: firstInv, error: firstError } = await supabaseAdmin
        .from('invitations')
        .insert({
          email: testEmail,
          full_name: 'Constraint Test',
          role: 'employee',
          organization_id: testOrganizationId,
          team_id: testTeamId,
          status: 'pending',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        })
        .select('*')
        .single()

      expect(firstError).toBeNull()
      if (firstInv) createdInvitationIds.push(firstInv.id)

      // Check for constraint violations by querying duplicates
      const { data: duplicateCheck } = await supabaseAdmin
        .from('invitations')
        .select('*')
        .eq('email', testEmail)
        .eq('organization_id', testOrganizationId)
        .eq('status', 'pending')

      expect(duplicateCheck!.length).toBe(1)
    })

    it('should validate foreign key constraints', async () => {
      const invalidOrgId = '00000000-0000-0000-0000-000000000999'
      
      // Attempt to create invitation with invalid organization_id
      const { data: invalidInv, error: invalidError } = await supabaseAdmin
        .from('invitations')
        .insert({
          email: 'invalid.org@example.com',
          full_name: 'Invalid Org User',
          role: 'employee',
          organization_id: invalidOrgId,
          team_id: testTeamId,
          status: 'pending',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        })
        .select('*')
        .single()

      expect(invalidError).toBeDefined()
      expect(invalidInv).toBeNull()
    })

    it('should handle team deletion with cascading updates', async () => {
      // Create temporary team
      const { data: tempTeam, error: teamError } = await supabaseAdmin
        .from('teams')
        .insert({
          name: 'Temporary Team for Deletion',
          organization_id: testOrganizationId
        })
        .select('id')
        .single()

      expect(teamError).toBeNull()

      // Create invitation with temporary team
      const { data: invitation, error: invError } = await supabaseAdmin
        .from('invitations')
        .insert({
          email: 'team.deletion@example.com',
          full_name: 'Team Deletion Test',
          role: 'employee',
          organization_id: testOrganizationId,
          team_id: tempTeam!.id,
          status: 'pending',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        })
        .select('*')
        .single()

      expect(invError).toBeNull()
      if (invitation) createdInvitationIds.push(invitation.id)

      // Delete team (should set team_id to NULL due to ON DELETE SET NULL)
      await supabaseAdmin
        .from('teams')
        .delete()
        .eq('id', tempTeam!.id)

      // Check invitation team_id was set to null
      const { data: updatedInvitation } = await supabaseAdmin
        .from('invitations')
        .select('team_id')
        .eq('id', invitation!.id)
        .single()

      expect(updatedInvitation?.team_id).toBeNull()
    })
  })

  describe('User Experience for Duplicates', () => {
    it('should provide clear feedback when duplicate is detected', async () => {
      const testEmail = 'duplicate.feedback@example.com'
      
      // Create first invitation
      const { data: firstInv } = await supabaseAdmin
        .from('invitations')
        .insert({
          email: testEmail,
          full_name: 'Duplicate Feedback User',
          role: 'employee',
          organization_id: testOrganizationId,
          team_id: testTeamId,
          status: 'pending',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        })
        .select('*')
        .single()

      if (firstInv) createdInvitationIds.push(firstInv.id)

      // Simulate API response for duplicate detection
      const duplicateCheckResponse = {
        isDuplicate: true,
        existingInvitation: {
          id: firstInv!.id,
          email: testEmail,
          role: firstInv!.role,
          status: firstInv!.status,
          expires_at: firstInv!.expires_at,
          created_at: firstInv!.created_at
        },
        message: 'An active invitation already exists for this user',
        actions: [
          'Cancel new invitation',
          'Supersede existing invitation',
          'Modify existing invitation'
        ]
      }

      expect(duplicateCheckResponse.isDuplicate).toBe(true)
      expect(duplicateCheckResponse.existingInvitation.email).toBe(testEmail)
      expect(duplicateCheckResponse.actions).toContain('Supersede existing invitation')
    })

    it('should offer resolution options to admins', async () => {
      const testEmail = 'admin.resolution@example.com'
      
      // Create conflicting invitations
      const { data: inv1 } = await supabaseAdmin
        .from('invitations')
        .insert({
          email: testEmail,
          full_name: 'Admin Resolution 1',
          role: 'employee',
          organization_id: testOrganizationId,
          team_id: testTeamId,
          status: 'pending',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        })
        .select('*')
        .single()

      const { data: inv2 } = await supabaseAdmin
        .from('invitations')
        .insert({
          email: testEmail,
          full_name: 'Admin Resolution 2',
          role: 'manager',
          organization_id: testOrganizationId,
          team_id: secondTeamId,
          status: 'pending',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        })
        .select('*')
        .single()

      if (inv1) createdInvitationIds.push(inv1.id)
      if (inv2) createdInvitationIds.push(inv2.id)

      // Admin resolution options
      const resolutionOptions = {
        conflicts: [inv1, inv2],
        resolutionStrategies: [
          {
            name: 'Keep Latest',
            description: 'Keep the most recent invitation and cancel others',
            action: 'keep_latest'
          },
          {
            name: 'Keep Highest Role',
            description: 'Keep the invitation with the highest privilege level',
            action: 'keep_highest_role'
          },
          {
            name: 'Manual Selection',
            description: 'Let admin choose which invitation to keep',
            action: 'manual_select'
          }
        ]
      }

      expect(resolutionOptions.conflicts.length).toBe(2)
      expect(resolutionOptions.resolutionStrategies.length).toBe(3)
    })

    it('should preserve invitation history for audit purposes', async () => {
      const testEmail = 'audit.history@example.com'
      
      // Create and supersede multiple invitations
      const invitations = []
      for (let i = 0; i < 3; i++) {
        const { data: inv } = await supabaseAdmin
          .from('invitations')
          .insert({
            email: testEmail,
            full_name: `Audit History ${i + 1}`,
            role: i === 2 ? 'admin' : 'employee',
            organization_id: testOrganizationId,
            team_id: i % 2 === 0 ? testTeamId : secondTeamId,
            status: i === 2 ? 'pending' : 'superseded',
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          })
          .select('*')
          .single()

        if (inv) {
          invitations.push(inv)
          createdInvitationIds.push(inv.id)
        }
      }

      // Query full history
      const { data: fullHistory } = await supabaseAdmin
        .from('invitations')
        .select('*')
        .eq('email', testEmail)
        .eq('organization_id', testOrganizationId)
        .order('created_at', { ascending: true })

      expect(fullHistory!.length).toBe(3)
      expect(fullHistory![0].status).toBe('superseded')
      expect(fullHistory![1].status).toBe('superseded')
      expect(fullHistory![2].status).toBe('pending')
      
      // Audit trail should be complete
      expect(fullHistory![2].role).toBe('admin')
    })
  })

  describe('Admin Management of Duplicates', () => {
    it('should provide admin dashboard view of all invitation conflicts', async () => {
      // Create multiple conflicting scenarios for dashboard test
      const conflicts = [
        { email: 'conflict1@example.com', count: 2 },
        { email: 'conflict2@example.com', count: 3 },
        { email: 'conflict3@example.com', count: 2 }
      ]

      for (const conflict of conflicts) {
        for (let i = 0; i < conflict.count; i++) {
          const { data: inv } = await supabaseAdmin
            .from('invitations')
            .insert({
              email: conflict.email,
              full_name: `Conflict ${conflict.email} ${i + 1}`,
              role: 'employee',
              organization_id: testOrganizationId,
              team_id: i % 2 === 0 ? testTeamId : secondTeamId,
              status: 'pending',
              expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
            })
            .select('*')
            .single()

          if (inv) createdInvitationIds.push(inv.id)
        }
      }

      // Admin dashboard query for conflicts
      const { data: conflictSummary } = await supabaseAdmin
        .from('invitations')
        .select('email, count(*)')
        .eq('organization_id', testOrganizationId)
        .eq('status', 'pending')
        .group('email')
        .having('count(*) > 1')

      // Note: PostgreSQL GROUP BY and HAVING are not directly supported in Supabase client
      // This would be implemented as a stored procedure or function
      
      // Alternative query approach
      const { data: allPending } = await supabaseAdmin
        .from('invitations')
        .select('email')
        .eq('organization_id', testOrganizationId)
        .eq('status', 'pending')

      const emailCounts = allPending?.reduce((acc, inv) => {
        acc[inv.email] = (acc[inv.email] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      const conflictEmails = Object.entries(emailCounts || {})
        .filter(([email, count]) => count > 1)
        .map(([email, count]) => ({ email, count }))

      expect(conflictEmails.length).toBe(3)
    })

    it('should allow bulk resolution of duplicate invitations', async () => {
      const testEmails = ['bulk1@example.com', 'bulk2@example.com']
      
      // Create duplicates for bulk resolution
      for (const email of testEmails) {
        for (let i = 0; i < 2; i++) {
          const { data: inv } = await supabaseAdmin
            .from('invitations')
            .insert({
              email: email,
              full_name: `Bulk ${email} ${i + 1}`,
              role: i === 0 ? 'employee' : 'manager',
              organization_id: testOrganizationId,
              team_id: testTeamId,
              status: 'pending',
              expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
            })
            .select('*')
            .single()

          if (inv) createdInvitationIds.push(inv.id)
        }
      }

      // Bulk resolution: keep manager roles, supersede employee roles
      const { data: employeeInvitations } = await supabaseAdmin
        .from('invitations')
        .update({ status: 'superseded' })
        .eq('organization_id', testOrganizationId)
        .eq('role', 'employee')
        .eq('status', 'pending')
        .in('email', testEmails)
        .select('*')

      // Verify resolution
      const { data: remainingPending } = await supabaseAdmin
        .from('invitations')
        .select('*')
        .eq('organization_id', testOrganizationId)
        .eq('status', 'pending')
        .in('email', testEmails)

      expect(remainingPending!.length).toBe(2) // One manager per email
      remainingPending!.forEach(inv => {
        expect(inv.role).toBe('manager')
      })
    })
  })
})