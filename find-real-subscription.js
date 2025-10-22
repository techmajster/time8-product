/**
 * Find the real Lemon Squeezy subscription for Kontury
 */

require('dotenv').config({ path: '.env.local' });

async function findRealSubscription() {
  try {
    console.log('🔍 Fetching all subscriptions from Lemon Squeezy...');
    
    const response = await fetch('https://api.lemonsqueezy.com/v1/subscriptions', {
      headers: {
        'Authorization': `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`,
        'Accept': 'application/vnd.api+json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`API failed: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`✅ Found ${data.data?.length || 0} subscriptions`);
    
    // Show all active subscriptions with details for 8 seats (your purchase)
    const activeSubscriptions = data.data?.filter(sub => sub.attributes.status === 'active') || [];
    
    console.log('\n🟢 Active subscriptions:');
    activeSubscriptions.forEach((sub, i) => {
      const attrs = sub.attributes;
      console.log(`${i + 1}. ID: ${sub.id}`);
      console.log(`   Status: ${attrs.status}`);
      console.log(`   Quantity: ${attrs.quantity}`);
      console.log(`   Product: ${attrs.product_name}`);
      console.log(`   Variant: ${attrs.variant_name}`);
      console.log(`   Price: ${attrs.unit_price / 100} PLN`);
      console.log(`   Customer ID: ${attrs.customer_id}`);
      console.log(`   User Email: ${attrs.user_email}`);
      console.log(`   Created: ${attrs.created_at}`);
      console.log(`   Renews: ${attrs.renews_at}`);
      console.log('');
    });
    
    // Look specifically for the 8-seat subscription
    const konturedSubscription = activeSubscriptions.find(sub => 
      sub.attributes.quantity === 8 && 
      sub.attributes.product_name?.includes('Leave')
    );
    
    if (konturedSubscription) {
      console.log('🎯 Found Kontury subscription (8 seats):');
      console.log(`   Real Subscription ID: ${konturedSubscription.id}`);
      console.log(`   Customer ID: ${konturedSubscription.attributes.customer_id}`);
      console.log('');
      console.log('✅ This is the ID we should store in our database!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

findRealSubscription();