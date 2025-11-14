import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

const orgId = 'a5b891a0-f314-498d-aa9d-fa9dcc13d0ce'

console.log('🔧 Fixing subscription IDs in database')
console.log('')

// Update to correct subscription
const { data, error } = await supabase
  .from('subscriptions')
  .update({
    lemonsqueezy_subscription_id: '1638258',
    lemonsqueezy_subscription_item_id: '5289975'
  })
  .eq('organization_id', orgId)
  .select()

if (error) {
  console.error('❌ Failed to update subscription:', error)
  process.exit(1)
}

console.log('✅ Updated subscription to:')
console.log('  LemonSqueezy Subscription ID: 1638258')
console.log('  LemonSqueezy Subscription Item ID: 5289975')
console.log('')
console.log('🎉 Database now points to the ACTIVE subscription with is_usage_based: true')
console.log('')
console.log('Next step: Test creating a usage record via your app')
