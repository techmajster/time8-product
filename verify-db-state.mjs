import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('🔍 Checking database state for BB8 Studio organization')
console.log('')

// Get organization
const { data: org, error: orgError } = await supabase
  .from('organizations')
  .select('id, name, paid_seats')
  .eq('name', 'BB8 Studio')
  .single()

if (orgError || !org) {
  console.error('❌ Failed to find BB8 Studio organization:', orgError)
  process.exit(1)
}

console.log('✅ Organization Found:')
console.log('  ID:', org.id)
console.log('  Name:', org.name)
console.log('  paid_seats (legacy):', org.paid_seats)
console.log('')

// Get subscription
const { data: subscription, error: subError } = await supabase
  .from('subscriptions')
  .select('*')
  .eq('organization_id', org.id)
  .single()

if (subError || !subscription) {
  console.error('❌ Failed to get subscription:', subError)
  process.exit(1)
}

console.log('📊 Subscription in Database:')
console.log('  DB ID:', subscription.id)
console.log('  LemonSqueezy Subscription ID:', subscription.lemonsqueezy_subscription_id)
console.log('  LemonSqueezy Subscription Item ID:', subscription.lemonsqueezy_subscription_item_id)
console.log('  Status:', subscription.status)
console.log('  Billing Type:', subscription.billing_type)
console.log('  Current Seats:', subscription.current_seats, '← THIS IS WHAT THE APP SHOWS')
console.log('  Created:', subscription.created_at)
console.log('')

console.log('🎯 DIAGNOSIS:')
if (subscription.lemonsqueezy_subscription_id === '1447969') {
  console.log('  ❌ PROBLEM: Database points to CANCELLED subscription 1447969')
  console.log('  ❌ This subscription has is_usage_based: false')
  console.log('  ❌ Cannot create usage records for this subscription')
  console.log('')
  console.log('  ✅ SOLUTION: Update database to use subscription 1638258 (item 5289975)')
} else if (subscription.lemonsqueezy_subscription_id === '1638258') {
  console.log('  ✅ Database points to ACTIVE subscription 1638258')
  console.log('  ✅ This subscription has is_usage_based: true')
  if (subscription.lemonsqueezy_subscription_item_id === '5289975') {
    console.log('  ✅ Subscription item ID is correct (5289975)')
    console.log('')
    console.log('  → This means the subscription IDs are correct')
    console.log('  → The problem must be in the API call or error handling')
  } else {
    console.log('  ❌ PROBLEM: Subscription item ID is wrong')
    console.log('     Expected: 5289975')
    console.log('     Actual:', subscription.lemonsqueezy_subscription_item_id)
  }
} else {
  console.log('  ⚠️  UNKNOWN: Database points to subscription', subscription.lemonsqueezy_subscription_id)
  console.log('  Expected either 1447969 (old) or 1638258 (new)')
}
