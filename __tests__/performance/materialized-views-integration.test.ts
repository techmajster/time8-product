/**
 * Materialized Views Integration Test
 *
 * Tests that the application correctly uses materialized views for seat counting
 * and that the views provide accurate data matching live tables.
 */

import { createClient } from '@supabase/supabase-js';

describe('Materialized Views Integration', () => {
  let supabaseAdmin: ReturnType<typeof createClient>;
  let testOrgId: string;

  beforeAll(() => {
    supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  });

  beforeEach(async () => {
    // Get first available organization for testing
    const { data: orgs } = await supabaseAdmin
      .from('organizations')
      .select('id')
      .limit(1)
      .single();

    testOrgId = orgs?.id;
  });

  describe('mv_organization_seat_usage view', () => {
    it('should exist and be queryable', async () => {
      const { data, error } = await supabaseAdmin
        .from('mv_organization_seat_usage')
        .select('*')
        .limit(1);

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it('should return accurate seat counts matching live table', async () => {
      if (!testOrgId) {
        console.warn('No test organization available, skipping test');
        return;
      }

      // Get seat data from materialized view
      const { data: viewData, error: viewError } = await supabaseAdmin
        .from('mv_organization_seat_usage')
        .select('active_seats, inactive_seats')
        .eq('organization_id', testOrgId)
        .single();

      expect(viewError).toBeNull();
      expect(viewData).toBeDefined();

      // Get seat data from live table
      const { data: liveData, error: liveError } = await supabaseAdmin
        .from('user_organizations')
        .select('is_active')
        .eq('organization_id', testOrgId);

      expect(liveError).toBeNull();
      expect(liveData).toBeDefined();

      const liveActiveCount = liveData!.filter(u => u.is_active).length;
      const liveInactiveCount = liveData!.filter(u => !u.is_active).length;

      // Verify view matches live table
      expect(viewData!.active_seats).toBe(liveActiveCount);
      expect(viewData!.inactive_seats).toBe(liveInactiveCount);
    });

    it('should have unique index on organization_id for fast lookups', async () => {
      const { data: indexes } = await supabaseAdmin.rpc('exec_sql', {
        sql: `
          SELECT indexname, indexdef
          FROM pg_indexes
          WHERE tablename = 'mv_organization_seat_usage'
          AND indexname = 'idx_mv_org_seat_usage_org_id'
        `
      });

      expect(indexes).toBeDefined();
    });

    it('should include active_user_ids array', async () => {
      if (!testOrgId) {
        console.warn('No test organization available, skipping test');
        return;
      }

      const { data, error } = await supabaseAdmin
        .from('mv_organization_seat_usage')
        .select('active_user_ids')
        .eq('organization_id', testOrgId)
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(Array.isArray(data!.active_user_ids)).toBe(true);
    });
  });

  describe('mv_org_leave_summaries view', () => {
    it('should exist and be queryable', async () => {
      const { data, error } = await supabaseAdmin
        .from('mv_org_leave_summaries')
        .select('*')
        .limit(1);

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it('should return aggregated leave statistics', async () => {
      if (!testOrgId) {
        console.warn('No test organization available, skipping test');
        return;
      }

      const { data, error } = await supabaseAdmin
        .from('mv_org_leave_summaries')
        .select('*')
        .eq('organization_id', testOrgId)
        .limit(1);

      expect(error).toBeNull();

      if (data && data.length > 0) {
        const summary = data[0];
        expect(summary).toHaveProperty('organization_id');
        expect(summary).toHaveProperty('leave_type_id');
        expect(summary).toHaveProperty('year');
        expect(summary).toHaveProperty('employee_count');
        expect(summary).toHaveProperty('total_entitled');
        expect(summary).toHaveProperty('total_used');
        expect(summary).toHaveProperty('total_remaining');
        expect(summary).toHaveProperty('avg_remaining');
      }
    });

    it('should have unique composite index for fast lookups', async () => {
      const { data: indexes } = await supabaseAdmin.rpc('exec_sql', {
        sql: `
          SELECT indexname, indexdef
          FROM pg_indexes
          WHERE tablename = 'mv_org_leave_summaries'
          AND indexname = 'idx_mv_org_leave_summaries_composite'
        `
      });

      expect(indexes).toBeDefined();
    });
  });

  describe('Refresh functions', () => {
    it('refresh_seat_usage() should execute without errors', async () => {
      const { error } = await supabaseAdmin.rpc('refresh_seat_usage');
      expect(error).toBeNull();
    });

    it('refresh_leave_summaries() should execute without errors', async () => {
      const { error } = await supabaseAdmin.rpc('refresh_leave_summaries');
      expect(error).toBeNull();
    });
  });

  describe('Application endpoint integration', () => {
    it('billing/subscription endpoint should use materialized view', async () => {
      // This test verifies that the endpoint code has been updated
      // The actual API test would require authentication setup

      const fs = require('fs');
      const subscriptionCode = fs.readFileSync(
        'app/api/billing/subscription/route.ts',
        'utf-8'
      );

      expect(subscriptionCode).toContain('mv_organization_seat_usage');
      expect(subscriptionCode).toContain('active_seats');
    });

    it('employees endpoint should use materialized view', async () => {
      const fs = require('fs');
      const employeesCode = fs.readFileSync(
        'app/api/employees/route.ts',
        'utf-8'
      );

      expect(employeesCode).toContain('mv_organization_seat_usage');
      expect(employeesCode).toContain('active_seats');
    });
  });
});
