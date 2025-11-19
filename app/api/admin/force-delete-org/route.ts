/**
 * Admin Endpoint: Force Delete Organization
 *
 * Deletes organization by deleting dependent data in correct order first
 * then using service role to bypass RLS for final deletion
 */

import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const { organizationId } = await request.json();

    if (!organizationId) {
      return NextResponse.json(
        { error: 'organizationId is required' },
        { status: 400 }
      );
    }

    // Create admin client with service role key (bypasses RLS)
    const supabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    console.log(`🗑️ Deleting organization: ${organizationId}`);

    const deletions: Array<{ table: string; deleted?: number; error?: string }> = [];

    // Delete in correct order to handle foreign key constraints
    // Most important: Delete everything that references leave_types FIRST

    // 1. Delete leave_balances (references leave_types)
    const { error: balError, count: balCount } = await supabase
      .from('leave_balances')
      .delete()
      .eq('organization_id', organizationId);
    deletions.push({ table: 'leave_balances', deleted: balCount || 0, error: balError?.message });

    // 2. Delete leave_requests (references leave_types)
    const { error: reqError, count: reqCount } = await supabase
      .from('leave_requests')
      .delete()
      .eq('organization_id', organizationId);
    deletions.push({ table: 'leave_requests', deleted: reqCount || 0, error: reqError?.message });

    // 3. NOW we can delete leave_types
    // But the trigger will still prevent deletion of mandatory ones
    // So we need to update is_mandatory to false first
    console.log('Unmarking mandatory leave types...');
    const { error: updateError } = await supabase
      .from('leave_types')
      .update({ is_mandatory: false })
      .eq('organization_id', organizationId)
      .eq('is_mandatory', true);

    if (updateError) {
      console.error('Error unmarking mandatory types:', updateError);
      deletions.push({ table: 'leave_types (update)', error: updateError.message });
    } else {
      console.log('✅ Unmarked mandatory leave types');
    }

    // Now delete leave_types
    const { error: typeError, count: typeCount } = await supabase
      .from('leave_types')
      .delete()
      .eq('organization_id', organizationId);
    deletions.push({ table: 'leave_types', deleted: typeCount || 0, error: typeError?.message });

    // 4. Delete other related data
    const tables = [
      'notifications',
      'company_holidays',
      'customers',
      'employee_schedules',
      'invitations',
      'organization_domains',
      'organization_settings',
      'teams',
      'work_schedule_templates',
      'profiles',
      'user_organizations',
      'subscriptions'
    ];

    for (const table of tables) {
      const { error, count } = await supabase
        .from(table)
        .delete()
        .eq('organization_id', organizationId);
      deletions.push({ table, deleted: count || 0, error: error?.message });
    }

    // 5. Finally delete the organization itself
    const { error: orgError, count: orgCount } = await supabase
      .from('organizations')
      .delete()
      .eq('id', organizationId);
    deletions.push({ table: 'organizations', deleted: orgCount || 0, error: orgError?.message });

    // Verify deletion
    const { data: checkOrg } = await supabase
      .from('organizations')
      .select('id')
      .eq('id', organizationId)
      .maybeSingle();

    if (checkOrg) {
      return NextResponse.json(
        {
          success: false,
          error: 'Organization still exists after deletion',
          deletions
        },
        { status: 500 }
      );
    }

    console.log(`✅ Successfully deleted organization: ${organizationId}`);

    return NextResponse.json({
      success: true,
      message: `Organization ${organizationId} deleted successfully`,
      deletions
    });

  } catch (error) {
    console.error('Force delete error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
