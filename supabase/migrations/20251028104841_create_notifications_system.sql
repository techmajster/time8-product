-- Migration: Create In-App Notifications System
-- Description: Create notifications table with RLS policies and trigger functions for automatic notification creation
-- Spec: .agent-os/specs/2025-10-28-in-app-notifications/

-- Create notifications table
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

-- Create indexes for performance
CREATE INDEX idx_notifications_user_org_created
  ON notifications(user_id, organization_id, created_at DESC);

CREATE INDEX idx_notifications_user_unread
  ON notifications(user_id, is_read)
  WHERE is_read = FALSE;

CREATE INDEX idx_notifications_leave_request
  ON notifications(related_leave_request_id)
  WHERE related_leave_request_id IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
  ON notifications
  FOR SELECT
  USING (
    (SELECT auth.uid()) = user_id
    AND organization_id IN (
      SELECT organization_id
      FROM user_organizations
      WHERE user_id = (SELECT auth.uid())
        AND is_active = TRUE
    )
  );

-- RLS Policy: Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
  ON notifications
  FOR UPDATE
  USING (
    (SELECT auth.uid()) = user_id
    AND organization_id IN (
      SELECT organization_id
      FROM user_organizations
      WHERE user_id = (SELECT auth.uid())
        AND is_active = TRUE
    )
  )
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND organization_id IN (
      SELECT organization_id
      FROM user_organizations
      WHERE user_id = (SELECT auth.uid())
        AND is_active = TRUE
    )
  );

-- RLS Policy: Service role can insert notifications
CREATE POLICY "Service role can insert notifications"
  ON notifications
  FOR INSERT
  WITH CHECK (
    (SELECT auth.jwt()->>'role') = 'service_role'
  );

-- Function: Notify employee when leave request status changes
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

-- Function: Notify managers when new leave request is created
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

-- Attach trigger for leave status changes (approved/rejected)
CREATE TRIGGER trigger_notify_employee_on_status_change
  AFTER UPDATE ON leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_employee_on_leave_status_change();

-- Attach trigger for new leave requests (notify managers)
CREATE TRIGGER trigger_notify_managers_on_new_request
  AFTER INSERT ON leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_managers_on_new_leave_request();
