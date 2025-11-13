import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const workspaceName = process.argv[2] || 'testlemoniady3';

console.log(`\n🔍 Checking workspace: ${workspaceName}\n`);

// Get organization
const { data: org, error: orgError } = await supabase
  .from('organizations')
  .select('*')
  .eq('name', workspaceName)
  .single();

if (orgError) {
  console.error('❌ Organization not found:', orgError.message);
  process.exit(1);
}

console.log('📊 Organization:');
console.log(`  ID: ${org.id}`);
console.log(`  Name: ${org.name}`);
console.log(`  Paid Seats: ${org.paid_seats}`);

// Get subscription
const { data: sub, error: subError } = await supabase
  .from('subscriptions')
  .select('*')
  .eq('organization_id', org.id)
  .single();

if (subError) {
  console.error('❌ Subscription not found:', subError.message);
} else {
  console.log('\n💳 Subscription:');
  console.log(`  ID: ${sub.id}`);
  console.log(`  LemonSqueezy Sub ID: ${sub.lemonsqueezy_subscription_id}`);
  console.log(`  LemonSqueezy Item ID: ${sub.lemonsqueezy_subscription_item_id}`);
  console.log(`  Billing Type: ${sub.billing_type}`);
  console.log(`  Current Seats: ${sub.current_seats}`);
  console.log(`  Quantity: ${sub.quantity}`);
  console.log(`  Status: ${sub.status}`);
  console.log(`  Variant ID: ${sub.lemonsqueezy_variant_id}`);
}

console.log('\n');
