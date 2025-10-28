/**
 * Create customer and subscription records for BB8 Studio
 * This enables webhook processing for future seat changes
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createBB8Records() {
  try {
    console.log('🔍 Looking up BB8 Studio organization...')
    
    // Get BB8 Studio organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, slug, subscription_tier, paid_seats')
      .eq('slug', 'bb8-studio')
      .single()

    if (orgError || !org) {
      console.error('❌ BB8 Studio organization not found:', orgError)
      return
    }

    console.log('✅ Found BB8 Studio organization:', org)

    // Check if customer record already exists
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('*')
      .eq('organization_id', org.id)
      .single()

    if (existingCustomer) {
      console.log('ℹ️ Customer record already exists:', existingCustomer)
    } else {
      // Create customer record
      console.log('📝 Creating customer record...')
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .insert({
          organization_id: org.id,
          lemonsqueezy_customer_id: `bb8_customer_${Date.now()}`,
          email: 'admin@bb8studio.pl'
        })
        .select()
        .single()

      if (customerError) {
        console.error('❌ Failed to create customer:', customerError)
        return
      }

      console.log('✅ Created customer record:', customer)
    }

    // Get customer ID
    const { data: customer } = await supabase
      .from('customers')
      .select('id')
      .eq('organization_id', org.id)
      .single()

    // Check if subscription record already exists
    const { data: existingSub } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('organization_id', org.id)
      .single()

    if (existingSub) {
      console.log('ℹ️ Subscription record already exists:', existingSub)
    } else {
      // Create subscription record
      console.log('📝 Creating subscription record...')
      const { data: subscription, error: subError } = await supabase
        .from('subscriptions')
        .insert({
          organization_id: org.id,
          customer_id: customer.id,
          lemonsqueezy_subscription_id: `bb8_sub_${Date.now()}`,
          variant_id: null,
          status: 'active',
          quantity: 3, // Current paid seats
          renews_at: '2025-09-29T09:38:00Z', // Monthly renewal
          ends_at: null,
          trial_ends_at: null
        })
        .select()
        .single()

      if (subError) {
        console.error('❌ Failed to create subscription:', subError)
        return
      }

      console.log('✅ Created subscription record:', subscription)
    }

    console.log('\n🎉 BB8 Studio is now ready for webhook processing!')
    console.log('Future seat changes will automatically update the database.')
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

createBB8Records()