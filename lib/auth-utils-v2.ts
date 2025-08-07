import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getOrSetCache, cacheKeys, cacheTTL } from '@/lib/cache-utils'
import { cookies } from 'next/headers'
import { headers } from 'next/headers'

// =====================================================================================
// TYPES AND INTERFACES
// =====================================================================================

export interface UserProfile {
  id: string
  organization_id: string
  role: string
  full_name: string | null
  email: string
  avatar_url: string | null
  manager_id: string | null
  auth_provider: string
  created_at: string
  updated_at: string
}

export interface UserOrganization {
  user_id: string
  organization_id: string
  role: 'admin' | 'manager' | 'employee'
  team_id: string | null
  is_active: boolean
  is_default: boolean
  joined_via: 'google_domain' | 'invitation' | 'created' | 'request'
  employment_type: string
  contract_start_date: string | null
  joined_at: string
  updated_at: string
}

export interface Organization {
  id: string
  name: string
  slug: string
  logo_url: string | null
  google_domain: string | null
  require_google_domain: boolean
  created_at: string
  updated_at: string
}

export interface OrganizationSettings {
  organization_id: string
  allow_domain_join_requests: boolean
  is_discoverable_by_domain: boolean
  require_admin_approval_for_domain_join: boolean
  auto_approve_verified_domains: boolean
  default_employment_type: string
  require_contract_dates: boolean
  data_retention_days: number
  allow_data_export: boolean
  created_at: string
  updated_at: string
}

// Complete authentication context for multi-organization
export type AuthContext = {
  user: {
    id: string
    email: string
    aud: string
    role?: string
  }
  profile: UserProfile
  organization: Organization
  organizationSettings: OrganizationSettings
  userOrganization: UserOrganization
  role: 'admin' | 'manager' | 'employee'
  organizations: UserOrganization[]
  permissions: {
    canManageUsers: boolean
    canManageTeams: boolean
    canApproveLeave: boolean
    canViewReports: boolean
    canManageSettings: boolean
  }
}

export type AuthResult = {
  success: true
  context: AuthContext
} | {
  success: false
  error: NextResponse
}

export type BasicAuthResult = {
  success: true
  user: { id: string; email: string }
  organizationId: string
  role: string
} | {
  success: false
  error: NextResponse
}

// =====================================================================================
// ORGANIZATION CONTEXT MANAGEMENT
// =====================================================================================

/**
 * Get the current organization context from headers or cookies
 * Priority: Header > Cookie > User's default organization
 */
async function getCurrentOrganizationId(userId: string): Promise<string | null> {
  try {
    // Check for organization ID in request headers (for API calls)
    const headersList = await headers()
    const orgFromHeader = headersList.get('x-organization-id')
    if (orgFromHeader) {
      return orgFromHeader
    }

    // Check for organization ID in cookies (for web requests)
    const cookieStore = await cookies()
    const orgFromCookie = cookieStore.get('active-organization-id')?.value
    if (orgFromCookie) {
      return orgFromCookie
    }

    // Fall back to user's default organization
    const supabase = await createClient()
    const { data: defaultOrg } = await supabase
      .from('user_organizations')
      .select('organization_id')
      .eq('user_id', userId)
      .eq('is_default', true)
      .eq('is_active', true)
      .single()

    return defaultOrg?.organization_id || null
  } catch (error) {
    console.error('Error getting organization context:', error)
    return null
  }
}

/**
 * Set the active organization in cookies
 */
export async function setActiveOrganization(organizationId: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set('active-organization-id', organizationId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30 // 30 days
  })
}

// =====================================================================================
// CORE MULTI-ORGANIZATION AUTHENTICATION FUNCTIONS
// =====================================================================================

/**
 * Complete multi-organization authentication with full context
 * Returns user, profile, organization, and all related data
 */
