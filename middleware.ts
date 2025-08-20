import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { userHasOrganization } from './lib/middleware-utils'

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
    '/api/user/organization-status', // New onboarding scenario detection API
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

  // Enhanced onboarding routing based on user's organization status
  if (user) {
    // Skip onboarding routing for join with token (direct invitation flow)
    if (pathname === '/onboarding/join' && request.nextUrl.searchParams.get('token')) {
      return response // Allow direct token flow to proceed
    }

    // Check user's organization status for proper routing
    const hasOrganization = await userHasOrganization(user.id, request)

    console.log('🔍 Middleware org check:', { 
      userId: user.id, 
      hasOrganization,
      pathname 
    })

    // If user doesn't have an organization, route to appropriate onboarding scenario
    if (!hasOrganization && !pathname.startsWith('/onboarding')) {
      // Route to welcome screen (will determine correct scenario via API)
      const onboardingUrl = new URL('/onboarding/welcome', request.url)
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