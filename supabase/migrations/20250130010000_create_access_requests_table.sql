-- Create access_requests table for users requesting to join organizations
CREATE TABLE public.access_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_email TEXT NOT NULL,
    user_name TEXT NOT NULL,
    message TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMPTZ,
    
    -- Ensure user can only have one pending request per organization
    UNIQUE(user_id, organization_id, status)
);

-- Create indexes for better performance
CREATE INDEX idx_access_requests_organization_id ON public.access_requests(organization_id);
CREATE INDEX idx_access_requests_user_id ON public.access_requests(user_id);
CREATE INDEX idx_access_requests_status ON public.access_requests(status);

-- Enable RLS
ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own requests
CREATE POLICY "Users can view own access requests" ON public.access_requests
    FOR SELECT USING (auth.uid() = user_id);

-- Users can create their own requests
CREATE POLICY "Users can create access requests" ON public.access_requests
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Organization admins can view requests for their organization
CREATE POLICY "Admins can view org access requests" ON public.access_requests
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id 
            FROM public.profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'owner')
        )
    );

-- Organization admins can update requests for their organization
CREATE POLICY "Admins can update org access requests" ON public.access_requests
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id 
            FROM public.profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'owner')
        )
    );

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION public.update_access_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_access_requests_updated_at
    BEFORE UPDATE ON public.access_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.update_access_requests_updated_at(); 