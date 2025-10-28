/**
 * Create customer and subscription records for Kontury organization
 * This fixes the missing database records for your actual Lemon Squeezy purchase
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('Environment check:', {
  hasUrl: !!supabaseUrl,
  hasKey: !!supabaseServiceKey,
  urlPreview: supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'missing'
})

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase configuration')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createKonturyRecords() {
  try {
    console.log('🔍 Looking up Kontury organization...')
    
    // Get Kontury organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, slug, subscription_tier, paid_seats')
      .eq('slug', 'kontury')
      .single()

    if (orgError || !org) {
      console.error('❌ Kontury organization not found:', orgError)
      return
    }

    console.log('✅ Found Kontury organization:', org)

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
          lemonsqueezy_customer_id: `kontury_customer_${Date.now()}`,
          email: 'admin@kontury.pl'
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
          lemonsqueezy_subscription_id: `kontury_sub_${Date.now()}`,
          variant_id: null,
          status: 'active',
          quantity: 8, // Your actual purchased seats
          renews_at: '2026-08-29T09:38:00Z',
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

    // Final verification
    console.log('🔍 Verifying final state...')
    const { data: finalState } = await supabase
      .from('organizations')
      .select(`
        name,
        subscription_tier,
        paid_seats,
        customers (
          email,
          lemonsqueezy_customer_id
        ),
        subscriptions (
          status,
          quantity,
          renews_at
        )
      `)
      .eq('slug', 'kontury')
      .single()

    console.log('🎉 Final state:', JSON.stringify(finalState, null, 2))

    console.log('\n✅ Done! Your billing page should now show the correct subscription data.')
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

createKonturyRecords()