export async function authenticateAndGetOrgContext(
  organizationId?: string
): Promise<AuthResult> {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return {
        success: false,
        error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    // Determine which organization to use
    const targetOrgId = organizationId || await getCurrentOrganizationId(user.id)
    
    if (!targetOrgId) {
      return {
        success: false,
        error: NextResponse.json({ 
          error: 'No organization context found. User may not belong to any organization.' 
        }, { status: 400 })
      }
    }

    // Get user's relationship with the target organization
    const { data: userOrganization, error: userOrgError } = await supabase
      .from('user_organizations')
      .select('*')
      .eq('user_id', user.id)
      .eq('organization_id', targetOrgId)
      .eq('is_active', true)
      .single()

    if (userOrgError || !userOrganization) {
      return {
        success: false,
        error: NextResponse.json({ 
          error: 'User does not belong to the specified organization or access is inactive' 
        }, { status: 403 })
      }
    }

    // Get user profile (for backward compatibility)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return {
        success: false,
        error: NextResponse.json({ error: 'Profile not found' }, { status: 404 })
      }
    }

    // Get organization details
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', targetOrgId)
      .single()

    if (orgError || !organization) {
      return {
        success: false,
        error: NextResponse.json({ error: 'Organization not found' }, { status: 404 })
      }
    }

    // Get organization settings
    let { data: organizationSettings, error: settingsError } = await supabase
      .from('organization_settings')
      .select('*')
      .eq('organization_id', targetOrgId)
      .single()

    // If organization settings don't exist, create default ones
    if (settingsError || !organizationSettings) {
      console.log(`⚙️ Creating default organization settings for organization ${targetOrgId}`)
      
      const defaultSettings = {
        organization_id: targetOrgId,
        allow_domain_join_requests: true,
        is_discoverable_by_domain: true,
        require_admin_approval_for_domain_join: false,
        auto_approve_verified_domains: false,
        default_employment_type: 'full_time',
        require_contract_dates: true,
        data_retention_days: 365,
        allow_data_export: true
      }

      const { data: newSettings, error: createError } = await supabase
        .from('organization_settings')
        .insert(defaultSettings)
        .select('*')
        .single()

      if (createError) {
        console.error('❌ Failed to create organization settings:', createError)
        return {
          success: false,
          error: NextResponse.json({ 
            error: 'Failed to create organization settings: ' + createError.message 
          }, { status: 500 })
        }
      }

      organizationSettings = newSettings
      console.log('✅ Created default organization settings')
    }

    // Get all user's organizations
    const { data: allUserOrganizations, error: allOrgsError } = await supabase
      .from('user_organizations')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('is_default', { ascending: false })

    if (allOrgsError) {
      return {
        success: false,
        error: NextResponse.json({ error: 'Failed to fetch user organizations' }, { status: 500 })
      }
    }

    // Calculate permissions based on role
    const permissions = calculatePermissions(userOrganization.role)

    // Build complete auth context
    const authContext: AuthContext = {
      user: {
        id: user.id,
        email: user.email || '',
        aud: user.aud,
        role: user.role
      },
      profile,
      organization,
      organizationSettings,
      userOrganization,
      role: userOrganization.role,
      organizations: allUserOrganizations || [],
      permissions
    }

    return {
      success: true,
      context: authContext
    }

  } catch (error) {
    console.error('Auth context error:', error)
    return {
      success: false,
      error: NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }
}

/**
 * Switch user's active organization
 */
export async function switchOrganization(organizationId: string): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' }
    }

    // Verify user belongs to the target organization
    const { data: userOrganization, error: userOrgError } = await supabase
      .from('user_organizations')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .single()

    if (userOrgError || !userOrganization) {
      return { success: false, error: 'User does not belong to the specified organization' }
    }

    // Set active organization in cookies
    setActiveOrganization(organizationId)

    // Clear relevant caches
    const cacheKey = cacheKeys.userProfileWithOrg(user.id)
    // Note: You may want to implement cache invalidation here

    return { success: true }

  } catch (error) {
    console.error('Switch organization error:', error)
    return { success: false, error: 'Internal server error' }
  }
}

/**
 * Get all organizations for the current user
 */
export async function getUserOrganizations(): Promise<{
  success: boolean
  organizations?: (UserOrganization & { organization: Organization })[]
  error?: string
}> {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' }
    }

    // Get user's organizations with organization details
    const { data: userOrganizations, error: userOrgError } = await supabase
      .from('user_organizations')
      .select(`
        *,
        organization:organizations(*)
      `)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('is_default', { ascending: false })

    if (userOrgError) {
      return { success: false, error: 'Failed to fetch user organizations' }
    }

    return { 
      success: true, 
      organizations: userOrganizations as (UserOrganization & { organization: Organization })[]
    }

  } catch (error) {
    console.error('Get user organizations error:', error)
    return { success: false, error: 'Internal server error' }
  }
}

/**
 * Check if user has specific role in specific organization
 */
