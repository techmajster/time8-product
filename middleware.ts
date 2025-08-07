import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Create a response object
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Create Supabase client
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()

  // Public routes that don't require authentication
  const publicRoutes = [
    '/login',
    '/login/callback',
    '/signup',
    '/forgot-password',
    '/reset-password',
    '/onboarding/join', // Allow invitation acceptance page
    '/api/logout',
    '/api/locale', // Add locale API route
    '/favicon.ico',
    '/_next',
    '/images',
  ]

  // Public API routes
  const publicApiRoutes = [
    '/api/logout',
    '/api/locale', // Language switching API
    '/api/invitations/lookup', // Invitation lookup for public join page
    '/api/auth/signup', // Custom signup endpoint
    '/api/auth/signup-with-invitation', // Invitation-based signup endpoint
    '/api/auth/verify-email', // Email verification endpoint
    '/api/organizations', // Organization creation for authenticated users
    '/api/test-db', // Database connection test endpoint
    '/api/test-auth', // Authentication diagnostic endpoint
    '/api/debug-db', // Database diagnostic endpoint
    '/api/test-rls', // RLS policy diagnostic endpoint
    '/api/debug-user-state', // User state debugging endpoint
    '/api/fix-user-organization', // User organization fix endpoint
    '/api/fix-admin-user', // Fix admin@bb8.pl account
    '/api/debug-database-state', // Comprehensive database state check
    '/api/fix-broken-accounts', // Fix missing profiles and organization memberships
    '/api/migrate-profiles-to-multi-org', // Complete profile to multi-org migration
  ]

  const { pathname } = request.nextUrl

  // Allow public routes
  if (publicRoutes.some(route => pathname.startsWith(route)) || 
      publicApiRoutes.some(route => pathname.startsWith(route))) {
    return response
  }

  // If user is not authenticated, redirect to login
  if (!user) {
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  // If user is authenticated, check if they have an organization
  if (user) {
    // MULTI-ORG UPDATE: Check user_organizations instead of profile.organization_id
    const { data: userOrgs, error: userOrgsError } = await supabase
      .from('user_organizations')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .limit(1)

    console.log('🔍 Middleware org check:', { 
      userId: user.id, 
      userOrgs, 
      userOrgsError,
      pathname 
    })

    const hasOrganization = userOrgs && userOrgs.length > 0

    // If user doesn't have an organization, redirect to onboarding
    if (!hasOrganization && !pathname.startsWith('/onboarding')) {
      const onboardingUrl = new URL('/onboarding', request.url)
      return NextResponse.redirect(onboardingUrl)
    }

    // If user has organization but is on onboarding, redirect to dashboard
    if (hasOrganization && pathname.startsWith('/onboarding')) {
      const dashboardUrl = new URL('/dashboard', request.url)
      return NextResponse.redirect(dashboardUrl)
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}