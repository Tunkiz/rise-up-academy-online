-- Create notifications table for payment status updates
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('info', 'success', 'warning', 'error')),
    read BOOLEAN DEFAULT FALSE,
    enrollment_id UUID REFERENCES public.enrollments(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_tenant_id ON public.notifications(tenant_id);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;
CREATE POLICY "Users can delete their own notifications"
ON public.notifications
FOR DELETE
USING (auth.uid() = user_id);

-- Admin policies
DROP POLICY IF EXISTS "Admins can insert notifications for any user" ON public.notifications;
CREATE POLICY "Admins can insert notifications for any user"
ON public.notifications
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'super_admin')
    )
);

-- Grant permissions
GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT INSERT ON public.notifications TO authenticated;

-- Create function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_notifications_updated_at_trigger ON public.notifications;
CREATE TRIGGER update_notifications_updated_at_trigger
    BEFORE UPDATE ON public.notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_notifications_updated_at();
