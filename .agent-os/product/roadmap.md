# Product Roadmap

## Phase 0: Already Completed ✅

**Goal:** Core leave management functionality with multi-organization support
**Success Criteria:** Users can create organizations, invite team members, submit/approve leave requests

### Features

- [x] **Authentication System** - Supabase Auth with Google OAuth integration `L`
- [x] **Multi-Organization Architecture** - Native multi-tenant data structure `XL`
- [x] **Leave Request Workflow** - Complete submission to approval process `L`
- [x] **Leave Balance Management** - Real-time balance tracking with admin controls `M`
- [x] **Team Invitation System** - Email-based invitations with role assignment `M`
- [x] **Admin Dashboard** - Comprehensive management interface `L`
- [x] **Holiday Calendar** - Polish holidays integration with custom support `M`
- [x] **Email Notifications** - Resend integration with professional templates `M`
- [x] **Internationalization** - Polish/English language support `S`

## Phase 1: Optimization & Cleanup (Current Priority) 🔧

**Goal:** Restore full functionality and optimize existing codebase
**Success Criteria:** All features working in multi-org context, deprecated code removed

### Features

- [x] **Database Cleanup** - Remove unnecessary tables and unused migrations `S`
- [x] **Theme Editor Removal** - Clean up deprecated design system components `S`
- [x] **Multi-Org Migration Fixes** - Restore broken functionality from pre-migration state `M`
- [x] **Performance Optimization** - RLS policy improvements and caching `M`
- [x] **Code Cleanup** - Remove backup files and unused components `S`

### Dependencies

- Complete multi-organization migration
- Identify all deprecated components

## Phase 2: Launch Preparation 🚀

**Goal:** Production-ready platform for first users
**Success Criteria:** Stable platform ready for user onboarding and feedback

### Features

- [ ] **User Onboarding Flow** - Streamlined signup and organization setup `M`
- [ ] **Data Migration Tools** - Import existing leave data from spreadsheets `L`
- [ ] **Mobile Optimization** - Enhanced mobile experience and PWA support `M`
- [ ] **Help Documentation** - User guides and support materials `M`
- [ ] **Error Monitoring** - Production monitoring and alerting `S`
- [ ] **Backup & Recovery** - Automated data backup systems `M`

### Dependencies

- Phase 1 optimization complete
- Testing with initial user group

## Phase 3: Advanced Scheduling 📅

**Goal:** Beyond 8-hour workdays with shift management
**Success Criteria:** Support for complex work schedules and shift patterns

### Features

- [ ] **Shift Schedule Management** - Custom work patterns beyond standard hours `XL`
- [ ] **Schedule Templates** - Reusable shift patterns and rotations `L`
- [ ] **Capacity Planning** - Advanced resource allocation and forecasting `L`
- [ ] **Schedule Automation** - Intelligent scheduling based on availability `XL`
- [ ] **Overtime Tracking** - Integration with leave for comprehensive time management `M`
- [ ] **Calendar Sync** - Two-way sync with Google Calendar/Outlook `L`

### Dependencies

- User feedback on current scheduling needs
- Core platform stability

## Phase 4: Subscription & Growth 💰

**Goal:** Monetization and scaling beyond free tier
**Success Criteria:** Sustainable revenue with smooth upgrade experience

### Features

- [ ] **Subscription System** - Stripe integration with tiered pricing `L`
- [ ] **Usage Analytics** - Track usage against subscription limits `M`
- [ ] **Billing Dashboard** - Self-service subscription management `M`
- [ ] **Feature Gating** - Premium features based on subscription tier `M`
- [ ] **Team Size Limits** - Enforce 3-user free tier with upgrade prompts `S`
- [ ] **Payment Recovery** - Failed payment handling and dunning `M`

### Dependencies

- Stripe vs alternative payment platform decision
- Pricing strategy validation

## Phase 5: Enterprise Features 🏢

**Goal:** Advanced features for larger organizations
**Success Criteria:** Support for 50+ employee organizations with complex needs

### Features

- [ ] **Advanced Reporting** - Compliance and utilization analytics `L`
- [ ] **API Access** - REST API for integrations `L`
- [ ] **SSO Integration** - SAML/OIDC for enterprise auth `L`
- [ ] **Custom Leave Types** - Flexible leave categories per organization `M`
- [ ] **Audit Trails** - Comprehensive activity logging `M`
- [ ] **Data Export** - Bulk data export and reporting `S`
- [ ] **White-label Options** - Custom branding for enterprise clients `XL`

### Dependencies

- Enterprise customer feedback
- Proven scale and stability