-- Create parental leave balance change requests table
CREATE TABLE parental_leave_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  organization_id UUID REFERENCES organizations(id) NOT NULL,
  previous_children_count INTEGER DEFAULT 0,
  new_children_count INTEGER NOT NULL,
  previous_entitled_days INTEGER DEFAULT 0,
  calculated_entitled_days INTEGER NOT NULL,
  reason TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_parental_leave_requests_user_id ON parental_leave_requests(user_id);
CREATE INDEX idx_parental_leave_requests_organization_id ON parental_leave_requests(organization_id);
CREATE INDEX idx_parental_leave_requests_status ON parental_leave_requests(status);
CREATE INDEX idx_parental_leave_requests_reviewed_by ON parental_leave_requests(reviewed_by);

-- Add RLS policies
ALTER TABLE parental_leave_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own requests
CREATE POLICY "Users can view own parental leave requests" ON parental_leave_requests
  FOR SELECT USING (
    auth.uid() = user_id
  );

-- Users can create their own requests
CREATE POLICY "Users can create own parental leave requests" ON parental_leave_requests
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
  );

-- Admins and managers can view all requests in their organization
CREATE POLICY "Admins can view organization parental leave requests" ON parental_leave_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.organization_id = parental_leave_requests.organization_id
      AND profiles.role IN ('admin', 'manager')
    )
  );

-- Only admins can approve/reject requests
CREATE POLICY "Admins can update parental leave requests" ON parental_leave_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.organization_id = parental_leave_requests.organization_id
      AND profiles.role = 'admin'
    )
  );

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_parental_leave_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_parental_leave_requests_updated_at
  BEFORE UPDATE ON parental_leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_parental_leave_requests_updated_at(); 