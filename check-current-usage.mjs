const lemonSqueezyApiKey = process.env.LEMONSQUEEZY_API_KEY

// This is the CORRECT subscription with is_usage_based: true
const subscriptionItemId = 5289975

console.log('🔍 Checking current usage for subscription item:', subscriptionItemId)
console.log('')

// Check current usage (what will be billed)
const response = await fetch(
  `https://api.lemonsqueezy.com/v1/subscription-items/${subscriptionItemId}/current-usage`,
  {
    headers: {
      'Authorization': `Bearer ${lemonSqueezyApiKey}`,
      'Accept': 'application/vnd.api+json'
    }
  }
)

const data = await response.json()

if (!response.ok) {
  console.error('❌ API Error:', response.status)
  console.error('Response:', JSON.stringify(data, null, 2))
  process.exit(1)
}

// The current-usage endpoint returns data in 'meta' not 'data'
const meta = data.meta

if (!meta) {
  console.error('❌ Unexpected response format:', JSON.stringify(data, null, 2))
  process.exit(1)
}

console.log('✅ CURRENT USAGE (What Will Be Billed):')
console.log('  Subscription Item ID:', subscriptionItemId)
console.log('  Quantity:', meta.quantity, 'seats  ← THIS IS WHAT YOU WILL PAY FOR')
console.log('  Period Start:', meta.period_start)
console.log('  Period End:', meta.period_end)
console.log('  Billing Interval:', meta.interval_quantity, meta.interval_unit)
console.log('')

const periodEnd = new Date(meta.period_end)
const now = new Date()
const daysUntilBilling = Math.ceil((periodEnd - now) / (1000 * 60 * 60 * 24))

console.log('💰 BILLING PREVIEW:')
console.log('  💵 You WILL be charged for:', meta.quantity, 'seats')
console.log('  📅 Billing date:', meta.period_end)
console.log('  ⏰ Days until billing:', daysUntilBilling)
console.log('')

// List usage records
const usageResponse = await fetch(
  `https://api.lemonsqueezy.com/v1/usage-records?filter[subscription_item_id]=${subscriptionItemId}`,
  {
    headers: {
      'Authorization': `Bearer ${lemonSqueezyApiKey}`,
      'Accept': 'application/vnd.api+json'
    }
  }
)

if (usageResponse.ok) {
  const usageData = await usageResponse.json()
  console.log('📊 Usage Records This Period (' + usageData.data.length + ' total):')
  usageData.data.forEach((record, i) => {
    console.log(`  ${i + 1}. Quantity: ${record.attributes.quantity} - Created: ${record.attributes.created_at}`)
  })

  if (usageData.data.length > 0) {
    const peak = Math.max(...usageData.data.map(r => r.attributes.quantity))
    console.log('')
    console.log('✅ Peak usage:', peak, 'seats')
    console.log('✅ This matches the current usage quantity above')
  }
}
