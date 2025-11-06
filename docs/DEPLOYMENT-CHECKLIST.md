# Deployment Checklist - Time8

## Overview

This checklist ensures all components of the Time8 platform are properly configured and tested before deploying to staging or production environments.

**Deployment Types:**
- **Production**: Full deployment with all features enabled
- **Staging**: Testing environment mirroring production
- **Preview**: Temporary deployment for feature branches

---

## Pre-Deployment Checklist

### 1. Code Quality ✅

- [ ] All tests passing locally (`npm test`)
- [ ] Build successful (`npm run build`)
- [ ] No TypeScript errors (`npx tsc --noEmit`)
- [ ] No ESLint warnings in critical files
- [ ] Git branch is up-to-date with main
- [ ] All commits follow conventional commit format
- [ ] Pull request approved by at least 1 reviewer

### 2. Database Migrations ✅

- [ ] All migrations tested locally
- [ ] Migrations are idempotent (can run multiple times safely)
- [ ] Backup of production database created (if production deployment)
- [ ] Migration files sequentially numbered
- [ ] RLS policies updated if schema changes
- [ ] Indexes created for new foreign keys
- [ ] Migration rollback plan documented

**Run migrations:**
```bash
# Via Supabase CLI
supabase db push

# Or via Supabase MCP (recommended)
# Use the mcp__supabase__apply_migration tool
```

### 3. Environment Variables ✅

**Required Variables (All Environments):**
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `NEXT_PUBLIC_APP_URL` (correct environment URL)
- [ ] `LEMONSQUEEZY_API_KEY`
- [ ] `LEMONSQUEEZY_STORE_ID`
- [ ] `LEMONSQUEEZY_WEBHOOK_SECRET`
- [ ] `LEMONSQUEEZY_MONTHLY_VARIANT_ID`
- [ ] `LEMONSQUEEZY_YEARLY_VARIANT_ID`
- [ ] `RESEND_API_KEY`

**Optional Variables (Production Only):**
- [ ] `SLACK_WEBHOOK_URL` (for critical alerts)
- [ ] `ADMIN_ALERT_EMAIL` (comma-separated list)
- [ ] `ENABLE_BACKGROUND_JOBS=false` (until Vercel cron configured)
- [ ] `ENABLE_CRITICAL_ALERTS=true`

**Verify in Vercel:**
1. Go to Project Settings → Environment Variables
2. Check all required variables are set for production
3. Verify no `.env.local` secrets committed to repo

### 4. External Services ✅

**Supabase:**
- [ ] Database accessible from Vercel IPs
- [ ] RLS policies enabled on all tables
- [ ] Service role key stored securely
- [ ] Connection pooling enabled
- [ ] Automatic backups configured (daily)

**Lemon Squeezy:**
- [ ] Webhook endpoint configured: `https://time8.io/api/webhooks/lemonsqueezy`
- [ ] Webhook secret matches `LEMONSQUEEZY_WEBHOOK_SECRET`
- [ ] Test mode disabled (production only)
- [ ] Product variants exist (monthly/yearly)
- [ ] Pricing configured correctly

**Resend:**
- [ ] Domain verified (time8.io)
- [ ] SPF/DKIM records configured
- [ ] From email verified
- [ ] API key has correct permissions
- [ ] Email templates tested

**Slack (Optional):**
- [ ] Webhook URL configured in alerts channel
- [ ] Test alert sent successfully
- [ ] Channel notifications enabled

---

## Deployment Steps

### Staging Deployment

**1. Deploy to Staging**
```bash
git checkout staging
git merge main
git push origin staging
```

**2. Verify Deployment**
- [ ] Vercel deployment successful
- [ ] Application loads at staging URL
- [ ] Database migrations applied
- [ ] No console errors in browser

**3. Smoke Tests**
Run through critical user flows:

- [ ] **Authentication**
  - [ ] Login with email/password works
  - [ ] Login with Google OAuth works
  - [ ] Logout works
  - [ ] Password reset flow works

- [ ] **Organization Management**
  - [ ] Create new organization works
  - [ ] Invite user via email works
  - [ ] Existing user invitation works
  - [ ] User accepts invitation successfully

- [ ] **Leave Requests**
  - [ ] Create leave request works
  - [ ] Approve leave request works
  - [ ] Reject leave request works
  - [ ] Cancel leave request works
  - [ ] Overlap detection shows warnings

- [ ] **Seat Management** (NEW)
  - [ ] Remove user → status = `pending_removal`
  - [ ] Reactivate pending_removal user works
  - [ ] User retains access during grace period
  - [ ] `pending_seats` calculated correctly
  - [ ] Admin dashboard shows sync status

