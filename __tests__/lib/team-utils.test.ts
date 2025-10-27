/**
 * Team Utilities Test Suite
 *
 * Tests the team filtering and scoping utility functions
 * Focuses on SQL injection prevention by verifying the function signature change
 */

import { describe, test, expect } from '@jest/globals'
import type { TeamScope } from '@/lib/team-utils'
import { applyTeamFilter } from '@/lib/team-utils'

describe('Team Utilities', () => {

  describe('applyTeamFilter', () => {
    test('should be async function', () => {
      expect(applyTeamFilter.constructor.name).toBe('AsyncFunction')
    })

    test('should filter by organization for organization scope', async () => {
      const mockQuery = {
        eq: jest.fn().mockReturnThis(),
      }
      const scope: TeamScope = {
        type: 'organization',
        organizationId: 'org-123',
      }

      await applyTeamFilter(mockQuery, scope)

      expect(mockQuery.eq).toHaveBeenCalledWith(
        'organization_id',
        'org-123'
      )
    })

    test('should return unmodified query for unknown scope type', async () => {
      const mockQuery = {
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
      }
      const scope = {
        type: 'unknown',
        organizationId: 'org-123',
      } as any

      const result = await applyTeamFilter(mockQuery, scope)

      expect(mockQuery.eq).not.toHaveBeenCalled()
      expect(mockQuery.in).not.toHaveBeenCalled()
      expect(result).toBe(mockQuery)
    })

    test('should not contain SQL string interpolation in source code', () => {
      // Read the actual source code to verify no SQL injection vulnerability
      const fs = require('fs')
      const path = require('path')
      const sourceFile = path.join(__dirname, '../../lib/team-utils.ts')
      const source = fs.readFileSync(sourceFile, 'utf-8')

      // Verify the dangerous pattern is NOT present
      expect(source).not.toMatch(/SELECT.*WHERE team_id = '\$\{scope\.teamId\}'/)

      // Verify safe pattern IS present
      expect(source).toMatch(/getTeamMemberIds\(scope\)/)
      expect(source).toMatch(/query\.in\(userIdColumn, memberIds\)/)
    })
  })
})
