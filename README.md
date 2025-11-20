# Time8 - Smart Leave Management Platform

Time8 is a SaaS leave management platform that helps small and medium-sized companies (3+ employees) optimize team availability and track holidays with streamlined multi-organization leave management and smart scheduling capabilities.

Unlike traditional HR software with complex enterprise features, Time8 provides essential leave management with native multi-organization support and a freemium model that scales from 3 users to enterprise teams.

## Features

### Core Leave Management
- **Leave Request Workflow** - Complete submission to approval process with Polish and English support
- **Leave Balance Tracking** - Real-time balance tracking with admin controls
- **Multi-Organization Support** - Native multi-tenant architecture for managing multiple workspaces
- **Holiday Calendar** - Polish holidays integration with custom holiday support
- **Email Notifications** - Professional email templates via Resend integration

### Advanced Scheduling
- **Team Calendar** - Visual calendar showing team availability and leave requests
- **Work Schedule Configuration** - Customizable working days, hours, and holiday handling per organization
- **Work Schedule Templates** - Configurable work patterns and schedules
- **Overlap Detection** - Proactive warnings when multiple team members request overlapping leave
- **Smart Availability** - Real-time team availability tracking

### Permission System
- **Three-Tier Roles** - Normal User (Pracownik), Manager (Kierownik), Administrator
- **Manager Capabilities** - READ-ONLY access to Team/Groups pages, leave request management
- **Admin Controls** - Full CRUD operations on users, groups, leave types, and settings
- **Granular Calendar Visibility** - Control who can see which calendars based on group membership

### Subscription & Billing
- **Seat-Based Subscriptions** - Pay only for active team members via Lemon Squeezy
- **Two-Product Architecture** - Separate products for monthly (621389) and yearly (693341) billing
- **Monthly↔Yearly Switching** - Seamless upgrade from monthly to yearly with seat preservation
- **Grace Period System** - Users marked for removal retain access until next billing cycle
- **Automatic Billing Sync** - Multi-layer billing guarantees ensure accurate charges
- **Flexible Plans** - Free tier (3 seats) and paid plans with volume pricing (4+ seats)

### Recent Enhancements
- **React Query Migration** - Real-time data synchronization across all pages
- **In-App Notifications** - Bell icon notifications for leave request updates
- **Database Optimization** - Sub-second query times with materialized views and optimized indexes
- **Comprehensive Testing** - 200+ integration tests covering all critical flows

## Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **UI Library**: Shadcn UI + Tailwind CSS 4.0
- **Icons**: Lucide React
- **State Management**: React Query (TanStack Query)
- **Internationalization**: next-intl (Polish/English)

### Backend
- **Database**: PostgreSQL 17 (Supabase)
- **Authentication**: Supabase Auth with Google OAuth
- **Email**: Resend API
- **Billing**: Lemon Squeezy
- **Background Jobs**: Vercel Cron (scheduled tasks)

### Infrastructure
- **Hosting**: Vercel
- **Database Hosting**: Supabase
- **Asset Storage**: Vercel (public assets)
- **CI/CD**: GitHub Actions
- **Monitoring**: Supabase Advisory System

## Getting Started

