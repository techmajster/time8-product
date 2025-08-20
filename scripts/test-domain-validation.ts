#!/usr/bin/env npx tsx

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function testDomainValidation() {
  try {
    console.log('Testing domain validation...')
    
    // Get the organization settings
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, google_domain, require_google_domain')
      .single()
    
    if (orgError || !org) {
      console.error('Could not find organization:', orgError)
      return
    }
    
    console.log('Organization settings:', {
      name: org.name,
      google_domain: org.google_domain,
      require_google_domain: org.require_google_domain
    })
    
    // Test API endpoint with invalid domain
    console.log('\nTesting API with invalid domain (szymonraj@gmail.com)...')
    const testResponse = await fetch('http://localhost:3000/api/employees', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + supabaseServiceKey // This would normally be session token
      },
      body: JSON.stringify({
        employees: [{
          email: 'szymonraj@gmail.com',
          full_name: 'Test User',
          role: 'employee',
          team_id: null,
          send_invitation: true
        }]
      })
    })
    
    const result = await testResponse.json()
    console.log('API Response:', result)
    
  } catch (error) {
    console.error('Test error:', error)
  }
}

testDomainValidation()