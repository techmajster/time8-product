# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-11-04-seat-based-subscription-grace-periods/spec.md

## Technical Requirements

### Architecture Pattern

**Source of Truth Hierarchy:**
1. YOUR DATABASE - Tracks current_seats, pending_seats, user status
2. YOUR APPLICATION - Enforces access control based on database
3. LEMON SQUEEZY - Handles billing only, updated by application

This pattern ensures grace periods work correctly since Lemon Squeezy has no native grace period tracking.

### Database Schema Changes

**subscriptions table modifications:**
```sql
ALTER TABLE subscriptions
  ADD COLUMN current_seats INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN pending_seats INTEGER,
  ADD COLUMN lemonsqueezy_quantity_synced BOOLEAN DEFAULT FALSE,
  ADD COLUMN lemonsqueezy_subscription_item_id TEXT;
```

**users table modifications:**
```sql
ALTER TABLE users
  ADD COLUMN removal_effective_date TIMESTAMPTZ;

-- Modify status enum to include new states
ALTER TYPE user_status ADD VALUE IF NOT EXISTS 'pending_removal';
ALTER TYPE user_status ADD VALUE IF NOT EXISTS 'archived';
```

### Background Jobs

**1. ApplyPendingSubscriptionChangesJob**
- **Schedule:** Every 6 hours (cron: `0 */6 * * *`)
- **Purpose:** Update Lemon Squeezy 24h before renewal
- **Logic:**
  ```typescript
  // Find subscriptions with pending changes renewing soon
  const subscriptions = await supabase
    .from('subscriptions')
    .select('*')
    .not('pending_seats', 'is', null)
    .gte('renews_at', new Date())
    .lte('renews_at', add(new Date(), { hours: 24 }));

  for (const sub of subscriptions) {
    // Update Lemon Squeezy
    await lemonSqueezy.updateSubscriptionItem({
      id: sub.lemonsqueezy_subscription_item_id,
      quantity: sub.pending_seats,
      disable_prorations: true
    });

    // Mark as synced
    await supabase
      .from('subscriptions')
      .update({ lemonsqueezy_quantity_synced: true })
      .eq('id', sub.id);
  }
  ```

**2. ReconcileSubscriptionsJob**
- **Schedule:** Daily at 3 AM (cron: `0 3 * * *`)
- **Purpose:** Verify database matches Lemon Squeezy
- **Logic:**
  ```typescript
  for (const subscription of activeSubscriptions) {
    const lsData = await lemonSqueezy.getSubscription(
      subscription.lemonsqueezy_subscription_id
    );

    const lsQuantity = lsData.subscription_items[0].quantity;
    const dbQuantity = subscription.current_seats;

    if (lsQuantity !== dbQuantity) {
      // Send critical alert
      await alertService.critical(
        `Subscription ${subscription.id} out of sync! ` +
        `LS: ${lsQuantity}, DB: ${dbQuantity}`
      );
    }
  }
  ```

### Webhook Handler Enhancements

**Extend `/app/api/webhooks/lemonsqueezy/handlers.ts`:**

```typescript
async function handleSubscriptionPaymentSuccess(payload) {
  const subscription = await getSubscription(payload.data.id);

  // Apply pending changes at renewal
  if (subscription.pending_seats !== null) {
    // Update current seats
    await supabase
      .from('subscriptions')
      .update({
        current_seats: subscription.pending_seats,
        pending_seats: null,
        lemonsqueezy_quantity_synced: false,
        renews_at: payload.data.attributes.renews_at
      })
      .eq('id', subscription.id);

    // Archive users marked for removal
    await supabase
      .from('users')
      .update({ status: 'archived' })
      .eq('organization_id', subscription.organization_id)
      .eq('status', 'pending_removal')
      .lte('removal_effective_date', new Date());

    console.log(`Archived users for subscription ${subscription.id}`);
  }
}
```

### API Endpoints

**No new REST endpoints required** - All operations use existing user management and webhook endpoints.

### Access Control Logic

**Update authorization checks:**

```typescript
// lib/auth/seat-limits.ts
export function canAddUser(organization: Organization): boolean {
  const activeAndPendingCount = organization.users.filter(
    u => u.status === 'active' || u.status === 'pending_removal'
  ).length;

  return activeAndPendingCount < organization.subscription.current_seats;
}

export function getAvailableSeats(organization: Organization): number {
  const activeAndPendingCount = organization.users.filter(
    u => u.status === 'active' || u.status === 'pending_removal'
  ).length;

  return organization.subscription.current_seats - activeAndPendingCount;
}
```

