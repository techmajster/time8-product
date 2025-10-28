/**
 * Check BB8 Studio organization data
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkBB8Data() {
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

    // Count active organization members
    const { data: members, error: memberError } = await supabase
      .from('user_organizations')
      .select(`
        user_id,
        is_active,
        role,
        users (
          first_name,
          last_name,
          email
        )
      `)
      .eq('organization_id', org.id)
      .eq('is_active', true)

    if (memberError) {
      console.error('❌ Error getting members:', memberError)
      return
    }

    console.log(`👥 Active members (${members.length}):`)
    members.forEach(member => {
      const user = member.users
      console.log(`  - ${user.first_name} ${user.last_name} (${user.email}) - ${member.role}`)
    })

    // Calculate seat info
    const FREE_SEATS = 3
    const totalSeats = org.paid_seats + FREE_SEATS
    const currentEmployees = members.length
    const seatsRemaining = totalSeats - currentEmployees

    console.log('\n💺 Seat calculation:')
    console.log(`  Free seats: ${FREE_SEATS}`)
    console.log(`  Paid seats: ${org.paid_seats}`)
    console.log(`  Total seats: ${totalSeats}`)
    console.log(`  Current employees: ${currentEmployees}`)
    console.log(`  Seats remaining: ${Math.max(0, seatsRemaining)}`)

    // Check if there are customer/subscription records
    const { data: customer } = await supabase
      .from('customers')
      .select('*')
      .eq('organization_id', org.id)
      .single()

    if (customer) {
      console.log('\n💳 Customer record exists:', customer.email)
      
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('organization_id', org.id)
        .single()

      if (subscription) {
        console.log('📋 Subscription record:', {
          status: subscription.status,
          quantity: subscription.quantity,
          renews_at: subscription.renews_at
        })
      } else {
        console.log('❌ No subscription record found')
      }
    } else {
      console.log('\n❌ No customer record found')
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

checkBB8Data()