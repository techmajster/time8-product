import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkOrganization() {
  const orgId = 'c1f5495b-17e0-4ef9-9c2b-ff67ea996bf3'; // Kontury

  console.log(`\n🔍 Checking organization: ${orgId}\n`);

  // Get organization
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', orgId)
    .single();

  if (orgError) {
    console.error('❌ Organization not found:', orgError);
    return;
  }

  console.log('🏢 Organization:');
  console.log({
    id: org.id,
    name: org.name,
    slug: org.slug,
    paid_seats: org.paid_seats,
    subscription_tier: org.subscription_tier,
    country_code: org.country_code
  });

  // Get all subscriptions
  const { data: subscriptions, error: subError } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false });

  if (subError) {
    console.error('❌ Subscription query error:', subError);
    return;
  }

  console.log(`\n📦 Found ${subscriptions?.length || 0} subscriptions:\n`);

  if (subscriptions && subscriptions.length > 0) {
    subscriptions.forEach((sub, i) => {
      console.log(`Subscription #${i + 1}:`);
      console.log({
        id: sub.id,
        lemonsqueezy_subscription_id: sub.lemonsqueezy_subscription_id,
        status: sub.status,
        quantity: sub.quantity,
        current_seats: sub.current_seats,
        pending_seats: sub.pending_seats,
        created_at: sub.created_at,
        updated_at: sub.updated_at
      });
      console.log('');
    });
  } else {
    console.log('❌ No subscriptions found for this organization');
  }

  // Check billing events log
  console.log('\n📋 Recent billing events:');
  const { data: events, error: eventsError } = await supabase
    .from('billing_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  if (!eventsError && events && events.length > 0) {
    events.forEach(event => {
      console.log({
        event_type: event.event_type,
        event_id: event.event_id,
        status: event.status,
        error_details: event.error_details,
        created_at: event.created_at
      });
    });
  } else {
    console.log('No billing events found or error:', eventsError);
  }
}

checkOrganization().catch(console.error);