- [ ] **Billing**
  - [ ] Subscription status displays correctly
  - [ ] Trial countdown shows if on trial
  - [ ] Upgrade CTA visible and functional
  - [ ] Customer portal link works

**4. Integration Tests**
```bash
npm test -- __tests__/seat-management
npm test -- __tests__/billing
```

All tests should pass (24 seat management + 71 billing = 95+ tests)

**5. Webhook Testing**

Send test webhooks from Lemon Squeezy dashboard:
- [ ] `subscription_created` processes correctly
- [ ] `subscription_payment_success` processes correctly
- [ ] `subscription_payment_failed` updates status
- [ ] `subscription_cancelled` updates status

Check webhook logs:
```bash
# View webhook processing logs
curl https://staging.time8.io/api/webhooks/lemonsqueezy \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**6. Background Jobs** (When Enabled)

⚠️ **NOTE**: Background jobs are currently disabled. Skip this section until Vercel Cron is configured.

Once enabled:
- [ ] Trigger `apply-pending-subscription-changes` manually
- [ ] Trigger `reconcile-subscriptions` manually
- [ ] Verify job execution in billing_events table
- [ ] Check for any critical alerts created

```bash
# Manually trigger jobs via API
curl -X POST https://staging.time8.io/api/cron/apply-pending-subscription-changes \
  -H "Authorization: Bearer $CRON_SECRET"

curl -X POST https://staging.time8.io/api/cron/reconcile-subscriptions \
  -H "Authorization: Bearer $CRON_SECRET"
```

---

### Production Deployment

**Pre-Production Checklist:**
- [ ] All staging tests passed
- [ ] No critical bugs in staging
- [ ] Staging has been live for at least 24 hours
- [ ] Database backup created
- [ ] Rollback plan documented
- [ ] On-call engineer identified
- [ ] Deployment scheduled during low-traffic window

**1. Final Verification**
```bash
# Run full test suite one more time
npm test

# Verify build
npm run build

# Check for any remaining TODOs or console.logs
grep -r "console.log" app/ components/ lib/
grep -r "TODO" app/ components/ lib/
```

**2. Deploy to Production**
```bash
git checkout main
git pull origin main
git push origin main  # Auto-deploys to production via Vercel
```

**3. Monitor Deployment**

Watch Vercel deployment logs:
- [ ] Build completes successfully
- [ ] No errors during deployment
- [ ] Health check passes
- [ ] Application accessible at https://time8.io

**4. Post-Deployment Verification (15 min)**

**Critical Paths:**
- [ ] Homepage loads
- [ ] Login works
- [ ] Dashboard loads for existing users
- [ ] Leave request creation works
- [ ] Admin settings accessible
- [ ] Billing page shows correct data

**Database Checks:**
```sql
-- Verify migrations applied
SELECT * FROM supabase_migrations
ORDER BY version DESC
LIMIT 5;

-- Check for critical alerts
SELECT * FROM alerts
WHERE severity = 'critical'
AND resolved_at IS NULL;

-- Verify seat management columns exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'subscriptions'
AND column_name IN ('current_seats', 'pending_seats', 'lemonsqueezy_quantity_synced');

-- Verify user_organization_status enum
SELECT enum_range(NULL::user_organization_status);
-- Should return: {active,pending_removal,archived}
```

**5. External Service Verification**

- [ ] **Lemon Squeezy Webhooks**
  - Check recent webhook deliveries in LS dashboard
  - Verify all webhooks processed successfully (200 responses)

- [ ] **Email Delivery**
  - Send test notification email
  - Verify delivery within 1 minute

- [ ] **Slack Alerts** (if configured)
  - Send test alert: `POST /api/admin/test-alert`
  - Verify message appears in #time8-alerts channel

**6. Monitoring (First 24 Hours)**

**Hour 1: Active Monitoring**
- [ ] Watch error logs in Vercel dashboard
- [ ] Monitor Supabase database metrics
- [ ] Check webhook delivery success rate
- [ ] Verify no critical alerts generated

**Hour 4: First Check-in**
- [ ] Review Sentry error reports (if configured)
- [ ] Check for any user-reported issues
- [ ] Verify billing events table for anomalies
- [ ] Run reconciliation query manually

**Hour 24: Final Verification**
- [ ] All systems operational
- [ ] No critical alerts
- [ ] Webhook success rate > 99%
- [ ] No billing discrepancies detected

---

## Rollback Procedure

If critical issues are discovered post-deployment:

**Immediate Rollback (< 5 min):**
```bash
# In Vercel dashboard
1. Go to Deployments
2. Find previous stable deployment
3. Click "..." → "Promote to Production"
```

**Database Rollback (if migrations were applied):**
```sql
-- Only if you have a rollback migration prepared
-- Example: Rolling back seat management changes
BEGIN;

