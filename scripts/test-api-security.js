#!/usr/bin/env node

/**
 * API SECURITY TEST
 * 
 * Tests API endpoints to verify authentication and RLS policies work correctly
 */

// Using built-in fetch (Node.js 18+)

const BASE_URL = 'http://localhost:3001'

// Critical API endpoints to test
const criticalEndpoints = [
  '/api/employees',
  '/api/leave-requests', 
  '/api/teams',
  '/api/organizations',
  '/api/admin/settings/organization',
  '/api/calendar/holidays',
  '/api/calendar/leave-requests'
]

async function testUnauthenticatedAccess() {
  console.log('🔐 Testing Unauthenticated Access')
  console.log('-'.repeat(40))
  
  let blockedCount = 0
  let allowedCount = 0
  let errorCount = 0
  
  for (const endpoint of criticalEndpoints) {
    try {
      console.log(`Testing ${endpoint}...`)
      const response = await fetch(`${BASE_URL}${endpoint}`)
      
      if (response.status === 401) {
        console.log(`  ✅ BLOCKED (401) - Requires authentication`)
        blockedCount++
      } else if (response.status === 403) {
        console.log(`  ✅ BLOCKED (403) - Forbidden`)
        blockedCount++
      } else if (response.status === 302) {
        console.log(`  ✅ REDIRECTED (302) - Likely to login`)
        blockedCount++
      } else if (response.status === 200) {
        console.log(`  🚨 ALLOWED (200) - SECURITY ISSUE!`)
        allowedCount++
      } else {
        console.log(`  ⚠️  UNEXPECTED (${response.status}) - ${response.statusText}`)
        errorCount++
      }
      
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.log(`  ❌ SERVER NOT RUNNING - Start server first`)
        return null
      } else {
        console.log(`  ❌ ERROR - ${error.message}`)
        errorCount++
      }
    }
  }
  
  return { blockedCount, allowedCount, errorCount }
}

async function checkServerStatus() {
  try {
    const response = await fetch(`${BASE_URL}/api/health`)
    return response.status === 200
  } catch (error) {
    try {
      // Try the main page
      const response = await fetch(`${BASE_URL}/`)
      return true
    } catch (error2) {
      return false
    }
  }
}

async function runSecurityTest() {
  console.log('🛡️  API SECURITY TEST')
  console.log('='.repeat(40))
  
  // Check if server is running
  console.log('Checking server status...')
  const serverRunning = await checkServerStatus()
  
  if (!serverRunning) {
    console.log(`❌ Server is not running on ${BASE_URL}`)
    console.log('   Start the development server with: npm run dev')
    process.exit(1)
  }
  
  console.log('✅ Server is running')
  
  // Test unauthenticated access
  const results = await testUnauthenticatedAccess()
  
  if (results === null) {
    console.log('❌ Cannot proceed - server connection failed')
    process.exit(1)
  }
  
  // Results summary
  console.log('\\n' + '='.repeat(40))
  console.log('📊 SECURITY TEST RESULTS')
  console.log('='.repeat(40))
  
  console.log(`✅ Properly Blocked: ${results.blockedCount}`)
  console.log(`🚨 Security Issues: ${results.allowedCount}`)
  console.log(`⚠️  Errors/Unknown: ${results.errorCount}`)
  
  const totalTests = results.blockedCount + results.allowedCount + results.errorCount
  const successRate = Math.round((results.blockedCount / totalTests) * 100)
  
  console.log(`📈 Protection Rate: ${successRate}%`)
  
  // Security assessment
  console.log('\\n🛡️  SECURITY ASSESSMENT:')
  if (results.allowedCount === 0 && results.blockedCount > 0) {
    console.log('   ✅ EXCELLENT - All endpoints properly protected')
  } else if (results.allowedCount === 0) {
    console.log('   ⚠️  UNKNOWN - Could not verify endpoint protection')
  } else {
    console.log('   🚨 CRITICAL - Some endpoints allow unauthorized access')
  }
  
  console.log('\\n📋 MANUAL VERIFICATION NEEDED:')
  console.log('   • Test with authenticated user sessions')
  console.log('   • Verify multi-organization data isolation')
  console.log('   • Check role-based access control')
  console.log('   • Test cross-organization access attempts')
  
  console.log('\\n📖 For complete verification, see:')
  console.log('   scripts/rls-manual-verification-guide.md')
  
  return results.allowedCount === 0
}

// Run the test
if (require.main === module) {
  runSecurityTest()
    .then((passed) => {
      if (!passed) {
        process.exit(1)
      }
    })
    .catch((error) => {
      console.error('❌ Security test failed:', error.message)
      process.exit(1)
    })
}

module.exports = { testUnauthenticatedAccess, runSecurityTest }