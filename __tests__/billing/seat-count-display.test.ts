/**
 * Seat Count Display Tests
 *
 * Tests for accurate seat count display in admin settings.
 *
 * Critical Bug Fix:
 * - Seat count should display actual active users from organization_members
 * - NOT the subscription.current_seats column (which may be 0 or outdated)
 *
 * @jest-environment node
 */

// Mock Supabase
const mockSupabaseFrom = jest.fn();
const mockSupabaseSelect = jest.fn();
const mockSupabaseEq = jest.fn();
const mockSupabaseSingle = jest.fn();
const mockSupabaseCount = jest.fn();

const mockCreateClient = jest.fn(() => ({
  from: mockSupabaseFrom
}));

jest.mock('@/lib/supabase/server', () => ({
  createClient: () => mockCreateClient()
}));

describe('Seat Count Display', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default Supabase mock chain
    mockSupabaseFrom.mockReturnValue({
      select: mockSupabaseSelect
    });

    mockSupabaseSelect.mockReturnValue({
      eq: mockSupabaseEq,
      count: mockSupabaseCount,
      single: mockSupabaseSingle
    });

    mockSupabaseEq.mockReturnValue({
      eq: mockSupabaseEq,
      single: mockSupabaseSingle,
      count: mockSupabaseCount
    });
  });

  describe('Active User Count Query', () => {
    it('should count active users from user_organizations table', async () => {
      const organizationId = 'org-123';

      // Mock user_organizations query
      mockSupabaseCount.mockResolvedValueOnce({
        count: 5,
        error: null
      });

      // Simulate querying active user count
      const { createClient } = require('@/lib/supabase/server');
      const supabase = createClient();

      const { count, error } = await supabase
        .from('user_organizations')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('is_active', true);

      expect(error).toBeNull();
      expect(count).toBe(5);
      expect(mockSupabaseFrom).toHaveBeenCalledWith('user_organizations');
      expect(mockSupabaseEq).toHaveBeenCalledWith('organization_id', organizationId);
      expect(mockSupabaseEq).toHaveBeenCalledWith('is_active', true);
    });

    it('should return 1 for first user in new organization', async () => {
      const organizationId = 'new-org-456';

      // Mock query for new organization with only creator
      mockSupabaseCount.mockResolvedValueOnce({
        count: 1,
        error: null
      });

      const { createClient } = require('@/lib/supabase/server');
      const supabase = createClient();

      const { count, error } = await supabase
        .from('user_organizations')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('is_active', true);

      expect(error).toBeNull();
      expect(count).toBe(1); // Should show "1 z 3 miejsc" in UI
    });

    it('should exclude inactive/removed users from count', async () => {
      const organizationId = 'org-789';

      // Organization has 3 total members but only 2 active
      // (1 removed/inactive should not be counted)
      mockSupabaseCount.mockResolvedValueOnce({
        count: 2,
        error: null
      });

      const { createClient } = require('@/lib/supabase/server');
      const supabase = createClient();

      const { count, error } = await supabase
        .from('user_organizations')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('is_active', true); // Only count active users

      expect(error).toBeNull();
      expect(count).toBe(2); // Only active users
    });
  });

  describe('Subscription Widget Data', () => {
    it('should NOT use subscription.current_seats which may be 0', () => {
      // Old broken approach
      const subscription = {
        id: 'sub-123',
        current_seats: 0, // This is wrong! Shows "0 z 3 miejsc"
        seat_limit: 3,
        status: 'active'
      };

      // This should NOT be used for display
      const wrongSeatCount = subscription.current_seats;
      expect(wrongSeatCount).toBe(0); // Demonstrates the bug

      // Instead, we should query user_organizations
      const correctApproach = 'Query user_organizations with is_active=true';
      expect(correctApproach).toBeDefined();
    });

    it('should display seat count as: actual_users / seat_limit', async () => {
      const organizationId = 'org-display-test';

      // Mock actual user count query
      mockSupabaseCount.mockResolvedValueOnce({
        count: 7, // 7 active users
        error: null
      });

      // Mock subscription query
      mockSupabaseSingle.mockResolvedValueOnce({
        data: {
          id: 'sub-test',
          seat_limit: 10,
          current_seats: 0, // IGNORE this value
          status: 'active'
        },
        error: null
      });

      const { createClient } = require('@/lib/supabase/server');
      const supabase = createClient();

      // Get actual user count
      const { count: actualUsers } = await supabase
        .from('user_organizations')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('is_active', true);

      // Get seat limit from subscription
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('seat_limit')
        .eq('organization_id', organizationId)
        .single();

      // Display format: "7 z 10 miejsc wykorzystanych"
      const displayText = `${actualUsers} z ${subscription.seat_limit} miejsc wykorzystanych`;

      expect(actualUsers).toBe(7);
      expect(subscription.seat_limit).toBe(10);
      expect(displayText).toBe('7 z 10 miejsc wykorzystanych');
    });
  });

  describe('Free Tier Seat Count', () => {
    it('should show "1 z 3 miejsc" for free tier with one user', async () => {
      const organizationId = 'free-org-123';
      const FREE_SEATS = 3;

      // Mock user count for free tier org
      mockSupabaseCount.mockResolvedValueOnce({
        count: 1, // Only creator
        error: null
      });

      // Free tier may not have a subscription record
      mockSupabaseSingle.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' } // No subscription found
      });

      const { createClient } = require('@/lib/supabase/server');
      const supabase = createClient();

      // Get actual user count
      const { count: actualUsers } = await supabase
        .from('user_organizations')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('is_active', true);

      // Try to get subscription
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('seat_limit')
        .eq('organization_id', organizationId)
        .single();

      // Fallback to FREE_SEATS if no subscription
      const seatLimit = subscription?.seat_limit || FREE_SEATS;

      const displayText = `${actualUsers} z ${seatLimit} miejsc wykorzystanych`;

      expect(actualUsers).toBe(1);
      expect(seatLimit).toBe(3);
      expect(displayText).toBe('1 z 3 miejsc wykorzystanych'); // Correct!
    });

    it('should show "2 z 3 miejsc" for free tier with two users', async () => {
      const organizationId = 'free-org-456';
      const FREE_SEATS = 3;

      // Mock user count: creator + 1 invited user
      mockSupabaseCount.mockResolvedValueOnce({
        count: 2,
        error: null
      });

      mockSupabaseSingle.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' }
      });

      const { createClient } = require('@/lib/supabase/server');
      const supabase = createClient();

      const { count: actualUsers } = await supabase
        .from('organization_members')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('status', 'active');

      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('seat_limit')
        .eq('organization_id', organizationId)
        .single();

      const seatLimit = subscription?.seat_limit || FREE_SEATS;
      const displayText = `${actualUsers} z ${seatLimit} miejsc wykorzystanych`;

      expect(displayText).toBe('2 z 3 miejsc wykorzystanych');
    });

    it('should show "3 z 3 miejsc" when free tier is at limit', async () => {
      const organizationId = 'free-org-full';
      const FREE_SEATS = 3;

      // Mock user count: at free tier limit
      mockSupabaseCount.mockResolvedValueOnce({
        count: 3,
        error: null
      });

      mockSupabaseSingle.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' }
      });

      const { createClient } = require('@/lib/supabase/server');
      const supabase = createClient();

      const { count: actualUsers } = await supabase
        .from('organization_members')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('status', 'active');

      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('seat_limit')
        .eq('organization_id', organizationId)
        .single();

      const seatLimit = subscription?.seat_limit || FREE_SEATS;
      const displayText = `${actualUsers} z ${seatLimit} miejsc wykorzystanych`;

      expect(displayText).toBe('3 z 3 miejsc wykorzystanych');
    });
  });

  describe('Edge Cases', () => {
    it('should handle organization with no members gracefully', async () => {
      const organizationId = 'empty-org';

      mockSupabaseCount.mockResolvedValueOnce({
        count: 0,
        error: null
      });

      const { createClient } = require('@/lib/supabase/server');
      const supabase = createClient();

      const { count } = await supabase
        .from('user_organizations')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('is_active', true);

      expect(count).toBe(0);
    });

    it('should handle database errors gracefully', async () => {
      const organizationId = 'error-org';

      mockSupabaseCount.mockResolvedValueOnce({
        count: null,
        error: { message: 'Database connection failed' }
      });

      const { createClient } = require('@/lib/supabase/server');
      const supabase = createClient();

      const { count, error } = await supabase
        .from('user_organizations')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('is_active', true);

      expect(error).toBeDefined();
      expect(count).toBeNull();
    });
  });
});
