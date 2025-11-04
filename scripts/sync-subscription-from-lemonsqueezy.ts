import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const lemonsqueezyApiKey = process.env.LEMONSQUEEZY_API_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function syncSubscriptionFromLemonSqueezy(organizationId: string) {
  console.log(`\n🔄 Syncing subscription for organization: ${organizationId}`)

  // Get subscription record from database
  const { data: subscription, error: subError } = await supabase
    .from('subscriptions')
    .select('lemonsqueezy_subscription_id, organization_id')
    .eq('organization_id', organizationId)
    .single()

  if (subError || !subscription) {
    console.error('❌ No subscription found in database for this organization')
    process.exit(1)
  }

  const lsSubscriptionId = subscription.lemonsqueezy_subscription_id
  console.log(`📡 Fetching subscription ${lsSubscriptionId} from LemonSqueezy...`)

  // Fetch current subscription data from LemonSqueezy
  const response = await fetch(`https://api.lemonsqueezy.com/v1/subscriptions/${lsSubscriptionId}`, {
    headers: {
      'Authorization': `Bearer ${lemonsqueezyApiKey}`,
      'Accept': 'application/vnd.api+json'
    }
  })

  if (!response.ok) {
    console.error(`❌ LemonSqueezy API error: ${response.status}`)
    process.exit(1)
  }

  const data = await response.json()
  const attrs = data.data.attributes

  console.log('\n📊 Current LemonSqueezy Data:')
  console.log(`   Status: ${attrs.status}`)
  console.log(`   Variant: ${attrs.variant_name}`)
  console.log(`   Quantity: ${attrs.first_subscription_item?.quantity}`)
  console.log(`   Price ID: ${attrs.first_subscription_item?.price_id}`)
  console.log(`   Price: ${attrs.first_subscription_item?.price}`)
  console.log(`   Renews at: ${attrs.renews_at}`)
  console.log(`   Card: ${attrs.card_brand} ending in ${attrs.card_last_four}`)

  console.log('\n🔍 Full subscription item data:')
  console.log(JSON.stringify(attrs.first_subscription_item, null, 2))

  console.log('\n🔍 Full attributes data (to find price):')
  console.log(JSON.stringify({
    product_name: attrs.product_name,
    variant_name: attrs.variant_name,
    variant_id: attrs.variant_id,
    product_id: attrs.product_id,
    urls: attrs.urls
  }, null, 2))

  const quantity = attrs.first_subscription_item?.quantity || 0
  const FREE_TIER_LIMIT = 3
  // Business logic: Up to 3 users are free. 4+ users pay for ALL seats.
  const paidSeats = quantity > FREE_TIER_LIMIT ? quantity : 0

  // Update subscriptions table
  const { error: updateSubError } = await supabase
    .from('subscriptions')
    .update({
      status: attrs.status,
      quantity: quantity,
      lemonsqueezy_variant_id: attrs.variant_id,
      renews_at: attrs.renews_at || null,
      ends_at: attrs.ends_at || null,
      trial_ends_at: attrs.trial_ends_at || null,
      updated_at: new Date().toISOString()
    })
    .eq('lemonsqueezy_subscription_id', lsSubscriptionId)

  if (updateSubError) {
    console.error('❌ Failed to update subscriptions table:', updateSubError)
    process.exit(1)
  }

  console.log('✅ Updated subscriptions table')

  // Update organizations table
  const { error: updateOrgError } = await supabase
    .from('organizations')
    .update({
      paid_seats: paidSeats,
      subscription_tier: attrs.status === 'active' && quantity > 0 ? 'active' : 'free'
    })
    .eq('id', organizationId)

  if (updateOrgError) {
    console.error('❌ Failed to update organizations table:', updateOrgError)
    process.exit(1)
  }

  console.log('✅ Updated organizations table')
  console.log(`\n📦 Summary:`)
  console.log(`   Total seats: ${quantity}`)
  console.log(`   Paid seats: ${paidSeats}`)
  console.log(`   Free tier limit: ${FREE_TIER_LIMIT} users`)
  console.log(`   Billing model: ${quantity > FREE_TIER_LIMIT ? 'All seats paid (4+ users)' : 'Free tier (1-3 users)'}`)
  console.log(`\n💡 Refresh your browser to see the updated values`)
}

async function main() {
  // Usage: npx tsx scripts/sync-subscription-from-lemonsqueezy.ts [organization-id or slug]
  const arg = process.argv[2]

  if (!arg) {
    console.error('Usage: npx tsx scripts/sync-subscription-from-lemonsqueezy.ts <organization-id-or-slug>')
    console.error('Example: npx tsx scripts/sync-subscription-from-lemonsqueezy.ts bb8-studio')
    process.exit(1)
  }

  let orgId = arg

  // Check if it's a UUID or slug
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(arg)) {
    // It's a slug, look up the org ID
    console.log(`🔍 Looking up organization by slug: ${arg}`)
    const { data: org, error } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('slug', arg)
      .single()

    if (error || !org) {
      console.error(`❌ Organization not found with slug: ${arg}`)
      process.exit(1)
    }

    orgId = org.id
    console.log(`✅ Found organization: ${org.name} (${orgId})`)
  }

  await syncSubscriptionFromLemonSqueezy(orgId)
}

main().catch(console.error)
