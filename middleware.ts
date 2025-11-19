import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { userHasOrganization } from './lib/middleware-utils'
import { UserRole, isManagerOrAdmin, isAdmin } from './lib/permissions'

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
    '/onboarding/register', // Allow invitation registration page
    '/onboarding/success', // Allow invitation success page
    '/api/logout',
    '/api/locale', // Add locale API route
    '/favicon.ico',
    '/_next',
    '/images',
    '/auth-assets', // Allow auth page assets to load without authentication
  ]

  // Public API routes
  const publicApiRoutes = [
    '/api/logout',
    '/api/locale', // Language switching API
    '/api/invitations/lookup', // Invitation lookup for public join page
    '/api/auth/signup', // Custom signup endpoint
    '/api/auth/signup-with-invitation', // Invitation-based signup endpoint
    '/api/auth/verify-email', // Email verification endpoint
    '/api/auth/check-provider', // Check user's auth provider during login
    '/api/organizations', // Organization creation for authenticated users
    '/api/user/organization-status', // New onboarding scenario detection API
    '/api/test-db', // Database connection test endpoint
    '/api/test-auth', // Authentication diagnostic endpoint
    '/api/debug-db', // Database diagnostic endpoint
    '/api/test-rls', // RLS policy diagnostic endpoint
    '/api/debug-user-state', // User state debugging endpoint
    '/api/fix-user-organization', // User organization fix endpoint
    '/api/test/alert-email', // Test alert email delivery (requires auth header)
    '/api/fix-admin-user', // Fix admin@bb8.pl account
    '/api/debug-database-state', // Comprehensive database state check
    '/api/fix-broken-accounts', // Fix missing profiles and organization memberships
    '/api/migrate-profiles-to-multi-org', // Complete profile to multi-org migration
    '/api/billing/products', // Public billing products endpoint
    '/api/billing/create-checkout', // Public checkout creation for onboarding
    '/api/webhooks/lemonsqueezy', // Lemon Squeezy webhooks
    '/api/admin/delete-organization', // Admin organization deletion
    '/api/admin/force-delete-org', // Admin force organization deletion
    '/api/admin/migrate-billing-type', // Admin billing type migration
    '/api/admin/list-orgs', // Admin list organizations
    '/api/admin/run-migration', // Admin run database migrations
  ]

  const { pathname } = request.nextUrl

  // Allow public routes
  if (publicRoutes.some(route => pathname.startsWith(route)) || 
      publicApiRoutes.some(route => pathname.startsWith(route))) {
    return response
  }

  // Allow authenticated users to access /onboarding (handles all scenarios)
  if (pathname === '/onboarding' && user) {
    console.log('🎫 Allowing authenticated user to access onboarding')
    return response
  }

  // Allow unauthenticated users to access /onboarding with invitation tokens
  if (pathname === '/onboarding' && !user && request.nextUrl.searchParams.get('token')) {
    console.log('🎫 Allowing unauthenticated user with invitation token to access onboarding')
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

    // Allow access to dashboard and other protected routes for users with organizations
    // Users without organizations can still access /onboarding to see their scenario options
    if (!pathname.startsWith('/onboarding') && !pathname.startsWith('/api/')) {
      // For dashboard and other protected routes, users need an organization
      if (hasOrganization) {
        // Get user's role for role-based route protection
        // IMPORTANT: Respect the active-organization-id cookie for multi-workspace support
        const cookieStore = await cookies()
        const activeOrgId = cookieStore.get('active-organization-id')?.value

        let userOrgQuery = supabase
          .from('user_organizations')
          .select('role, organization_id')
          .eq('user_id', user.id)
          .eq('is_active', true)

        // Use active org cookie if present, otherwise use default
        if (activeOrgId) {
          userOrgQuery = userOrgQuery.eq('organization_id', activeOrgId)
        } else {
          userOrgQuery = userOrgQuery.eq('is_default', true)
        }

        const { data: userOrg } = await userOrgQuery.single()
        const userRole = (userOrg?.role as UserRole) || null

        console.log('🔐 Middleware permission check:', {
          pathname,
          activeOrgId,
          userRole
        })

        // Define role-based protected routes
        const managerOnlyRoutes = ['/team', '/leave-requests']
        const adminOnlyRoutes = ['/admin', '/settings']

        // Check if current path requires specific role
        const requiresManager = managerOnlyRoutes.some(route => pathname.startsWith(route))
        const requiresAdmin = adminOnlyRoutes.some(route => pathname.startsWith(route))

        // Enforce role-based access
        if (requiresAdmin && !isAdmin(userRole)) {
          console.log('🚫 Admin route access denied for role:', userRole)
          const dashboardUrl = new URL('/dashboard', request.url)
          return NextResponse.redirect(dashboardUrl)
        }

        if (requiresManager && !isManagerOrAdmin(userRole)) {
          console.log('🚫 Manager route access denied for role:', userRole)
          const dashboardUrl = new URL('/dashboard', request.url)
          return NextResponse.redirect(dashboardUrl)
        }

        // User has an organization and proper role, allow them to access the route
        return response
      } else {
        // User doesn't have an organization, redirect to onboarding to see their options
        const onboardingUrl = new URL('/onboarding', request.url)
        return NextResponse.redirect(onboardingUrl)
      }
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}