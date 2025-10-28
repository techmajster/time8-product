/**
 * Get detailed info for the yearly subscription (1447723)
 */

require('dotenv').config({ path: '.env.local' });

async function getSubscriptionDetails() {
  try {
    const subscriptionId = '1447723'; // The yearly subscription
    console.log(`🔍 Fetching subscription details for ID: ${subscriptionId}`);
    
    const response = await fetch(`https://api.lemonsqueezy.com/v1/subscriptions/${subscriptionId}`, {
      headers: {
        'Authorization': `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`,
        'Accept': 'application/vnd.api+json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`API failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    console.log('✅ Subscription details:');
    console.log(JSON.stringify(data.data.attributes, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

getSubscriptionDetails();