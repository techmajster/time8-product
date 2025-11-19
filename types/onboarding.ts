// Types for the new onboarding flow

export interface OrganizationStatusResponse {
  scenario: 'has_organizations' | 'has_invitations' | 'no_invitations'
  hasOrganizations: boolean
  organizations?: Array<{
    organization_id: string
    role: string
    is_default: boolean
    is_active: boolean
    organizations: {
      name: string
    }
  }>
  defaultOrganization?: {
    id: string
    name: string
    role: string
  }
  pendingInvitations?: Array<{
    id: string
    organization_id: string
    role: string
    team_id?: string | null
    organizations: {
      name: string
    }
    teams?: {
      name: string
    } | null
  }>
}

export interface CreateOrganizationRequest {
  name: string
  country_code?: string
}

export interface CreateOrganizationResponse {
  success: boolean
  organization: {
    id: string
    name: string
    country_code: string
    created_at: string
  }
  message: string
}

export interface AcceptInvitationRequest {
  invitation_id: string
}

export interface AcceptInvitationResponse {
  success: boolean
  organization: {
    id: string
    name: string
  }
  user: {
    role: string
    team_name?: string | null
  }
  message: string
}

// Onboarding scenario types
export type OnboardingScenario = 'has_organizations' | 'has_invitations' | 'no_invitations'

export interface OnboardingState {
  scenario: OnboardingScenario
  loading: boolean
  error: string | null
  data: OrganizationStatusResponse | null
}