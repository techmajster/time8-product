/**
 * Test Subscription Status Helper Script
 *
 * This script helps set subscription status for browser testing
 * Usage: npx tsx scripts/test-subscription-status.ts <status> <org-id> [days]
 *
 * Examples:
 * npx tsx scripts/test-subscription-status.ts on_trial your-org-id 7
 * npx tsx scripts/test-subscription-status.ts expired your-org-id
 * npx tsx scripts/test-subscription-status.ts paused your-org-id
 * npx tsx scripts/test-subscription-status.ts active your-org-id
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

type SubscriptionStatus = 'on_trial' | 'active' | 'expired' | 'paused' | 'past_due' | 'cancelled' | 'unpaid'

async function setSubscriptionStatus(
  status: SubscriptionStatus,
  organizationId: string,
  trialDays?: number
) {
  console.log(`\n🔧 Setting subscription status for organization: ${organizationId}`)
  console.log(`📊 New status: ${status}`)

  const updateData: any = {
    status,
    updated_at: new Date().toISOString()
  }

  // Handle trial-specific fields
  if (status === 'on_trial') {
    const days = trialDays || 7
    const trialEndDate = new Date()
    trialEndDate.setDate(trialEndDate.getDate() + days)
    updateData.trial_ends_at = trialEndDate.toISOString()
    console.log(`⏰ Trial ends at: ${trialEndDate.toLocaleString()}`)
    console.log(`📅 Days remaining: ${days}`)
  } else if (status === 'expired') {
    // Set trial_ends_at to past date for expired
    const expiredDate = new Date()
    expiredDate.setDate(expiredDate.getDate() - 5)
    updateData.trial_ends_at = expiredDate.toISOString()
    console.log(`⏰ Trial ended at: ${expiredDate.toLocaleString()}`)
  } else {
    // Clear trial_ends_at for non-trial statuses
    updateData.trial_ends_at = null
  }

  // Update subscription
  const { data, error } = await supabase
    .from('subscriptions')
    .update(updateData)
    .eq('organization_id', organizationId)
    .select()
    .single()

  if (error) {
    console.error('❌ Error updating subscription:', error)
    process.exit(1)
  }

  console.log('\n✅ Subscription updated successfully!')
  console.log('\n📋 Current subscription data:')
  console.log(JSON.stringify(data, null, 2))
  console.log('\n💡 Refresh your browser to see the changes')
  console.log('🔗 Go to: Admin Settings > Billing tab\n')
}

async function listOrganizations() {
  console.log('\n📋 Available organizations:\n')

  const { data, error } = await supabase
    .from('organizations')
    .select('id, name, slug')
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) {
    console.error('❌ Error fetching organizations:', error)
    return
  }

  if (!data || data.length === 0) {
    console.log('No organizations found')
    return
  }

  data.forEach((org, index) => {
    console.log(`${index + 1}. ${org.name}`)
    console.log(`   ID: ${org.id}`)
    console.log(`   Slug: ${org.slug}\n`)
  })
}

// Main execution
const args = process.argv.slice(2)
const command = args[0]

if (!command || command === 'list') {
  listOrganizations()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err)
      process.exit(1)
    })
} else {
  const status = command as SubscriptionStatus
  const organizationId = args[1]
  const trialDays = args[2] ? parseInt(args[2]) : undefined

  const validStatuses: SubscriptionStatus[] = ['on_trial', 'active', 'expired', 'paused', 'past_due', 'cancelled', 'unpaid']

  if (!validStatuses.includes(status)) {
    console.error('❌ Invalid status. Valid statuses:', validStatuses.join(', '))
    console.log('\nUsage:')
    console.log('  npx tsx scripts/test-subscription-status.ts list')
    console.log('  npx tsx scripts/test-subscription-status.ts <status> <org-id> [days]')
    console.log('\nExamples:')
    console.log('  npx tsx scripts/test-subscription-status.ts on_trial abc-123 7')
    console.log('  npx tsx scripts/test-subscription-status.ts expired abc-123')
    console.log('  npx tsx scripts/test-subscription-status.ts paused abc-123')
    process.exit(1)
  }

  if (!organizationId) {
    console.error('❌ Organization ID is required')
    console.log('\n💡 First, list organizations:')
    console.log('  npx tsx scripts/test-subscription-status.ts list')
    console.log('\nThen use an organization ID:')
    console.log(`  npx tsx scripts/test-subscription-status.ts ${status} <org-id>`)
    process.exit(1)
  }

  setSubscriptionStatus(status, organizationId, trialDays)
    .then(() => process.exit(0))
    .catch(err => {
      console.error('❌ Unexpected error:', err)
      process.exit(1)
    })
}
