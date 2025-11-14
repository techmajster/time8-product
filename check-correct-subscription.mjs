const lemonSqueezyApiKey = process.env.LEMONSQUEEZY_API_KEY

// This is the CURRENT active subscription from webhook
const subscriptionId = 1638258
const subscriptionItemId = 5289975

console.log('🔍 Checking subscription:', subscriptionId)
console.log('📦 Subscription item:', subscriptionItemId)
console.log('')

// Check usage records for THIS subscription item
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
  console.log('📊 Usage Records Found:', usageData.data.length)
  console.log('')

  if (usageData.data.length === 0) {
    console.log('❌ NO USAGE RECORDS FOUND!')
    console.log('')
    console.log('This means:')
    console.log('  - Your app IS updating the database')
    console.log('  - But it is NOT creating usage records in LemonSqueezy')
    console.log('  - The POST to LemonSqueezy is either:')
    console.log('    1. Not being sent')
    console.log('    2. Failing silently')
    console.log('    3. Being sent to wrong subscription_item_id')
  } else {
    console.log('✅ Usage records exist!')
    usageData.data.forEach((record, i) => {
      console.log(`${i + 1}. ID: ${record.id}`)
      console.log(`   Quantity: ${record.attributes.quantity}`)
      console.log(`   Created: ${record.attributes.created_at}`)
      console.log('')
    })

    const peak = Math.max(...usageData.data.map(r => r.attributes.quantity))
    console.log('Peak usage this period:', peak, 'seats')
  }
} else {
  const errorText = await usageResponse.text()
  console.error('❌ Failed to fetch usage records:', usageResponse.status)
  console.error(errorText)
}
