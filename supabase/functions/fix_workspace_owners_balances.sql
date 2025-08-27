-- Function to initialize leave balances for existing workspace owners
-- Run this in Supabase SQL Editor or via psql

CREATE OR REPLACE FUNCTION fix_workspace_owners_balances(dry_run BOOLEAN DEFAULT true)
RETURNS TABLE (
  action TEXT,
  owner_email TEXT,
  owner_name TEXT,
  organization_name TEXT,
  leave_type_name TEXT,
  days_created INTEGER,
  message TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  owner_record RECORD;
  leave_type_record RECORD;
  existing_balance_count INTEGER;
  current_year INTEGER := EXTRACT(YEAR FROM NOW());
  total_owners_processed INTEGER := 0;
  total_balances_created INTEGER := 0;
BEGIN
  -- Log start of function
  RETURN QUERY SELECT 
    'INFO'::TEXT,
    ''::TEXT,
    ''::TEXT, 
    ''::TEXT,
    ''::TEXT,
    0::INTEGER,
    CASE 
      WHEN dry_run THEN 'Starting dry run - no changes will be made'
      ELSE 'Starting actual migration - balances will be created'
    END;

  -- Find all workspace owners (users who created their organizations)
  FOR owner_record IN
    SELECT 
      uo.user_id,
      uo.organization_id,
      p.email,
      p.full_name,
      o.name as org_name
    FROM user_organizations uo
    INNER JOIN profiles p ON p.id = uo.user_id
    INNER JOIN organizations o ON o.id = uo.organization_id
    WHERE uo.role = 'admin'
      AND uo.joined_via = 'created'
      AND uo.is_active = true
  LOOP
    RETURN QUERY SELECT 
      'PROCESSING'::TEXT,
      owner_record.email,
      COALESCE(owner_record.full_name, 'Unknown'),
      owner_record.org_name,
      ''::TEXT,
      0::INTEGER,
      'Processing workspace owner...'::TEXT;

    -- Get leave types for this organization that require balance
    FOR leave_type_record IN
      SELECT *
      FROM leave_types lt
      WHERE lt.organization_id = owner_record.organization_id
        AND lt.requires_balance = true
        AND lt.days_per_year > 0
        AND lt.leave_category NOT IN ('maternity', 'paternity', 'childcare')
    LOOP
      -- Check if balance already exists
      SELECT COUNT(*) INTO existing_balance_count
      FROM leave_balances lb
      WHERE lb.user_id = owner_record.user_id
        AND lb.leave_type_id = leave_type_record.id
        AND lb.organization_id = owner_record.organization_id
        AND lb.year = current_year;

      IF existing_balance_count = 0 THEN
        -- Balance doesn't exist, create it
        IF NOT dry_run THEN
          INSERT INTO leave_balances (
            user_id,
            leave_type_id,
            organization_id,
            year,
            entitled_days,
            used_days
          ) VALUES (
            owner_record.user_id,
            leave_type_record.id,
            owner_record.organization_id,
            current_year,
            leave_type_record.days_per_year,
            0
          );
        END IF;

        total_balances_created := total_balances_created + 1;

        RETURN QUERY SELECT 
          CASE WHEN dry_run THEN 'WOULD_CREATE' ELSE 'CREATED' END::TEXT,
          owner_record.email,
          COALESCE(owner_record.full_name, 'Unknown'),
          owner_record.org_name,
          leave_type_record.name,
          leave_type_record.days_per_year,
          CASE 
            WHEN dry_run THEN 'Would create balance'
            ELSE 'Balance created successfully'
          END::TEXT;
      ELSE
        -- Balance already exists
        RETURN QUERY SELECT 
          'ALREADY_EXISTS'::TEXT,
          owner_record.email,
          COALESCE(owner_record.full_name, 'Unknown'),
          owner_record.org_name,
          leave_type_record.name,
          leave_type_record.days_per_year,
          'Balance already exists'::TEXT;
      END IF;
    END LOOP;

    total_owners_processed := total_owners_processed + 1;
  END LOOP;

  -- Summary
  RETURN QUERY SELECT 
    'SUMMARY'::TEXT,
    ''::TEXT,
    ''::TEXT,
    ''::TEXT,
    ''::TEXT,
    total_balances_created,
    CASE 
      WHEN dry_run THEN 
        format('Dry run completed. Would process %s owners and create %s balances.', 
               total_owners_processed, total_balances_created)
      ELSE 
        format('Migration completed. Processed %s owners and created %s balances.', 
               total_owners_processed, total_balances_created)
    END::TEXT;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION fix_workspace_owners_balances(BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION fix_workspace_owners_balances(BOOLEAN) TO service_role;

-- Example usage (add these as comments for reference):
-- 
-- To preview what would be created (dry run):
-- SELECT * FROM fix_workspace_owners_balances(true);
--
-- To actually create the balances:
-- SELECT * FROM fix_workspace_owners_balances(false);