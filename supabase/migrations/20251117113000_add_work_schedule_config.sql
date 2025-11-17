-- Add work schedule configuration columns to organizations

ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS exclude_public_holidays BOOLEAN DEFAULT true;

ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS daily_start_time TIME WITHOUT TIME ZONE DEFAULT '09:00:00'::time;

ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS daily_end_time TIME WITHOUT TIME ZONE DEFAULT '17:00:00'::time;

ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS work_schedule_type TEXT DEFAULT 'daily'::text;

ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS shift_count INTEGER DEFAULT 1;

ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS work_shifts JSONB DEFAULT '[]'::jsonb;

-- Backfill existing organizations with defaults / normalize legacy values
UPDATE organizations
SET
  exclude_public_holidays = COALESCE(exclude_public_holidays, true),
  daily_start_time = COALESCE(daily_start_time, '09:00:00'::time),
  daily_end_time = COALESCE(daily_end_time, '17:00:00'::time),
  work_schedule_type = CASE
    WHEN work_schedule_type IS NULL THEN 'daily'
    WHEN work_schedule_type NOT IN ('daily', 'multi_shift') THEN 'daily'
    ELSE work_schedule_type
  END,
  shift_count = COALESCE(shift_count, 1),
  work_shifts = COALESCE(work_shifts, '[]'::jsonb)
WHERE
  exclude_public_holidays IS NULL
  OR daily_start_time IS NULL
  OR daily_end_time IS NULL
  OR work_schedule_type IS NULL
  OR work_schedule_type NOT IN ('daily', 'multi_shift')
  OR shift_count IS NULL
  OR work_shifts IS NULL;

DO $$
BEGIN
  ALTER TABLE organizations
  ADD CONSTRAINT organizations_work_schedule_type_check
  CHECK (work_schedule_type = ANY (ARRAY['daily'::text, 'multi_shift'::text]));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE organizations
  ADD CONSTRAINT organizations_shift_count_check
  CHECK (shift_count >= 1 AND shift_count <= 3);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON COLUMN organizations.exclude_public_holidays IS 'When true, national/company holidays are automatically treated as non-working days.';
COMMENT ON COLUMN organizations.daily_start_time IS 'Start time for daily work schedule (Praca codzienna).';
COMMENT ON COLUMN organizations.daily_end_time IS 'End time for daily work schedule (Praca codzienna).';
COMMENT ON COLUMN organizations.work_schedule_type IS 'daily = single set of hours, multi_shift = shift-based schedule (coming soon).';
COMMENT ON COLUMN organizations.shift_count IS 'Number of defined shifts when using multi-shift schedules (1-3).';
COMMENT ON COLUMN organizations.work_shifts IS 'JSONB array with shift definitions ({ label, start_time, end_time }).';