-- Revert table changes
ALTER TABLE subscriptions DROP COLUMN IF EXISTS current_seats;
ALTER TABLE subscriptions DROP COLUMN IF EXISTS pending_seats;
-- ... (rest of rollback SQL)

COMMIT;
```

⚠️ **WARNING**: Database rollbacks can cause data loss. Always create backup before rollback.

**Post-Rollback:**
- [ ] Verify application is functional
- [ ] Post incident report in Slack #time8-dev
- [ ] Document root cause
- [ ] Schedule fix and re-deployment

---

## Background Jobs Setup (Future)

⚠️ **Currently Disabled** - Skip this section until Vercel Cron is configured.

Once Vercel Cron is properly configured:

**1. Configure Vercel Cron**

In Vercel dashboard → Project → Settings → Cron Jobs:

Add two cron jobs:

**Job 1: Apply Pending Subscription Changes**
- Path: `/api/cron/apply-pending-subscription-changes`
- Schedule: `0 */6 * * *` (every 6 hours)
- Description: Updates Lemon Squeezy subscription quantities before renewal

**Job 2: Reconcile Subscriptions**
- Path: `/api/cron/reconcile-subscriptions`
- Schedule: `0 3 * * *` (daily at 3 AM)
- Description: Verifies database vs Lemon Squeezy seat counts

**2. Verify Cron Secret**

Vercel automatically generates `CRON_SECRET` environment variable. Verify it exists:
- [ ] Go to Environment Variables
- [ ] Check `CRON_SECRET` is set
- [ ] Value is auto-generated by Vercel

**3. Enable Background Jobs**

Update environment variable:
```bash
ENABLE_BACKGROUND_JOBS=true
```

**4. Restore Cron Job Files**

Restore the following files (currently removed):
- `app/api/cron/apply-pending-subscription-changes/route.ts`
- `app/api/cron/reconcile-subscriptions/route.ts`
- `__tests__/cron/apply-pending-subscription-changes.test.ts`
- `__tests__/cron/reconcile-subscriptions.test.ts`

**5. Test Cron Jobs**

```bash
# Manually trigger to verify
curl -X POST https://time8.io/api/cron/apply-pending-subscription-changes \
  -H "Authorization: Bearer $CRON_SECRET"

# Check billing_events table for success
```

**6. Monitor First 7 Days**

- [ ] Jobs run on schedule (check billing_events table)
- [ ] No critical alerts generated
- [ ] Lemon Squeezy updates successful
- [ ] Reconciliation finds no discrepancies

---

## Post-Deployment Tasks

**Immediately After:**
- [ ] Update tasks.md to mark deployment tasks complete
- [ ] Update roadmap.md to mark Phase 2.10 complete
- [ ] Post deployment announcement in #time8-general
- [ ] Send email to beta users about new features

**Within 1 Week:**
- [ ] Monitor for billing accuracy
- [ ] Review user feedback
- [ ] Check for edge cases
- [ ] Document any learnings

**Within 1 Month:**
- [ ] Configure Vercel Cron and enable background jobs
- [ ] Restore cron job files from commit fb516aa
- [ ] Full end-to-end test of grace period system
- [ ] Review alert patterns and optimize thresholds

---

## Emergency Contacts

**Deployment Issues:**
- Primary: Simon (you)
- Backup: Szymon Rajca (szymon.rajca@bb8.pl)

**External Service Issues:**
- Vercel Support: https://vercel.com/help
- Supabase Support: support@supabase.com
- Lemon Squeezy Support: support@lemonsqueezy.com
- Resend Support: support@resend.com

**Slack Channels:**
- `#time8-deployments` - Deployment notifications
- `#time8-alerts` - Critical alerts
- `#time8-dev` - General development

---

## Additional Resources

- [README.md](../README.md) - Full project documentation
- [RUNBOOK-CRITICAL-ALERTS.md](./RUNBOOK-CRITICAL-ALERTS.md) - Alert response procedures
- [.env.example](../.env.example) - Environment variable reference
- [Roadmap](.agent-os/product/roadmap.md) - Feature roadmap

---

*Last updated: 2025-11-05*
*Next review: After first production deployment of Phase 2.10*