export async function requireOrgRole(
  organizationId: string,
  requiredRoles: ('admin' | 'manager' | 'employee')[],
  userId?: string
): Promise<{
  success: boolean
  role?: 'admin' | 'manager' | 'employee'
  error?: NextResponse
}> {
  try {
    const supabase = await createClient()
    
    // Get user ID
    let targetUserId = userId
    if (!targetUserId) {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        return {
          success: false,
          error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
      }
      targetUserId = user.id
    }

    // Check user's role in the organization
    const { data: userOrganization, error: userOrgError } = await supabase
      .from('user_organizations')
      .select('role')
      .eq('user_id', targetUserId)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .single()

    if (userOrgError || !userOrganization) {
      return {
        success: false,
        error: NextResponse.json({ 
          error: 'User does not belong to this organization' 
        }, { status: 403 })
      }
    }

    if (!requiredRoles.includes(userOrganization.role as any)) {
      return {
        success: false,
        error: NextResponse.json({ 
          error: `Access denied. Required role: ${requiredRoles.join(' or ')}` 
        }, { status: 403 })
      }
    }

    return {
      success: true,
      role: userOrganization.role as 'admin' | 'manager' | 'employee'
    }

  } catch (error) {
    console.error('Role check error:', error)
    return {
      success: false,
      error: NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }
}

// =====================================================================================
// UTILITY FUNCTIONS
// =====================================================================================

/**
 * Calculate permissions based on role
 */
function calculatePermissions(role: 'admin' | 'manager' | 'employee') {
  const basePermissions = {
    canManageUsers: false,
    canManageTeams: false,
    canApproveLeave: false,
    canViewReports: false,
    canManageSettings: false
  }

  switch (role) {
    case 'admin':
      return {
        canManageUsers: true,
        canManageTeams: true,
        canApproveLeave: true,
        canViewReports: true,
        canManageSettings: true
      }
    case 'manager':
      return {
        ...basePermissions,
        canApproveLeave: true,
        canViewReports: true,
        canManageTeams: true
      }
    case 'employee':
    default:
      return basePermissions
  }
}

/**
 * Check if user has admin or manager role
 */
export function isManagerOrAdmin(role: string): boolean {
  return role === 'admin' || role === 'manager'
}

/**
 * Check if user has admin role
 */
export function isAdmin(role: string): boolean {
  return role === 'admin'
}

/**
 * Role-based authorization check for API routes (multi-org version)
 */
export function requireRole(
  authContext: AuthContext, 
  requiredRoles: ('admin' | 'manager' | 'employee')[]
): NextResponse | null {
  if (!requiredRoles.includes(authContext.role)) {
    return NextResponse.json(
      { error: `Access denied. Required role: ${requiredRoles.join(' or ')}` },
      { status: 403 }
    )
  }
  return null
}

// =====================================================================================
// BACKWARD COMPATIBILITY LAYER
// =====================================================================================

/**
 * @deprecated Use authenticateAndGetOrgContext() instead
 * Legacy function for backward compatibility
 */
export async function authenticateAndGetProfile(): Promise<{
  success: true
  user: any
  profile: UserProfile
} | {
  success: false
  error: NextResponse
}> {
  console.warn('authenticateAndGetProfile() is deprecated. Use authenticateAndGetOrgContext() instead.')
  
  const result = await authenticateAndGetOrgContext()
  
  if (!result.success) {
    return result
  }

  return {
    success: true,
    user: result.context.user,
    profile: result.context.profile
  }
}

/**
 * @deprecated Use authenticateAndGetOrgContext() instead
 * Legacy function for basic auth with caching
 */
export async function getBasicAuth(): Promise<BasicAuthResult> {
  console.warn('getBasicAuth() is deprecated. Use authenticateAndGetOrgContext() instead.')
  
  try {
    const supabase = await createClient()
    
    // Get user from Supabase Auth
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return {
        success: false,
        error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    // Get current organization context
    const organizationId = await getCurrentOrganizationId(user.id)
    
    if (!organizationId) {
      return {
        success: false,
        error: NextResponse.json({ error: 'Organization not found' }, { status: 404 })
      }
    }

    // Get user's role in the current organization
    const { data: userOrganization, error: userOrgError } = await supabase
      .from('user_organizations')
      .select('role')
      .eq('user_id', user.id)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .single()

    if (userOrgError || !userOrganization) {
      return {
        success: false,
        error: NextResponse.json({ error: 'User organization not found' }, { status: 404 })
      }
    }

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email || ''
      },
      organizationId,
      role: userOrganization.role
    }

  } catch (error) {
    console.error('Auth error:', error)
    return {
      success: false,
      error: NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }
}

// =====================================================================================
// ORGANIZATION MANAGEMENT HELPERS
// =====================================================================================

/**
 * Create a new organization and add the user as admin
 */
export async function createOrganization(data: {
  name: string
  slug: string
  google_domain?: string
}): Promise<{
  success: boolean
  organization?: Organization
  error?: string
}> {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' }
    }

    // Create organization
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: data.name,
        slug: data.slug,
        google_domain: data.google_domain
      })
      .select()
      .single()

    if (orgError || !organization) {
      return { success: false, error: 'Failed to create organization' }
    }

    // Add user as admin
    const { error: userOrgError } = await supabase
      .from('user_organizations')
      .insert({
        user_id: user.id,
        organization_id: organization.id,
        role: 'admin',
        is_active: true,
        is_default: true,
        joined_via: 'created',
        employment_type: 'full_time'
      })

    if (userOrgError) {
      // Rollback organization creation
      await supabase.from('organizations').delete().eq('id', organization.id)
      return { success: false, error: 'Failed to assign user to organization' }
    }

    return { success: true, organization }

  } catch (error) {
    console.error('Create organization error:', error)
    return { success: false, error: 'Internal server error' }
  }
}