### Prerequisites
- Node.js 22 LTS or higher
- npm or yarn package manager
- Supabase account
- Lemon Squeezy account (for billing features)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd saas-leave-system
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables (see [Environment Variables](#environment-variables))

4. Run database migrations:
```bash
npm run migrate
```

5. Start the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

### Environment Variables

Create a `.env.local` file in the project root with the following variables:

#### Required - Supabase
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

#### Required - Authentication
```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

#### Required - Lemon Squeezy (Billing)
```bash
LEMONSQUEEZY_API_KEY=your_lemonsqueezy_api_key
LEMONSQUEEZY_STORE_ID=your_store_id
LEMONSQUEEZY_WEBHOOK_SECRET=your_webhook_secret

# Two-Product Architecture (Monthly vs Yearly)
LEMONSQUEEZY_MONTHLY_PRODUCT_ID=621389
LEMONSQUEEZY_YEARLY_PRODUCT_ID=693341
LEMONSQUEEZY_MONTHLY_VARIANT_ID=972634
LEMONSQUEEZY_YEARLY_VARIANT_ID=1090954
```

#### Required - Email (Resend)
```bash
RESEND_API_KEY=your_resend_api_key
```

#### Optional - Critical Alerts
```bash
SLACK_WEBHOOK_URL=your_slack_webhook_url
ADMIN_ALERT_EMAIL=admin@yourcompany.com
```

See `.env.example` for a complete list of all environment variables.

## Seat Management with Grace Periods

Time8 implements a sophisticated seat-based subscription system with user grace periods to ensure fair billing and smooth user experience.

### How It Works

1. **User Removal Request**
   - Admin marks user as `pending_removal` (not immediately deleted)
   - User retains access until next subscription renewal date
   - `pending_seats` count is calculated (future seat count after renewal)
   - Subscription marked as out-of-sync with Lemon Squeezy

2. **Proactive Billing Update** (24-48h before renewal)
   - Background job runs every 6 hours checking for renewals
   - Updates Lemon Squeezy subscription quantity 1-2 days in advance
   - Ensures customer is charged correctly at next renewal

3. **Renewal Processing** (at subscription renewal)
   - Webhook receives `subscription_payment_success` event
   - Users with `pending_removal` status are archived
   - `current_seats` updated to match `pending_seats`
   - `pending_seats` cleared, subscription marked as synced

4. **User Reactivation**
   - Admins can reactivate `pending_removal` users before renewal (no charge)
   - Admins can reactivate `archived` users after renewal (increases next bill)
   - Seat availability checks prevent over-subscription

### Multi-Layer Billing Guarantees

1. **Layer 1**: Proactive update 24h before renewal (scheduled job)
2. **Layer 2**: Webhook confirmation at renewal
3. **Layer 3**: Daily reconciliation job (verifies DB vs Lemon Squeezy)
4. **Layer 4**: Admin dashboard monitoring (visual indicators)
5. **Layer 5**: Critical alerts for discrepancies (Slack + email)

### Database Architecture

#### Key Tables
- `subscriptions` - Tracks current_seats, pending_seats, sync status
- `user_organizations` - User status enum (active, pending_removal, archived)
- `alerts` - Billing discrepancy alerts with severity levels

#### Key Columns
- `current_seats` - Current billed seat count (unchanged during grace period)
- `pending_seats` - Future seat count after pending removals applied
- `removal_effective_date` - Date when user will be archived (subscription renewal date)
- `lemonsqueezy_quantity_synced` - Flag indicating if Lemon Squeezy has been updated

### API Endpoints

- `GET /api/admin/pending-changes` - List users pending removal
- `POST /api/admin/cancel-removal/:userId` - Reactivate pending_removal user
- `POST /api/admin/reactivate-user/:userId` - Reactivate archived user
- `POST /api/cron/apply-pending-subscription-changes` - Background job (runs every 6h)
- `POST /api/cron/reconcile-subscriptions` - Reconciliation job (runs daily at 3 AM)

### Background Jobs

**Note**: Background jobs are currently disabled until Vercel Cron is configured. See [Roadmap](#roadmap) for details.

Once enabled, the system runs two automated background jobs:

1. **ApplyPendingSubscriptionChangesJob** (every 6 hours)
   - Finds subscriptions renewing in next 24-48 hours
   - Updates Lemon Squeezy subscription quantities
   - Logs all API calls and outcomes

2. **ReconcileSubscriptionsJob** (daily at 3 AM)
   - Compares database seat counts vs Lemon Squeezy
   - Creates critical alerts for discrepancies
   - Sends Slack/email notifications to admins

## Two-Product Migration (Monthly ↔ Yearly Billing)

Time8 uses a two-product architecture in Lemon Squeezy to enable monthly→yearly billing period upgrades. This works around LemonSqueezy's platform limitation that prevents switching between usage-based (monthly) and non-usage-based (yearly) variants within the same product.

### Architecture

**Two Separate Products:**
- **Monthly Product (ID: 621389)** - Usage-based billing with variant 972634
- **Yearly Product (ID: 693341)** - Quantity-based billing with variant 1090954

**Why Two Products:**
LemonSqueezy API returns 422 error when attempting to switch from usage-based to non-usage-based variants. By using separate products, we can cancel the monthly subscription and create a new yearly subscription with preserved seat counts.

### Pricing Model: Volume (Not Graduated)

**Critical Configuration:**
Both variants use **volume pricing** (not graduated):
- Free tier: 1-3 seats = 0 PLN
- Paid tier: 4+ seats = ALL seats charged at same rate
- Volume pricing charges: `total_seats × rate`
- Graduated would incorrectly charge: `(tier1_seats × rate1) + (tier2_seats × rate2)`

**Per-Seat Rates:**
- Monthly: 10 PLN/month per seat
- Yearly: 96 PLN/year per seat (20% discount)

### Monthly → Yearly Upgrade Flow

1. **User Initiates Upgrade**
   - Navigate to `/onboarding/update-subscription`
   - Select yearly billing period
   - System preserves current seat count

2. **API Creates Checkout**
   - `POST /api/billing/switch-to-yearly`
   - Creates new checkout with `preserve_seats` in custom_data
   - Redirects to LemonSqueezy payment page

3. **Webhook Processes Payment**
   - `subscription_created` webhook fires
   - Extracts `preserve_seats` from custom_data
   - Creates new yearly subscription with preserved seats
   - Cancels old monthly subscription via API
   - Updates database: old subscription marked as `status='migrated'`

4. **Database State After Migration**
   - New subscription: `billing_period='yearly'`, `status='active'`
   - Old subscription: `status='migrated'`, `migrated_to_subscription_id` set
   - UI filters out migrated subscriptions

### Yearly → Monthly: Blocked Until Renewal

**Policy:** Yearly→monthly downgrades are NOT allowed until subscription renewal.

**Reason:** Users have prepaid for annual period. Honoring prepayment by blocking mid-period downgrades.

**UI Behavior:**
- Monthly pricing card shown but locked/disabled
- Lock icon with tooltip: "Available after [renewal_date]"
- Banner message explains one-way upgrade policy

### Free Tier Logic

**Seat Count Rules:**
- Free tier: 1-3 seats (no subscription required)
- Paid tier: 4+ seats (LemonSqueezy subscription required)
- Free tier users upgrading to paid: MUST select 4+ seats
- Paid users can reduce to 3 seats (triggers free tier)

**Validation:**
- Frontend prevents free tier checkout with < 4 seats
- Backend `/api/billing/create-checkout` validates minimum 4 seats
- Active user count prevents reducing below occupied seats

### Database Schema

**Key Columns Added:**
- `subscriptions.lemonsqueezy_product_id` - Tracks which product (monthly/yearly)
- `subscriptions.billing_period` - Enum: 'monthly' | 'yearly' | null
- `subscriptions.migrated_to_subscription_id` - Links old→new during migration
- `subscriptions.status` - Added 'migrated' enum value

**Migration Files:**
- `20251114_add_product_tracking.sql` - Added product_id and billing_period
- `20251114_add_migration_tracking.sql` - Added migrated_to_subscription_id
- `20251119_drop_work_mode_column.sql` - Cleaned up deprecated column

### API Endpoints

- `POST /api/billing/switch-to-yearly` - Initiates monthly→yearly migration
- `POST /api/billing/create-checkout` - Creates LemonSqueezy checkout
- `POST /api/billing/update-subscription-quantity` - Adjusts seat count
- `GET /api/billing/subscription` - Fetches subscription (filters migrated)
- `POST /api/webhooks/lemonsqueezy` - Processes subscription webhooks

### Webhook Events

**Handled Events:**
- `subscription_created` - New subscription (including migrations)
- `subscription_updated` - Seat changes, renewals
- `subscription_cancelled` - User cancellation
- `subscription_expired` - End of subscription period
- `subscription_paused` / `subscription_resumed` - Pause/resume handling
- `subscription_payment_success` / `subscription_payment_failed` - Payment events

### Testing Migration Flow

**Prerequisites:**
1. Monthly subscription with N seats
2. All environment variables configured
3. Webhook endpoint accessible

**Test Steps:**
1. Navigate to `/onboarding/update-subscription?seats=N`
2. Select yearly billing period
3. Click "Zaktualizuj subskrypcję"
4. Complete LemonSqueezy checkout
5. Verify webhook received and processed
6. Check database: old subscription marked 'migrated'
7. Check UI: Only yearly subscription visible

**Expected Results:**
- ✅ Seat count preserved (N seats on yearly)
- ✅ Monthly subscription cancelled
- ✅ Yearly subscription active
- ✅ Database shows single active subscription
- ✅ UI shows correct billing period and seats

### Rollback Plan

**If Migration Fails:**

1. **Identify Failed Subscription** (in Lemon Squeezy dashboard)
   - Check webhook logs in `/api/webhooks/lemonsqueezy`
   - Find subscription ID that failed to process

2. **Database Rollback:**
   ```sql
   -- Restore old subscription
   UPDATE subscriptions
   SET status = 'active'
   WHERE lemonsqueezy_subscription_id = 'OLD_SUB_ID';

   -- Remove failed new subscription
   DELETE FROM subscriptions
   WHERE lemonsqueezy_subscription_id = 'NEW_SUB_ID';
   ```

3. **Cancel New Subscription** (via Lemon Squeezy API or dashboard)
   - DELETE `/v1/subscriptions/{id}`
   - User reverts to monthly billing

4. **User Communication:**
   - Notify user of failed migration
   - Confirm monthly subscription still active
   - Offer manual migration assistance

### Production Verification Checklist

After deploying to production, verify:

- [ ] Environment variables set (product IDs, variant IDs)
- [ ] Webhook endpoint receiving events
- [ ] Monthly→yearly migration works end-to-end
- [ ] Yearly→monthly is blocked with clear messaging
- [ ] Free tier users see validation error at < 4 seats
- [ ] Paid users can reduce to 3 seats (free tier UI)
- [ ] Migrated subscriptions hidden from UI
- [ ] Database status tracking accurate
- [ ] Seat counts preserved through migration

## Work Schedule Configuration

Time8 allows each organization to customize their work schedule, including working days, work hours, and holiday handling. This configuration affects how calendars display working vs. non-working days and what hours are shown for each working day.

### Features

- **Customizable Working Days** - Select any combination of weekdays (Monday-Sunday)
- **Flexible Work Hours** - Set daily start and end times (e.g., 08:30 - 16:45)
- **Holiday Handling** - Choose whether public holidays are treated as working or non-working days
- **Multi-Shift Support** - Foundation for future shift-based scheduling (UI preview available)

### How It Works

#### Database Schema

The `organizations` table includes the following work schedule columns:

- `working_days` - Array of weekday names (e.g., `['monday', 'tuesday', 'wednesday', 'thursday', 'friday']`)
- `exclude_public_holidays` - Boolean flag (default: `true`) controlling holiday treatment
- `daily_start_time` - Daily work start time in HH:MM format (default: `09:00`)
- `daily_end_time` - Daily work end time in HH:MM format (default: `17:00`)
- `work_schedule_type` - Either `'daily'` or `'multi_shift'` (default: `'daily'`)
- `shift_count` - Number of shifts (1-3, default: 1)
- `work_shifts` - JSONB array of shift definitions with `label`, `start_time`, and `end_time`

#### API Endpoint

**`POST /api/admin/settings/work-mode`**

Updates organization work schedule configuration.

Request payload:
```json
{
  "working_days": ["monday", "tuesday", "wednesday", "thursday", "friday"],
  "exclude_public_holidays": true,
  "work_schedule_type": "daily",
  "daily_start_time": "08:30",
  "daily_end_time": "17:00"
}
```

Multi-shift payload example:
```json
{
  "working_days": ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"],
  "exclude_public_holidays": false,
  "work_schedule_type": "multi_shift",
  "shift_count": 2,
  "work_shifts": [
    { "label": "Morning", "start_time": "06:00", "end_time": "14:00" },
    { "label": "Afternoon", "start_time": "14:00", "end_time": "22:00" }
  ]
}
```

#### Validation Rules

- **Working Days**: Must be valid weekday names (lowercase), at least one day required
- **Work Hours**: Must be in HH:MM format (24-hour), start time must be before end time
- **Shift Configuration**:
  - Maximum 3 shifts
  - Each shift must have valid start/end times with start < end
  - Shifts cannot overlap in time
  - `shift_count` must match number of provided shifts

#### Admin UI

Admins can configure work schedules via the "Tryb pracy" tab in Settings:

1. **Dni pracujące (Working Days)**
   - Select working days via clickable day chips
   - Toggle "Wolne święta państwowe" to control holiday behavior
   - Changes save optimistically with server validation

2. **Godziny pracy (Work Hours)**
   - Daily mode: Set start and end times with 15-minute granularity
   - Shift mode: Preview UI for future multi-shift support (coming soon)

#### Calendar Integration

Work schedule configuration affects:

- **Dashboard Card** - Shows current day's work hours or "Nie pracujemy" for non-working days
- **Calendar Grid** - Displays work hours for each working day
- **Holiday Display** - Shows holiday names when `exclude_public_holidays` is true, otherwise shows work hours
- **Weekend Handling** - Weekends marked as non-working unless included in `working_days`

#### Testing

Work schedule functionality is covered by comprehensive test suites:

```bash
# API validation tests
npm test -- __tests__/api/admin/work-mode-validation.test.ts

# Component tests
npm test -- __tests__/components/admin/EditWorkingDaysSheet.test.tsx

# Calendar logic tests
npm test -- __tests__/components/calendar/calendar-day-status.test.ts
```

Tests cover:
- Working days validation (valid days, duplicates, invalid names)
- Time format validation (HH:MM format, start < end)
- Holiday toggle behavior
- Multi-shift validation (overlaps, shift count limits)
- Calendar day status computation based on configuration

## Testing

### Run All Tests
```bash
npm test
```

### Run Specific Test Suites
```bash
# Seat management tests (24 tests)
npm test -- __tests__/seat-management

# Billing tests
npm test -- __tests__/billing

# Multi-organization tests
npm test -- __tests__/multi-organization
```

### Test Coverage
- **Total Tests**: 240+ integration tests
- **Seat Management**: 24 E2E tests (grace periods, reactivation, webhook processing)
- **Billing**: 71 tests (subscriptions, webhooks, payments)
- **Multi-Organization**: 18 tests (isolation, access control)
- **Leave Management**: 127 tests (requests, balances, approvals)

## Database Migrations

Migrations are located in `supabase/migrations/` and run automatically on deployment.

### Run Migrations Locally
```bash
# Via Supabase CLI
supabase db push

# Or manually via SQL
psql <connection-string> -f supabase/migrations/<migration-file>.sql
```

### Key Migrations
- `20251104000000_add_seat_management_to_subscriptions.sql` - Seat tracking columns
- `20251104000001_add_seat_management_to_user_organizations.sql` - User lifecycle statuses
- `20251104000002_create_alerts_table.sql` - Billing alerts system
- `20251027000000_add_composite_indexes_for_scale.sql` - Performance optimization
- `20251027121508_optimize_rls_auth_calls.sql` - RLS policy optimization

## Deployment

### Vercel Deployment

The application is configured for automatic deployment on Vercel:

1. **Push to main branch** - Automatically deploys to production
2. **Push to other branches** - Creates preview deployments

### Environment Setup

Ensure all environment variables are configured in Vercel project settings:
- Navigate to Project Settings → Environment Variables
- Add all required variables (see [Environment Variables](#environment-variables))
- Configure production, preview, and development environments separately

### Post-Deployment Checklist

- [ ] Verify environment variables are set
- [ ] Run database migrations
- [ ] Test Lemon Squeezy webhook endpoint
- [ ] Configure Vercel Cron jobs (when ready)
- [ ] Verify email sending works (Resend)
- [ ] Test Google OAuth login
- [ ] Monitor error logs for 24 hours
- [ ] Verify seat management flows work end-to-end

## Architecture

### Multi-Tenancy
Time8 uses a **native multi-tenant architecture** where all organizations share the same database tables with Row Level Security (RLS) policies enforcing data isolation.

**Key Principles:**
- Single database for all organizations
- `organization_id` foreign key on all tenant-scoped tables
- Supabase RLS policies enforce data isolation
- Admin client bypasses RLS for internal operations
- Application-level authorization via `authenticateAndGetOrgContext()`

### Authentication Flow
1. User logs in via Supabase Auth (email/password or Google OAuth)
2. Middleware checks auth status and redirects unauthenticated users
3. `authenticateAndGetOrgContext()` utility verifies organization membership
4. User's active organization stored in session
5. All API requests validated against active organization

### Data Fetching Strategy
- **Server Components**: Direct database queries with `createClient()` (RLS-enforced)
- **Client Components**: React Query hooks with API routes
- **Admin Operations**: `createAdminClient()` bypasses RLS (use with caution)
- **Real-time Updates**: React Query cache invalidation on mutations

### Performance Optimizations
- Composite indexes on frequently queried columns
- Materialized views for aggregations (seat counts, leave summaries)
- RLS policy optimization (single auth function evaluation per query)
- React Query caching with smart invalidation
- Supabase connection pooling

## Roadmap

### Phase 2.10 (Current) - Seat Management with Grace Periods 🚧
- [x] Database schema extensions
- [x] Background jobs infrastructure ⚠️ (temporarily removed until Vercel cron configured)
- [x] Lemon Squeezy API integration
- [x] Webhook handler enhancements
- [x] User management logic
- [x] Integration testing (24/24 tests passing)
- [ ] Alert service (Slack + email)
- [ ] Admin UI components
- [ ] API endpoints for admin actions
- [ ] Documentation and deployment

### Phase 3 - Design System Implementation 🎨
- [x] Figma integration and design tokens
- [x] Global design system unification
- [x] Sidebar navigation redesign
- [x] Authentication pages redesign
- [ ] Leave request sheet redesign
- [ ] Complete UI overhaul (all pages)

### Phase 4 - Launch Preparation 🚀
- [ ] Mobile optimization and PWA support
- [ ] Help documentation
- [ ] Error monitoring setup
- [ ] Backup and recovery systems

### Phase 5 - Advanced Scheduling 📅
- [ ] Shift schedule management
- [ ] Schedule templates
- [ ] Calendar sync (Google/Outlook)

### Phase 6 - Enterprise Features 🏢
- [ ] Advanced reporting
- [ ] REST API for integrations
- [ ] SSO integration (SAML/OIDC)
- [ ] White-label options

See [roadmap.md](.agent-os/product/roadmap.md) for complete feature breakdown.

## Contributing

This is a private SaaS product. Contributions are limited to the core development team.

### Development Workflow
1. Create feature branch from `main`
2. Follow coding standards in [design-system.md](.agent-os/product/design-system.md)
3. Write tests for new features (aim for 80%+ coverage)
4. Ensure all tests pass: `npm test`
5. Create pull request for review
6. Squash and merge after approval

## Support

For issues or questions:
- **Internal Team**: Slack #time8-dev channel
- **Critical Production Issues**: Email admin@time8.io
- **Billing Issues**: Create alert via admin dashboard

## License

Proprietary - All rights reserved

---

Built with ❤️ using Next.js, TypeScript, Supabase, and Lemon Squeezy
