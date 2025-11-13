import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function listAllSubscriptions() {
  console.log('\n🔍 Fetching all subscriptions...\n');

  const { data: subscriptions, error } = await supabase
    .from('subscriptions')
    .select('id, organization_id, lemonsqueezy_subscription_id, lemonsqueezy_subscription_item_id, status, quantity, current_seats')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  if (!subscriptions || subscriptions.length === 0) {
    console.log('❌ No subscriptions found');
    return;
  }

  console.log(`📦 Found ${subscriptions.length} subscriptions:\n`);

  subscriptions.forEach((sub, i) => {
    console.log(`${i + 1}. Subscription:`);
    console.log(`   DB ID: ${sub.id}`);
    console.log(`   LS Sub ID: ${sub.lemonsqueezy_subscription_id}`);
    console.log(`   LS Item ID: ${sub.lemonsqueezy_subscription_item_id || 'null'}`);
    console.log(`   Status: ${sub.status}`);
    console.log(`   Quantity: ${sub.quantity}`);
    console.log(`   Current Seats: ${sub.current_seats}`);
    console.log(`   Org ID: ${sub.organization_id}`);
    console.log('');
  });
}

listAllSubscriptions().catch(console.error);
