-- Simple migration to add payment system columns
-- This migration only adds what's needed for the payment system

-- Add payment columns to enrollments table
DO $$
BEGIN
    -- Add payment_status column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'enrollments' 
        AND column_name = 'payment_status'
    ) THEN
        ALTER TABLE enrollments ADD COLUMN payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed'));
    END IF;

    -- Add payment_amount column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'enrollments' 
        AND column_name = 'payment_amount'
    ) THEN
        ALTER TABLE enrollments ADD COLUMN payment_amount DECIMAL(10, 2);
    END IF;

    -- Add payment_proof_url column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'enrollments' 
        AND column_name = 'payment_proof_url'
    ) THEN
        ALTER TABLE enrollments ADD COLUMN payment_proof_url TEXT;
    END IF;

    -- Add payment_proof_filename column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'enrollments' 
        AND column_name = 'payment_proof_filename'
    ) THEN
        ALTER TABLE enrollments ADD COLUMN payment_proof_filename TEXT;
    END IF;

    -- Add admin_notes column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'enrollments' 
        AND column_name = 'admin_notes'
    ) THEN
        ALTER TABLE enrollments ADD COLUMN admin_notes TEXT;
    END IF;

    -- Add reviewed_by column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'enrollments' 
        AND column_name = 'reviewed_by'
    ) THEN
        ALTER TABLE enrollments ADD COLUMN reviewed_by UUID REFERENCES auth.users(id);
    END IF;

    -- Add reviewed_at column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'enrollments' 
        AND column_name = 'reviewed_at'
    ) THEN
        ALTER TABLE enrollments ADD COLUMN reviewed_at TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Add updated_at column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'enrollments' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE enrollments ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Add columns to notifications table
DO $$
BEGIN
    -- Add type column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' 
        AND column_name = 'type'
    ) THEN
        ALTER TABLE notifications ADD COLUMN type TEXT CHECK (type IN ('enrollment_approved', 'enrollment_rejected', 'payment_reminder', 'system_notification'));
    END IF;

    -- Add read column (renamed from is_read)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' 
        AND column_name = 'read'
    ) THEN
        ALTER TABLE notifications ADD COLUMN read BOOLEAN DEFAULT FALSE;
    END IF;

    -- Add read_at column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' 
        AND column_name = 'read_at'
    ) THEN
        ALTER TABLE notifications ADD COLUMN read_at TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Add data column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' 
        AND column_name = 'data'
    ) THEN
        ALTER TABLE notifications ADD COLUMN data JSONB;
    END IF;
END $$;

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

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_enrollments_payment_status ON enrollments(payment_status);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
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

-- Enable RLS on new tables
ALTER TABLE reminder_settings ENABLE ROW LEVEL SECURITY;

-- Simple storage policies for payment proofs (without admin role checks)
DO $$
BEGIN
    -- Check if the policy already exists before creating
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Users can upload payment proofs'
    ) THEN
        CREATE POLICY "Users can upload payment proofs" ON storage.objects
            FOR INSERT WITH CHECK (
                bucket_id = 'payment-proofs' AND
                (storage.foldername(name))[1] = auth.uid()::text
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Users can view their own payment proofs'
    ) THEN
        CREATE POLICY "Users can view their own payment proofs" ON storage.objects
            FOR SELECT USING (
                bucket_id = 'payment-proofs' AND
                (storage.foldername(name))[1] = auth.uid()::text
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Users can update their own payment proofs'
    ) THEN
        CREATE POLICY "Users can update their own payment proofs" ON storage.objects
            FOR UPDATE USING (
                bucket_id = 'payment-proofs' AND
                (storage.foldername(name))[1] = auth.uid()::text
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Users can delete their own payment proofs'
    ) THEN
        CREATE POLICY "Users can delete their own payment proofs" ON storage.objects
            FOR DELETE USING (
                bucket_id = 'payment-proofs' AND
                (storage.foldername(name))[1] = auth.uid()::text
            );
    END IF;
END $$;

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

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON enrollments TO authenticated;
GRANT SELECT, INSERT, UPDATE ON notifications TO authenticated;
GRANT SELECT ON reminder_settings TO authenticated;
GRANT EXECUTE ON FUNCTION get_enrollment_stats() TO authenticated;
