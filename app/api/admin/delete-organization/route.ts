/**
 * Admin Endpoint: Delete Organization and All Related Data
 *
 * SECURITY: This is a one-time admin endpoint
 * Should be removed after use
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const { organizationId } = await request.json();

    if (!organizationId) {
      return NextResponse.json(
        { error: 'organizationId is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    console.log(`🗑️ Starting deletion for organization: ${organizationId}`);

    // Delete in correct order to handle foreign key constraints
    const deletionSteps = [];

    // 1. Delete leave_balances (references leave_types)
    const { error: balancesError, count: balancesCount } = await supabase
      .from('leave_balances')
      .delete()
      .eq('organization_id', organizationId);

    if (balancesError) {
      console.error('Error deleting leave_balances:', balancesError);
      deletionSteps.push({ table: 'leave_balances', error: balancesError.message });
    } else {
      deletionSteps.push({ table: 'leave_balances', deleted: balancesCount || 0 });
    }

    // 2. Delete leave_requests (references leave_types)
    const { error: requestsError, count: requestsCount } = await supabase
      .from('leave_requests')
      .delete()
      .eq('organization_id', organizationId);

    if (requestsError) {
      console.error('Error deleting leave_requests:', requestsError);
      deletionSteps.push({ table: 'leave_requests', error: requestsError.message });
    } else {
      deletionSteps.push({ table: 'leave_requests', deleted: requestsCount || 0 });
    }

    // 3. Delete leave_types (now safe since balances and requests are gone)
    const { error: typesError, count: typesCount } = await supabase
      .from('leave_types')
      .delete()
      .eq('organization_id', organizationId);

    if (typesError) {
      console.error('Error deleting leave_types:', typesError);
      deletionSteps.push({ table: 'leave_types', error: typesError.message });
    } else {
      deletionSteps.push({ table: 'leave_types', deleted: typesCount || 0 });
    }

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
      'work_schedule_templates'
    ];

    for (const table of tables) {
      const { error, count } = await supabase
        .from(table)
        .delete()
        .eq('organization_id', organizationId);

      if (error) {
        console.error(`Error deleting ${table}:`, error);
        deletionSteps.push({ table, error: error.message });
      } else {
        deletionSteps.push({ table, deleted: count || 0 });
      }
    }

    // 5. Delete profiles (uses organization_id)
    const { error: profilesError, count: profilesCount } = await supabase
      .from('profiles')
      .delete()
      .eq('organization_id', organizationId);

    if (profilesError) {
      console.error('Error deleting profiles:', profilesError);
      deletionSteps.push({ table: 'profiles', error: profilesError.message });
    } else {
      deletionSteps.push({ table: 'profiles', deleted: profilesCount || 0 });
    }

    // 6. Delete user_organizations
    const { error: userOrgsError, count: userOrgsCount } = await supabase
      .from('user_organizations')
      .delete()
      .eq('organization_id', organizationId);

    if (userOrgsError) {
      console.error('Error deleting user_organizations:', userOrgsError);
      deletionSteps.push({ table: 'user_organizations', error: userOrgsError.message });
    } else {
      deletionSteps.push({ table: 'user_organizations', deleted: userOrgsCount || 0 });
    }

    // 7. Delete subscriptions
    const { error: subsError, count: subsCount } = await supabase
      .from('subscriptions')
      .delete()
      .eq('organization_id', organizationId);

    if (subsError) {
      console.error('Error deleting subscriptions:', subsError);
      deletionSteps.push({ table: 'subscriptions', error: subsError.message });
    } else {
      deletionSteps.push({ table: 'subscriptions', deleted: subsCount || 0 });
    }

    // 8. Finally, delete the organization itself
    const { error: orgError, count: orgCount } = await supabase
      .from('organizations')
      .delete()
      .eq('id', organizationId);

    if (orgError) {
      console.error('Error deleting organization:', orgError);
      deletionSteps.push({ table: 'organizations', error: orgError.message });

      return NextResponse.json(
        {
          success: false,
          error: 'Failed to delete organization',
          deletionSteps
        },
        { status: 500 }
      );
    } else {
      deletionSteps.push({ table: 'organizations', deleted: orgCount || 0 });
    }

    console.log(`✅ Successfully deleted organization: ${organizationId}`);

    return NextResponse.json({
      success: true,
      message: `Organization ${organizationId} deleted successfully`,
      deletionSteps
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Only allow POST
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to delete organization.' },
    { status: 405 }
  );
}
