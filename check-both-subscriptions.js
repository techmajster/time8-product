/**
 * Check details for both subscriptions to identify which is for which organization
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkBothSubscriptions() {
  try {
    // Get both subscription details
    const subscriptions = ['1447723', '1447969']; // Yearly, Monthly
    
    for (const subId of subscriptions) {
      console.log(`\n🔍 Checking subscription ${subId}:`);
      
      const response = await fetch(`https://api.lemonsqueezy.com/v1/subscriptions/${subId}`, {
        headers: {
          'Authorization': `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`,
          'Accept': 'application/vnd.api+json'
        }
      });
      
      const data = await response.json();
      const attrs = data.data.attributes;
      
      console.log(`   Variant: ${attrs.variant_name}`);
      console.log(`   Quantity: ${attrs.first_subscription_item?.quantity}`);
      console.log(`   User: ${attrs.user_name}`);
      console.log(`   Email: ${attrs.user_email}`);
      console.log(`   Created: ${attrs.created_at}`);
      console.log(`   Renews: ${attrs.renews_at}`);
    }
    
    // Check our organizations
    console.log('\n📋 Our organizations:');
    const { data: orgs } = await supabase
      .from('organizations')
      .select('id, name, slug, paid_seats')
      .in('slug', ['kontury', 'bb8-studio']);
      
    orgs.forEach(org => {
      console.log(`   ${org.name} (${org.slug}): ${org.paid_seats} paid seats - ID: ${org.id}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkBothSubscriptions();