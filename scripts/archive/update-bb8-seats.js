/**
 * Update BB8 Studio to have 3 paid seats
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function updateBB8Seats() {
  try {
    console.log('🔄 Updating BB8 Studio to have 3 paid seats...')
    
    const { data, error } = await supabase
      .from('organizations')
      .update({
        paid_seats: 3,
        subscription_tier: 'active'
      })
      .eq('slug', 'bb8-studio')
      .select()

    if (error) {
      console.error('❌ Failed to update:', error)
      return
    }

    console.log('✅ Updated BB8 Studio:', data[0])
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

updateBB8Seats()