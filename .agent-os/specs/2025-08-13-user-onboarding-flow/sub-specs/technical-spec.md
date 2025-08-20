# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-08-13-user-onboarding-flow/spec.md

## Implementation Approach

**Replace Current System**: Remove existing complex onboarding logic in `/app/onboarding/page.tsx` and `/app/onboarding/join/page.tsx`, replacing with clean scenario-based flows that match Figma designs.

## Technical Requirements

### Core Components (Scenario-based)

**Scenario 1: No Invitations**
- **Welcome Screen Component**: Create `/app/onboarding/welcome/page.tsx` - Clean landing page with "Create new workspace" button using shadcn Card and Button components
- **Create Workspace Form**: Create `/app/onboarding/create/page.tsx` - Organization setup form with React Hook Form + Zod validation

**Scenario 2: Has Pending Invitations** 
- **Choice Screen Component**: Create `/app/onboarding/choice/page.tsx` - Shows pending invitations with accept/create options
- **Multiple Invitations Display**: Support rendering multiple invitations with organization details
- **Invitation Acceptance Logic**: Integration with existing invitation APIs to accept and join organizations

**Scenario 3: Token-based Registration**
- **Registration Form Enhancement**: Improve existing `/app/onboarding/join/page.tsx?token=XXX` flow with cleaner UI matching Figma designs
- **Success Screen Component**: Create confirmation screen with auto-redirect functionality

### Backend Requirements

- **Organization Creation API**: New endpoint `/api/organizations/create` that creates organization and assigns user as admin in `user_organizations` table
- **Onboarding Detection Logic**: API endpoint `/api/onboarding/status` to determine which scenario applies based on user state
- **Pending Invitations API**: Enhanced `/api/invitations/pending` to fetch user's pending invitations with organization details
- **Invitation Acceptance API**: Update existing invitation acceptance to work with new UI flows

### Integration Points

- **Authentication Middleware**: Update middleware to route users to appropriate onboarding scenario
- **Database Compatibility**: Ensure all flows work with existing `user_organizations`, `invitations`, and `organizations` tables
- **Priority Logic**: Implement direct link priority over pending invitations as specified
- **RLS Policies**: Maintain existing row-level security for all database operations

### Technical Stack Integration

- **UI Components**: Use existing shadcn components (Button, Card, Form, Input, Textarea, Select) for design consistency
- **State Management**: React Query for API calls and form state management with optimistic updates
- **Validation**: Zod schemas for all form validation with TypeScript integration
- **Error Handling**: Comprehensive error states for network failures and validation errors
- **Loading States**: Loading spinners and disabled states during async operations
- **Responsive Design**: Mobile-first responsive design using Tailwind CSS classes
- **Internationalization**: Polish and English support using next-intl for all onboarding text
- **TypeScript**: Full TypeScript support with proper types for all onboarding flows