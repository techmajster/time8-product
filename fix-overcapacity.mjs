import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixOvercapacity() {
  // Get test_lemoniady organization
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('name', 'test_lemoniady')
    .single();

  if (orgError || !org) {
    console.error('Organization not found:', orgError);
    return;
  }

  console.log('🏢 Organization:', org.name);
  console.log('');

  // Get pending invitation
  const { data: invitation } = await supabase
    .from('invitations')
    .select('id, email, full_name, status')
    .eq('organization_id', org.id)
    .eq('status', 'pending')
    .single();

  if (!invitation) {
    console.log('✓ No pending invitations found');
    return;
  }

  console.log('📨 Found pending invitation:');
  console.log('  Email:', invitation.email);
  console.log('  Name:', invitation.full_name);
  console.log('');

  // Delete the pending invitation
  const { error: deleteError } = await supabase
    .from('invitations')
    .delete()
    .eq('id', invitation.id);

  if (deleteError) {
    console.error('❌ Failed to delete invitation:', deleteError);
    return;
  }

  console.log('✅ Deleted pending invitation');
  console.log('');

  // Show final state
  const { count: activeCount } = await supabase
    .from('user_organizations')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', org.id)
    .eq('is_active', true);

  const { count: pendingCount } = await supabase
    .from('invitations')
    .select('id', { count: 'exact' })
    .eq('organization_id', org.id)
    .eq('status', 'pending');

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('current_seats')
    .eq('organization_id', org.id)
    .in('status', ['active', 'on_trial'])
    .single();

  const totalSeats = subscription?.current_seats > 0 ? subscription.current_seats : 3;
  const totalOccupied = (activeCount || 0) + (pendingCount || 0);

  console.log('📊 Final State:');
  console.log('  Total Seats:', totalSeats);
  console.log('  Active Users:', activeCount);
  console.log('  Pending Invitations:', pendingCount);
  console.log('  Total Occupied:', totalOccupied);
  console.log('  Available:', totalSeats - totalOccupied);
  console.log('');

  if (totalOccupied <= totalSeats) {
    console.log('✅ Back to valid capacity!');
  } else {
    console.log('⚠️  Still over capacity');
  }
}

fixOvercapacity().catch(console.error);
