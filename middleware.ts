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
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    // If user doesn't have an organization, redirect to onboarding
    if (!profile?.organization_id && !pathname.startsWith('/onboarding')) {
      const onboardingUrl = new URL('/onboarding', request.url)
      return NextResponse.redirect(onboardingUrl)
    }

    // If user has organization but is on onboarding, redirect to dashboard
    if (profile?.organization_id && pathname.startsWith('/onboarding')) {
      const dashboardUrl = new URL('/dashboard', request.url)
      return NextResponse.redirect(dashboardUrl)
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}