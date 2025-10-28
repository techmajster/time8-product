# Database Schema

This is the database schema implementation for the spec detailed in @.agent-os/specs/2025-10-28-in-app-notifications/spec.md

## Overview

Create a new `notifications` table to store in-app notifications for users, with proper RLS policies for multi-tenant isolation, indexes for performance, and database triggers for automatic notification creation when leave request statuses change.

## Table Structure

### notifications

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'leave_request_approved',
    'leave_request_rejected',
    'leave_request_pending'
  )),
  title TEXT NOT NULL,
  message TEXT,
  metadata JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  related_leave_request_id UUID REFERENCES leave_requests(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Add comments for documentation
COMMENT ON TABLE notifications IS 'Stores in-app notifications for users about leave request updates';
COMMENT ON COLUMN notifications.type IS 'Type of notification: leave_request_approved, leave_request_rejected, leave_request_pending';
COMMENT ON COLUMN notifications.metadata IS 'Additional JSON data: employee name, leave dates, etc.';
COMMENT ON COLUMN notifications.related_leave_request_id IS 'Foreign key to the leave request that triggered this notification';
```

## Indexes

```sql
-- Composite index for fetching user notifications efficiently
CREATE INDEX idx_notifications_user_org_created
  ON notifications(user_id, organization_id, created_at DESC);

-- Index for filtering unread notifications
CREATE INDEX idx_notifications_user_unread
  ON notifications(user_id, is_read)
  WHERE is_read = FALSE;

-- Index for leave request lookup
CREATE INDEX idx_notifications_leave_request
  ON notifications(related_leave_request_id)
  WHERE related_leave_request_id IS NOT NULL;
```

### Index Rationale

1. **idx_notifications_user_org_created**: Primary query pattern for fetching notifications sorted by date
2. **idx_notifications_user_unread**: Optimized for counting unread notifications (badge display)
3. **idx_notifications_leave_request**: Fast lookup when navigating from leave request to related notifications

## Row Level Security Policies

```sql
-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can only view their own notifications within their organizations
CREATE POLICY "Users can view their own notifications"
  ON notifications
  FOR SELECT
  USING (
    auth.uid() = user_id
    AND organization_id IN (
      SELECT organization_id
      FROM user_organizations
      WHERE user_id = auth.uid()
        AND is_active = TRUE
    )
  );

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
  ON notifications
  FOR UPDATE
  USING (
    auth.uid() = user_id
    AND organization_id IN (
      SELECT organization_id
      FROM user_organizations
      WHERE user_id = auth.uid()
        AND is_active = TRUE
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    AND organization_id IN (
      SELECT organization_id
      FROM user_organizations
      WHERE user_id = auth.uid()
        AND is_active = TRUE
    )
  );

-- Only service role can insert notifications (via triggers or admin client)
CREATE POLICY "Service role can insert notifications"
  ON notifications
  FOR INSERT
  WITH CHECK (
    auth.jwt()->>'role' = 'service_role'
  );

-- Users cannot delete notifications (keep history)
-- No DELETE policy = no deletes allowed
```

## Database Triggers

### Function: Notify Employee on Leave Request Status Change

```sql
CREATE OR REPLACE FUNCTION notify_employee_on_leave_status_change()
RETURNS TRIGGER AS $$
DECLARE
  employee_name TEXT;
  leave_type_name TEXT;
  start_date DATE;
  end_date DATE;
BEGIN
  -- Only create notification if status changed to approved or rejected
  IF (TG_OP = 'UPDATE' AND
      OLD.status != NEW.status AND
      NEW.status IN ('approved', 'rejected')) THEN

    -- Get employee name and leave details
    SELECT
      p.full_name,
      lt.name,
      NEW.start_date,
      NEW.end_date
    INTO employee_name, leave_type_name, start_date, end_date
    FROM profiles p
    LEFT JOIN leave_types lt ON lt.id = NEW.leave_type_id
    WHERE p.id = NEW.user_id;

    -- Create notification for employee
    INSERT INTO notifications (
      user_id,
      organization_id,
      type,
      title,
      message,
      metadata,
      related_leave_request_id
    ) VALUES (
      NEW.user_id,
      NEW.organization_id,
      CASE
        WHEN NEW.status = 'approved' THEN 'leave_request_approved'
        WHEN NEW.status = 'rejected' THEN 'leave_request_rejected'
      END,
      CASE
        WHEN NEW.status = 'approved' THEN 'Urlop zaakceptowany'
        WHEN NEW.status = 'rejected' THEN 'Urlop odrzucony'
      END,
      CASE
        WHEN NEW.status = 'approved' THEN
          'Twój wniosek urlopowy (' || leave_type_name || ') od ' ||
          to_char(start_date, 'DD.MM.YYYY') || ' do ' ||
          to_char(end_date, 'DD.MM.YYYY') || ' został zaakceptowany.'
        WHEN NEW.status = 'rejected' THEN
          'Twój wniosek urlopowy (' || leave_type_name || ') od ' ||
          to_char(start_date, 'DD.MM.YYYY') || ' do ' ||
          to_char(end_date, 'DD.MM.YYYY') || ' został odrzucony.'
      END,
      jsonb_build_object(
        'leave_type', leave_type_name,
        'start_date', start_date,
        'end_date', end_date,
        'days_requested', NEW.days_requested,
        'status', NEW.status
      ),
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to leave_requests table
CREATE TRIGGER trigger_notify_employee_on_status_change
  AFTER UPDATE ON leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_employee_on_leave_status_change();
```

### Function: Notify Managers on New Leave Request

```sql
CREATE OR REPLACE FUNCTION notify_managers_on_new_leave_request()
RETURNS TRIGGER AS $$
DECLARE
  manager_record RECORD;
  employee_name TEXT;
  leave_type_name TEXT;
BEGIN
  -- Get employee name and leave type
  SELECT
    p.full_name,
    lt.name
  INTO employee_name, leave_type_name
  FROM profiles p
  LEFT JOIN leave_types lt ON lt.id = NEW.leave_type_id
  WHERE p.id = NEW.user_id;

  -- Create notifications for all managers and admins in the organization
  FOR manager_record IN
    SELECT DISTINCT uo.user_id
    FROM user_organizations uo
    WHERE uo.organization_id = NEW.organization_id
      AND uo.role IN ('manager', 'admin')
      AND uo.is_active = TRUE
      AND uo.user_id != NEW.user_id  -- Don't notify if admin created their own request
  LOOP
    INSERT INTO notifications (
      user_id,
      organization_id,
      type,
      title,
      message,
      metadata,
      related_leave_request_id
    ) VALUES (
      manager_record.user_id,
      NEW.organization_id,
      'leave_request_pending',
      'Nowy wniosek urlopowy',
      employee_name || ' złożył wniosek urlopowy (' || leave_type_name || ') od ' ||
      to_char(NEW.start_date, 'DD.MM.YYYY') || ' do ' ||
      to_char(NEW.end_date, 'DD.MM.YYYY') || '.',
      jsonb_build_object(
        'employee_name', employee_name,
        'employee_id', NEW.user_id,
        'leave_type', leave_type_name,
        'start_date', NEW.start_date,
        'end_date', NEW.end_date,
        'days_requested', NEW.days_requested
      ),
      NEW.id
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to leave_requests table
CREATE TRIGGER trigger_notify_managers_on_new_request
  AFTER INSERT ON leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_managers_on_new_leave_request();
```

## Migration Strategy

### Migration File: `supabase/migrations/YYYYMMDD_create_notifications_system.sql`

```sql
-- Create notifications table
-- (include full table definition from above)

-- Add indexes
-- (include all index definitions from above)

-- Enable RLS and add policies
-- (include all RLS policies from above)

-- Create trigger functions
-- (include both trigger functions from above)

-- Attach triggers
-- (include both trigger attachments from above)
```

### Rollback Procedure

```sql
-- Drop triggers first
DROP TRIGGER IF EXISTS trigger_notify_managers_on_new_request ON leave_requests;
DROP TRIGGER IF EXISTS trigger_notify_employee_on_status_change ON leave_requests;

-- Drop functions
DROP FUNCTION IF EXISTS notify_managers_on_new_leave_request();
DROP FUNCTION IF EXISTS notify_employee_on_leave_status_change();

-- Drop table (cascade will drop policies and indexes)
DROP TABLE IF EXISTS notifications CASCADE;
```

## Notification Types Reference

| Type | Title (Polish) | Triggered By | Recipients |
|------|----------------|--------------|------------|
| `leave_request_approved` | "Urlop zaakceptowany" | Leave request status → approved | Employee who submitted request |
| `leave_request_rejected` | "Urlop odrzucony" | Leave request status → rejected | Employee who submitted request |
| `leave_request_pending` | "Nowy wniosek urlopowy" | New leave request created | All managers and admins in organization |

## Sample Data Structure

### Example Notification Record

```json
{
  "id": "a1b2c3d4-...",
  "user_id": "employee-uuid",
  "organization_id": "org-uuid",
  "type": "leave_request_approved",
  "title": "Urlop zaakceptowany",
  "message": "Twój wniosek urlopowy (Urlop wypoczynkowy) od 15.11.2025 do 20.11.2025 został zaakceptowany.",
  "metadata": {
    "leave_type": "Urlop wypoczynkowy",
    "start_date": "2025-11-15",
    "end_date": "2025-11-20",
    "days_requested": 4,
    "status": "approved"
  },
  "is_read": false,
  "read_at": null,
  "related_leave_request_id": "leave-request-uuid",
  "created_at": "2025-10-28T10:30:00Z",
  "updated_at": "2025-10-28T10:30:00Z"
}
```

## Performance Considerations

- Indexes optimized for common query patterns (user+org+date, unread count)
- Partial index on `is_read = FALSE` reduces index size
- Triggers execute efficiently with minimal overhead
- JSONB metadata allows flexible data storage without schema changes
- Cascade delete ensures orphaned notifications are cleaned up

## Security Considerations

- RLS ensures users only see their own notifications
- Multi-tenant isolation via organization_id check
- Service role required for inserts (prevents user manipulation)
- No DELETE policy prevents accidental data loss
- Triggers use SECURITY DEFINER to bypass RLS during creation
