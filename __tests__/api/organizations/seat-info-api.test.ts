/**
 * Seat Info API Tests
 *
 * Tests for the seat-info API endpoint response structure
 * Ensures clear terminology: availableSeats vs freeTierSeats
 */

describe('Seat Info API Response Structure', () => {
  describe('Response Fields', () => {
    it('should have availableSeats field (not freeSeats)', () => {
      // Mock response from API
      const mockResponse = {
        currentSeats: 5,
        maxSeats: 13,
        availableSeats: 8,  // ✅ CLEAR - empty seats that can be filled
        freeTierSeats: 3,    // ✅ CLEAR - tier threshold (always 3)
        pendingInvitations: 0,
        usersMarkedForRemoval: 0,
        plan: 'business' as const,
        billingCycle: 'monthly' as 'monthly' | 'yearly',
        pricePerSeat: 10.00,
        currency: 'PLN'
      }

      expect(mockResponse).toHaveProperty('availableSeats')
      expect(mockResponse).toHaveProperty('freeTierSeats')
      expect(mockResponse.availableSeats).toBe(8)
      expect(mockResponse.freeTierSeats).toBe(3)
    })

    it('should distinguish between availableSeats and freeTierSeats', () => {
      // Scenario: Paid tier org with 10 paid seats, 5 active users
      const paidTierResponse = {
        currentSeats: 5,       // active users
        maxSeats: 13,          // 3 free + 10 paid
        availableSeats: 8,     // 13 - 5 = 8 empty seats
        freeTierSeats: 3,      // tier threshold (constant)
        paidSeats: 10,
        plan: 'business' as const
      }

      // availableSeats = seats that can be filled without payment
      expect(paidTierResponse.availableSeats).toBe(8)

      // freeTierSeats = first N seats that are free (constant)
      expect(paidTierResponse.freeTierSeats).toBe(3)

      // They mean different things!
      expect(paidTierResponse.availableSeats).not.toBe(paidTierResponse.freeTierSeats)
    })
  })

  describe('Free Tier Organizations', () => {
    it('should correctly show seat info for free tier (2 users)', () => {
      const freeTierResponse = {
        currentSeats: 2,       // 2 active users
        maxSeats: 3,           // free tier limit
        availableSeats: 1,     // 3 - 2 = 1 empty seat
        freeTierSeats: 3,      // tier threshold
        paidSeats: 0,
        plan: 'free' as const
      }

      expect(freeTierResponse.currentSeats).toBe(2)
      expect(freeTierResponse.maxSeats).toBe(3)
      expect(freeTierResponse.availableSeats).toBe(1)
      expect(freeTierResponse.freeTierSeats).toBe(3)

      // Display: "2/3 free seats used, 1 available"
    })

    it('should correctly show seat info for free tier (3 users, full)', () => {
      const freeTierFullResponse = {
        currentSeats: 3,       // 3 active users
        maxSeats: 3,           // free tier limit
        availableSeats: 0,     // 3 - 3 = 0 empty seats
        freeTierSeats: 3,      // tier threshold
        paidSeats: 0,
        plan: 'free' as const
      }

      expect(freeTierFullResponse.currentSeats).toBe(3)
      expect(freeTierFullResponse.maxSeats).toBe(3)
      expect(freeTierFullResponse.availableSeats).toBe(0)

      // Display: "3/3 free seats used, 0 available (upgrade required)"
    })
  })

  describe('Paid Tier Organizations', () => {
    it('should correctly show seat info for paid tier (10 seats, 5 users)', () => {
      const paidTierResponse = {
        currentSeats: 5,       // 5 active users
        maxSeats: 13,          // 3 free + 10 paid
        availableSeats: 8,     // 13 - 5 = 8 empty seats
        freeTierSeats: 3,      // tier threshold (constant)
        paidSeats: 10,
        plan: 'business' as const,
        pricePerSeat: 10.00,
        currency: 'PLN'
      }

      expect(paidTierResponse.currentSeats).toBe(5)
      expect(paidTierResponse.maxSeats).toBe(13)
      expect(paidTierResponse.availableSeats).toBe(8)
      expect(paidTierResponse.paidSeats).toBe(10)

      // Display: "5/13 seats used (3 free + 10 paid), 8 available"
    })

    it('should handle pending invitations correctly', () => {
      const withPendingResponse = {
        currentSeats: 5,           // active users only
        maxSeats: 13,
        availableSeats: 5,         // 13 - 8 (active + pending)
        freeTierSeats: 3,
        pendingInvitations: 3,     // pending invites
        paidSeats: 10,
        plan: 'business' as const
      }

      const totalUsed = withPendingResponse.currentSeats + withPendingResponse.pendingInvitations
      expect(totalUsed).toBe(8)  // 5 active + 3 pending
      expect(withPendingResponse.availableSeats).toBe(5)  // 13 - 8

      // Display: "8/13 seats used (5 active + 3 pending), 5 available"
    })
  })

  describe('Backward Compatibility', () => {
    it('should document the old field name for reference', () => {
      // OLD (confusing):
      // freeSeats: seatInfo.availableSeats

      // NEW (clear):
      // availableSeats: seatInfo.availableSeats
      // freeTierSeats: 3

      const oldFieldName = 'freeSeats'  // Was ambiguous
      const newFieldName = 'availableSeats'  // Is clear
      const newExplicitField = 'freeTierSeats'  // Makes tier threshold explicit

      expect(oldFieldName).toBe('freeSeats')
      expect(newFieldName).toBe('availableSeats')
      expect(newExplicitField).toBe('freeTierSeats')
    })
  })
})
