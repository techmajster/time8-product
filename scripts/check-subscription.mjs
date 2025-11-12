import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSubscription() {
  const lemonSqueezyId = process.argv[2] || '1634566';

  console.log(`\n🔍 Checking subscription: ${lemonSqueezyId}\n`);

  // Get subscription
  const { data: subscription, error: subError } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('lemonsqueezy_subscription_id', lemonSqueezyId)
    .single();

  if (subError) {
    console.error('❌ Subscription error:', subError);
    return;
  }

  console.log('📦 Subscription Data:');
  console.log({
    id: subscription.id,
    organization_id: subscription.organization_id,
    status: subscription.status,
    quantity: subscription.quantity,
    current_seats: subscription.current_seats,
    pending_seats: subscription.pending_seats,
    lemonsqueezy_subscription_id: subscription.lemonsqueezy_subscription_id,
    created_at: subscription.created_at,
    updated_at: subscription.updated_at
  });

  // Get organization
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('id, name, paid_seats, subscription_tier')
    .eq('id', subscription.organization_id)
    .single();

  if (orgError) {
    console.error('❌ Organization error:', orgError);
    return;
  }

  console.log('\n🏢 Organization Data:');
  console.log({
    id: org.id,
    name: org.name,
    paid_seats: org.paid_seats,
    subscription_tier: org.subscription_tier
  });

  // Get user count
  const { count: userCount, error: countError } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', subscription.organization_id);

  if (!countError) {
    console.log('\n👥 User Count:', userCount);
  }

  console.log('\n✅ Analysis:');
  console.log(`- Quantity (what they're paying for): ${subscription.quantity}`);
  console.log(`- Current Seats (what they can use): ${subscription.current_seats}`);
  console.log(`- Pending Seats (deferred changes): ${subscription.pending_seats || 'none'}`);
  console.log(`- Organization Paid Seats: ${org.paid_seats}`);
  console.log(`- Seats Match: ${subscription.current_seats === subscription.quantity ? '✅ YES' : '❌ NO'}`);
  console.log(`- Org Synced: ${org.paid_seats === subscription.quantity ? '✅ YES' : '❌ NO'}`);
}

checkSubscription().catch(console.error);
