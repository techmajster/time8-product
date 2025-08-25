import { NextResponse } from 'next/server'
import { authenticateAndGetOrgContext } from '@/lib/auth-utils-v2'

export async function GET() {
  try {
    console.log('🔍 Getting current organization...')
    
    // Use optimized auth utility to get current organization context
    const auth = await authenticateAndGetOrgContext()
    
    if (!auth.success) {
      console.error('❌ Auth failed:', auth.error)
      return auth.error
    }
    
    const { context } = auth
    console.log('✅ Current organization context:', {
      organizationId: context.organization.id,
      organizationName: context.organization.name,
      userOrganization: context.userOrganization,
      allOrganizations: context.organizations
    })

    // Also check what the getCurrentOrganizationId function returns independently
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      const { getCurrentOrganizationId } = await import('@/lib/auth-utils-v2')
      // We need to extract the getCurrentOrganizationId function or recreate its logic
      const { cookies } = await import('next/headers')
      const cookieStore = await cookies()
      const orgFromCookie = cookieStore.get('active-organization-id')?.value
      console.log('🍪 Organization from cookie:', orgFromCookie)
    }

    return NextResponse.json({
      organizationId: context.organization.id,
      organizationName: context.organization.name,
      role: context.role
    })
  } catch (error) {
    console.error('❌ Error getting current organization:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}