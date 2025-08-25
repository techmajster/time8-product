// Onboarding Components
export { WelcomeScreen } from './WelcomeScreen'
export { ChoiceScreen } from './ChoiceScreen'
export { MultiOptionScreen } from './MultiOptionScreen'
export { WorkspaceAvatar } from './WorkspaceAvatar'

// Types for onboarding data
export interface OnboardingUser {
  id: string
  email: string
  full_name?: string
}

export interface OnboardingWorkspace {
  id: string
  name: string
  initials: string
  memberCount: number
  role: string
}

export interface OnboardingInvitation {
  id: string
  organizationName: string
  organizationInitials: string
  inviterName: string
  inviterEmail: string
  token: string
}

export interface OnboardingScenarioProps {
  userName: string
}

export interface WelcomeScreenProps extends OnboardingScenarioProps {}

export interface ChoiceScreenProps extends OnboardingScenarioProps {
  invitation: OnboardingInvitation
}

export interface MultiOptionScreenProps extends OnboardingScenarioProps {
  userWorkspaces: OnboardingWorkspace[]
  pendingInvitations: OnboardingInvitation[]
}