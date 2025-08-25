# Figma Integration Specification

This is the Figma design implementation specification for the spec detailed in @.agent-os/specs/2025-08-13-auth-onboarding-revamp/spec.md

## Figma Design Requirements

### Design 24697-216103: Workspace Creation Choice
**Purpose:** Initial choice screen after successful signup and email verification
**Implementation Location:** `/app/onboarding/welcome/page.tsx` (enhance existing)
**Key Elements:**
- Welcome message with user's name
- Two primary options: "Create New Workspace" vs "Join Existing"
- Clear visual hierarchy with workspace creation as primary action
- Secondary option to search/enter invitation code

**Technical Requirements:**
- Detect verified user state
- Show appropriate messaging for first-time workspace creation
- Handle transition to workspace details page
- Maintain existing i18n support for multi-language

### Design 24689-24777: Workspace Details Setup  
**Purpose:** Organization creation form with company details and preferences
**Implementation Location:** `/app/onboarding/create-workspace/page.tsx` (enhance existing)
**Key Elements:**
- Organization name and slug configuration
- Language/locale selection
- Calendar/timezone settings
- Company branding options (optional)
- Progress indicator showing completion step

**Technical Requirements:**
- Integrate with existing organization creation API
- Validate organization slug uniqueness
- Auto-generate slug from organization name
- Support Google Workspace domain detection for existing Google users
- Implement form validation with real-time feedback

### Design 24689-24716: Invitation Acceptance Interface
**Purpose:** Choice interface for users with pending invitations
**Implementation Location:** `/app/onboarding/choose/page.tsx` (enhance existing)
**Key Elements:**
- List of pending invitations with organization details
- Role and team information display
- Accept/decline actions for each invitation  
- Alternative option to create own workspace
- Clear separation between invitation options and workspace creation

**Technical Requirements:**
- Display invitation expiration warnings
- Show organization branding/logos if available
- Handle multiple pending invitations
- Provide clear feedback on acceptance/decline actions
- Maintain ability to switch to workspace creation flow

### Design 24697-216007: Direct Invitation Password Setup
**Purpose:** Streamlined setup for users arriving via invitation links
**Implementation Location:** `/app/onboarding/join/page.tsx` (enhance existing)
**Key Elements:**
- Pre-filled name and email from invitation
- "You've been invited as [role]" messaging
- Organization name and branding display
- Password setup form
- Automatic progression to dashboard

**Technical Requirements:**
- Validate invitation token server-side
- Pre-populate form fields from invitation data
- Create user account with automatic email verification
- Accept invitation automatically upon account creation
- Handle expired or invalid invitation tokens gracefully

## Design System Integration

### Component Reuse Strategy
**Existing Components to Leverage:**
- Card, Button, Input, Label from `/components/ui/`
- Alert components for error/success messaging  
- Form validation patterns from existing signup forms
- Loading states and animations from current onboarding

**New Components to Create:**
- InvitationCard: Reusable invitation display component
- WorkspaceCreationStepper: Progress indicator for multi-step setup
- OrganizationBrandingPreview: Live preview of organization setup
- InvitationStatusBadge: Status indicators for invitation states

### Responsive Design Requirements
**Mobile Optimization:**
- All onboarding flows must work on mobile devices (existing requirement)
- Card-based layouts should stack appropriately on smaller screens
- Form inputs must be touch-friendly with proper spacing
- Navigation between steps should be intuitive on mobile

**Desktop Enhancement:**
- Utilize wider screens for side-by-side content where appropriate
- Implement hover states for interactive elements
- Consider multi-column layouts for invitation lists
- Add keyboard navigation support for form progression

## Animation and Transition Specifications

### Page Transitions
**Entry Animations:**
- Fade-in with subtle scale animation for cards
- Staggered animation for invitation list items
- Progress indicator animations for multi-step flows
- Success state celebrations for completed actions

**Loading States:**  
- Skeleton loading for invitation data fetching
- Spinner states for form submissions
- Progressive loading for organization creation process
- Real-time validation feedback animations

### Micro-interactions
**Form Interactions:**
- Input focus states with border color transitions
- Validation feedback with color and icon changes
- Button hover and active states
- Progress completion celebrations

**Status Changes:**
- Invitation acceptance success animations
- Error state highlighting with shake animations
- Auto-dismiss success messages after 3 seconds
- Loading-to-success state transitions

## Accessibility Requirements

### WCAG Compliance
**Keyboard Navigation:**
- All interactive elements must be keyboard accessible
- Logical tab order through forms and invitation lists
- Escape key handling for modal/overlay states
- Enter key submission for forms

**Screen Reader Support:**
- Proper ARIA labels for all form elements
- Status announcements for dynamic content changes
- Alternative text for decorative icons and illustrations
- Proper heading hierarchy for page structure

**Visual Accessibility:**
- Sufficient color contrast ratios (4.5:1 minimum)
- Text alternatives for color-coded information
- Scalable text up to 200% without horizontal scrolling
- Focus indicators visible and distinct

## Implementation Priorities

### Phase 1: Core Functionality
1. Email verification integration with existing flows
2. Basic Figma design implementation for all four screens
3. API integrations for user scenario detection
4. Error handling and edge case management

### Phase 2: Enhanced Experience  
1. Animation and micro-interaction implementation
2. Advanced form validation with real-time feedback
3. Mobile optimization and responsive design polish
4. Performance optimization for loading states

### Phase 3: Accessibility & Polish
1. Full accessibility audit and compliance
2. Advanced keyboard navigation features
3. Screen reader optimization and testing
4. Cross-browser compatibility verification