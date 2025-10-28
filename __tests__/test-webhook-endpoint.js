/**
 * Direct test of the webhook endpoint
 */

async function testWebhookEndpoint() {
  const payload = {
    meta: {
      event_name: 'subscription_created', 
      event_id: 'test_' + Date.now()
    },
    data: {
      id: '12345',
      type: 'subscriptions',
      attributes: {
        status: 'active',
        quantity: 8,
        customer_id: 67890,
        variant_id: 123,
        renews_at: '2026-08-29T09:38:00Z',
        ends_at: null,
        trial_ends_at: null,
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

  try {
    const response = await fetch('http://localhost:3000/api/webhooks/lemonsqueezy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Signature': 'test-signature' // This would fail validation, but we can test the structure
      },
      body: JSON.stringify(payload)
    });

    const result = await response.text();
    console.log('Response status:', response.status);
    console.log('Response:', result);
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testWebhookEndpoint();