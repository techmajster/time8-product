-- Migration: Fix Notification Functions Search Path Security
-- Description: Add explicit search_path to notification trigger functions to resolve security warnings
-- Related: Fixes function_search_path_mutable warnings from database linter

-- Drop and recreate function with explicit search_path
DROP FUNCTION IF EXISTS notify_employee_on_leave_status_change() CASCADE;

CREATE OR REPLACE FUNCTION notify_employee_on_leave_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
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
$$;

-- Drop and recreate function with explicit search_path
DROP FUNCTION IF EXISTS notify_managers_on_new_leave_request() CASCADE;

CREATE OR REPLACE FUNCTION notify_managers_on_new_leave_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
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
$$;

-- Reattach trigger for leave status changes (approved/rejected)
CREATE TRIGGER trigger_notify_employee_on_status_change
  AFTER UPDATE ON leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_employee_on_leave_status_change();

-- Reattach trigger for new leave requests (notify managers)
CREATE TRIGGER trigger_notify_managers_on_new_request
  AFTER INSERT ON leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_managers_on_new_leave_request();
