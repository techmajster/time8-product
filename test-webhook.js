/**
 * Test script to simulate the webhook processing with real data
 * This helps debug the webhook handler without waiting for actual Lemon Squeezy events
 */

const simulatedWebhookPayload = {
  meta: {
    event_name: 'subscription_created',
    event_id: 'test_' + Date.now()
  },
  data: {
    id: '12345',
    attributes: {
      status: 'active',
      quantity: 8, // Your actual purchased seats
      customer_id: 67890,
      variant_id: 123,
      renews_at: '2026-08-29T09:38:00Z',
      ends_at: null,
      trial_ends_at: null,
      // This is where the custom data from checkout might be
      custom_data: {
        organization_data: JSON.stringify({
          name: 'Kontury',
          slug: 'kontury',
          country_code: 'PL'
        }),
        user_count: '8',
        paid_seats: '8',
        tier: 'annual'
      }
    }
  }
};

console.log('Simulated webhook payload:');
console.log(JSON.stringify(simulatedWebhookPayload, null, 2));

// Test the custom data extraction
const customData = simulatedWebhookPayload.data.attributes.custom_data;
if (customData && customData.organization_data) {
  const orgData = typeof customData.organization_data === 'string' 
    ? JSON.parse(customData.organization_data)
    : customData.organization_data;
  console.log('\nExtracted organization data:');
  console.log(orgData);
}