/**
 * Add user to organization
 */
export async function addUserToOrganization(
  organizationId: string,
  userId: string,
  role: 'admin' | 'manager' | 'employee',
  options: {
    teamId?: string
    employmentType?: string
    contractStartDate?: string
    joinedVia?: 'google_domain' | 'invitation' | 'created' | 'request'
  } = {}
): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const supabase = await createClient()
    
    // Check if user already belongs to organization
    const { data: existing } = await supabase
      .from('user_organizations')
      .select('id')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .single()

    if (existing) {
      return { success: false, error: 'User already belongs to this organization' }
    }

    // Add user to organization
    const { error: insertError } = await supabase
      .from('user_organizations')
      .insert({
        user_id: userId,
        organization_id: organizationId,
        role,
        team_id: options.teamId,
        is_active: true,
        is_default: false, // New organizations are not default unless manually set
        joined_via: options.joinedVia || 'invitation',
        employment_type: options.employmentType || 'full_time',
        contract_start_date: options.contractStartDate
      })

    if (insertError) {
      return { success: false, error: 'Failed to add user to organization' }
    }

    return { success: true }

  } catch (error) {
    console.error('Add user to organization error:', error)
    return { success: false, error: 'Internal server error' }
  }
}

// =====================================================================================
// POLISH BUSINESS COMPLIANCE HELPERS
// =====================================================================================

/**
 * Get Polish labor law compliant employment types
 */
export function getPolishEmploymentTypes() {
  return [
    { value: 'full_time', label: 'Umowa o pracę (pełny etat)', description: 'Full-time employment contract' },
    { value: 'part_time', label: 'Umowa o pracę (część etatu)', description: 'Part-time employment contract' },
    { value: 'contract', label: 'Umowa zlecenie', description: 'Service contract' },
    { value: 'task_contract', label: 'Umowa o dzieło', description: 'Task-specific contract' },
    { value: 'internship', label: 'Staż/Praktyki', description: 'Internship' },
    { value: 'temporary', label: 'Umowa na czas określony', description: 'Fixed-term contract' },
    { value: 'consultant', label: 'Współpraca B2B', description: 'B2B cooperation' }
  ]
}

/**
 * Validate Polish business requirements
 */
export function validatePolishCompliance(userOrganization: UserOrganization): {
  isCompliant: boolean
  issues: string[]
  recommendations: string[]
} {
  const issues: string[] = []
  const recommendations: string[] = []

  // Check contract start date for employment types that require it
  const contractRequiredTypes = ['full_time', 'part_time', 'temporary']
  if (contractRequiredTypes.includes(userOrganization.employment_type) && !userOrganization.contract_start_date) {
    issues.push('Contract start date is required for this employment type')
    recommendations.push('Please provide the contract start date for labor law compliance')
  }

  // Check for proper documentation trail
  if (!userOrganization.joined_via) {
    issues.push('Missing documentation of how user joined the organization')
    recommendations.push('Document the hiring process for audit purposes')
  }

  return {
    isCompliant: issues.length === 0,
    issues,
    recommendations
  }
} 