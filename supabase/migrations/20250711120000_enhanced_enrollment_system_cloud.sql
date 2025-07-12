-- Enhanced Enrollment System Migration for Cloud Supabase
-- This migration creates the complete enrollment and payment system

-- Create enrollments table
CREATE TABLE IF NOT EXISTS enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    enrollment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed')),
    payment_amount DECIMAL(10, 2),
    payment_proof_url TEXT,
    payment_proof_filename TEXT,
    admin_notes TEXT,
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    tenant_id UUID DEFAULT (auth.jwt() ->> 'tenant_id')::UUID,
    UNIQUE(user_id, subject_id)
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('enrollment_approved', 'enrollment_rejected', 'payment_reminder', 'system_notification')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    tenant_id UUID DEFAULT (auth.jwt() ->> 'tenant_id')::UUID
);

-- Create reminder_settings table
CREATE TABLE IF NOT EXISTS reminder_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id UUID NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
    reminder_type TEXT NOT NULL CHECK (reminder_type IN ('payment_due', 'document_missing', 'approval_pending')),
    days_before INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    tenant_id UUID DEFAULT (auth.jwt() ->> 'tenant_id')::UUID
);

-- Create payment_proofs storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'payment-proofs',
    'payment-proofs',
    false,
    10485760, -- 10MB limit
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
) ON CONFLICT (id) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_enrollments_user_id ON enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_subject_id ON enrollments(subject_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_status ON enrollments(status);
CREATE INDEX IF NOT EXISTS idx_enrollments_payment_status ON enrollments(payment_status);
CREATE INDEX IF NOT EXISTS idx_enrollments_created_at ON enrollments(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_reminder_settings_enrollment_id ON reminder_settings(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_reminder_settings_reminder_type ON reminder_settings(reminder_type);
CREATE INDEX IF NOT EXISTS idx_reminder_settings_is_active ON reminder_settings(is_active);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for enrollments updated_at
DROP TRIGGER IF EXISTS update_enrollments_updated_at ON enrollments;
CREATE TRIGGER update_enrollments_updated_at
    BEFORE UPDATE ON enrollments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminder_settings ENABLE ROW LEVEL SECURITY;

-- Enrollments RLS policies
CREATE POLICY "Users can view their own enrollments" ON enrollments
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own enrollments" ON enrollments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own enrollments" ON enrollments
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all enrollments" ON enrollments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.name IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Admins can update all enrollments" ON enrollments
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.name IN ('admin', 'super_admin')
        )
    );

-- Notifications RLS policies
CREATE POLICY "Users can view their own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications" ON notifications
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view all notifications" ON notifications
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.name IN ('admin', 'super_admin')
        )
    );

-- Reminder settings RLS policies
CREATE POLICY "Users can view reminder settings for their enrollments" ON reminder_settings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM enrollments e
            WHERE e.id = reminder_settings.enrollment_id
            AND e.user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage all reminder settings" ON reminder_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.name IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "System can manage reminder settings" ON reminder_settings
    FOR ALL WITH CHECK (true);

-- Storage policies for payment proofs
CREATE POLICY "Users can upload payment proofs" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'payment-proofs' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Users can view their own payment proofs" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'payment-proofs' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Users can update their own payment proofs" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'payment-proofs' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Users can delete their own payment proofs" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'payment-proofs' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Admins can view all payment proofs" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'payment-proofs' AND
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.name IN ('admin', 'super_admin')
        )
    );

-- Create function to get enrollment statistics
CREATE OR REPLACE FUNCTION get_enrollment_stats()
RETURNS TABLE (
    total_enrollments BIGINT,
    pending_enrollments BIGINT,
    approved_enrollments BIGINT,
    rejected_enrollments BIGINT,
    pending_payments BIGINT,
    paid_enrollments BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total_enrollments,
        COUNT(*) FILTER (WHERE status = 'pending')::BIGINT as pending_enrollments,
        COUNT(*) FILTER (WHERE status = 'approved')::BIGINT as approved_enrollments,
        COUNT(*) FILTER (WHERE status = 'rejected')::BIGINT as rejected_enrollments,
        COUNT(*) FILTER (WHERE payment_status = 'pending')::BIGINT as pending_payments,
        COUNT(*) FILTER (WHERE payment_status = 'paid')::BIGINT as paid_enrollments
    FROM enrollments;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to clean up old notifications
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM notifications
    WHERE created_at < NOW() - INTERVAL '30 days'
    AND read = true;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON enrollments TO authenticated;
GRANT SELECT, INSERT, UPDATE ON notifications TO authenticated;
GRANT SELECT ON reminder_settings TO authenticated;
GRANT EXECUTE ON FUNCTION get_enrollment_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_notifications() TO authenticated;