### User Management Flows

**Remove User:**
```typescript
async function removeUser(userId: string, organizationId: string) {
  const subscription = await getOrgSubscription(organizationId);

  // Mark user for removal
  await supabase
    .from('users')
    .update({
      status: 'pending_removal',
      removal_effective_date: subscription.renews_at
    })
    .eq('id', userId);

  // Calculate new seat count (exclude archived)
  const newSeatCount = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .in('status', ['active', 'pending_removal']);

  // Store pending change
  await supabase
    .from('subscriptions')
    .update({ pending_seats: newSeatCount.count })
    .eq('organization_id', organizationId);
}
```

**Reactivate User:**
```typescript
async function reactivateUser(userId: string, organizationId: string) {
  const organization = await getOrganization(organizationId);

  if (!canAddUser(organization)) {
    throw new Error('No available seats');
  }

  await supabase
    .from('users')
    .update({
      status: 'active',
      removal_effective_date: null
    })
    .eq('id', userId);

  // Cancel pending seat reduction if this was pending removal
  const subscription = organization.subscription;
  if (subscription.pending_seats) {
    const newPending = subscription.pending_seats + 1;

    // If pending equals current, no change needed
    const updateValue = newPending === subscription.current_seats
      ? null
      : newPending;

    await supabase
      .from('subscriptions')
      .update({ pending_seats: updateValue })
      .eq('id', subscription.id);
  }
}
```

### UI Components

**1. User Status Badge:**
```tsx
{user.status === 'pending_removal' && (
  <Badge variant="warning">
    Removing on {format(user.removal_effective_date, 'MMM d, yyyy')}
  </Badge>
)}

{user.status === 'archived' && (
  <Badge variant="secondary">Archived</Badge>
)}
```

**2. Subscription Widget:**
```tsx
<Card>
  <CardHeader>Subscription</CardHeader>
  <CardContent>
    <div>Current Seats: {subscription.current_seats}</div>
    {subscription.pending_seats && (
      <div className="text-amber-600">
        Starting {format(subscription.renews_at, 'MMM d')}: {subscription.pending_seats} seats
      </div>
    )}
    <div>Available: {getAvailableSeats(organization)}</div>
  </CardContent>
</Card>
```

**3. Admin Dashboard:**
```tsx
<section>
  <h2>Pending Changes</h2>
  {pendingRemovals.map(user => (
    <div key={user.id}>
      <span>{user.name}</span>
      <span>Removes: {format(user.removal_effective_date, 'MMM d')}</span>
      <Button onClick={() => cancelRemoval(user.id)}>Cancel</Button>
    </div>
  ))}
</section>
```

### Alert Service Integration

```typescript
// lib/alerts/alert-service.ts
export const alertService = {
  async critical(message: string) {
    // Slack notification
    await fetch(process.env.SLACK_WEBHOOK_URL, {
      method: 'POST',
      body: JSON.stringify({
        channel: '#critical-alerts',
        text: `🚨 ${message}`,
        username: 'Subscription Monitor'
      })
    });

    // Email to admins
    await sendEmail({
      to: process.env.ADMIN_EMAIL,
      subject: 'CRITICAL: Subscription Alert',
      body: message
    });

    // Store in database
    await supabase.from('alerts').insert({
      severity: 'critical',
      message,
      created_at: new Date()
    });
  }
};
```

### Performance Considerations

- Background jobs use pagination for large subscription sets
- Database queries use appropriate indexes on `status`, `organization_id`, `renews_at`
- Webhook processing remains idempotent with existing `billing_events` deduplication
- Seat count calculations cache results per request

### Security Considerations

- Only organization admins can remove/reactivate users
- Webhook signature verification already in place
- Lemon Squeezy API calls use secure API keys
- User data preserved in archived state (GDPR compliant with data retention)
- Critical alerts for billing discrepancies prevent overcharging

### Testing Requirements

1. **Unit Tests:**
   - Seat calculation with pending removals
   - Grace period date calculations
   - User status transitions

2. **Integration Tests:**
   - Background job execution with test subscriptions
   - Webhook payload processing
   - Lemon Squeezy API mocking

3. **E2E Tests:**
   - Complete user removal flow with grace period
   - Reactivation flow with seat limit checks
   - Multiple removals in same billing period
