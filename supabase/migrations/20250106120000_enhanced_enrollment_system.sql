-- Enhanced Enrollment System Migration
-- This migration adds comprehensive student registration, payment processing, and admin approval workflow

-- Step 1: Create enum types for enrollment and payment status
DO $$
BEGIN
    -- Create enrollment_status enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enrollment_status') THEN
        CREATE TYPE public.enrollment_status AS ENUM (
            'pending_payment',
            'payment_submitted',
            'payment_approved',
            'payment_rejected',
            'enrollment_active',
            'enrollment_suspended'
        );
    END IF;
    
    -- Create payment_method enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method') THEN
        CREATE TYPE public.payment_method AS ENUM (
            'bank_transfer',
            'credit_card',
            'paypal',
            'cryptocurrency',
            'cash',
            'other'
        );
    END IF;
END $$;

-- Step 2: Create enrollments table to replace simple user_subjects
CREATE TABLE IF NOT EXISTS public.enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    
    -- Enrollment status and timestamps
    status public.enrollment_status NOT NULL DEFAULT 'pending_payment',
    enrolled_at TIMESTAMPTZ DEFAULT now(),
    payment_due_date TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    rejected_at TIMESTAMPTZ,
    
    -- Payment information
    payment_method public.payment_method,
    payment_amount DECIMAL(10,2),
    payment_currency VARCHAR(3) DEFAULT 'USD',
    payment_reference VARCHAR(255),
    
    -- Proof of payment
    payment_proof_url TEXT,
    payment_proof_filename VARCHAR(255),
    payment_proof_uploaded_at TIMESTAMPTZ,
    
    -- Admin review
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMPTZ,
    admin_notes TEXT,
    rejection_reason TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Constraints
    UNIQUE(tenant_id, user_id, subject_id),
    CHECK (payment_amount >= 0),
    CHECK (payment_due_date > enrolled_at OR payment_due_date IS NULL),
    CHECK (approved_at IS NULL OR approved_at >= enrolled_at),
    CHECK (rejected_at IS NULL OR rejected_at >= enrolled_at)
);

-- Step 3: Create payment_proofs storage bucket and policies
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('payment-proofs', 'payment-proofs', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Step 4: Create notification_templates table for automated communications
CREATE TABLE IF NOT EXISTS public.notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_name VARCHAR(100) NOT NULL UNIQUE,
    template_type VARCHAR(50) NOT NULL, -- 'email', 'sms', 'push'
    subject_template TEXT,
    body_template TEXT NOT NULL,
    variables JSONB, -- Available template variables
    is_active BOOLEAN DEFAULT true,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Step 5: Create notifications table for tracking sent notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    enrollment_id UUID REFERENCES public.enrollments(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    
    notification_type VARCHAR(50) NOT NULL, -- 'enrollment_created', 'payment_reminder', 'payment_approved', etc.
    delivery_method VARCHAR(20) NOT NULL, -- 'email', 'sms', 'push', 'in_app'
    
    recipient_address TEXT NOT NULL, -- email, phone, etc.
    subject TEXT,
    message TEXT NOT NULL,
    
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'failed', 'opened'
    error_message TEXT,
    
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Step 6: Create enrollment_reminders table for automated reminder scheduling
CREATE TABLE IF NOT EXISTS public.enrollment_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id UUID NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
    reminder_type VARCHAR(50) NOT NULL, -- 'payment_due', 'document_missing', 'approval_pending'
    
    scheduled_for TIMESTAMPTZ NOT NULL,
    sent_at TIMESTAMPTZ,
    next_reminder_at TIMESTAMPTZ,
    
    reminder_count INTEGER DEFAULT 0,
    max_reminders INTEGER DEFAULT 3,
    reminder_interval INTERVAL DEFAULT '24 hours',
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Step 7: Enable RLS on new tables
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollment_reminders ENABLE ROW LEVEL SECURITY;

-- Step 8: Create RLS policies for enrollments table
CREATE POLICY "Users can view their own enrollments" ON public.enrollments
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own enrollments" ON public.enrollments
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own enrollments" ON public.enrollments
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all enrollments in their tenant" ON public.enrollments
FOR SELECT USING (
    public.is_admin() AND 
    tenant_id = public.get_current_tenant_id()
);

CREATE POLICY "Admins can update enrollments in their tenant" ON public.enrollments
FOR UPDATE USING (
    public.is_admin() AND 
    tenant_id = public.get_current_tenant_id()
);

-- Step 9: Create RLS policies for storage
CREATE POLICY "Users can upload their own payment proofs" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'payment-proofs' AND 
    auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own payment proofs" ON storage.objects
FOR SELECT USING (
    bucket_id = 'payment-proofs' AND 
    auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can view payment proofs in their tenant" ON storage.objects
FOR SELECT USING (
    bucket_id = 'payment-proofs' AND 
    public.is_admin()
);

-- Step 10: Create RLS policies for notifications
CREATE POLICY "Users can view their own notifications" ON public.notifications
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications" ON public.notifications
FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view notifications in their tenant" ON public.notifications
FOR SELECT USING (
    public.is_admin() AND 
    tenant_id = public.get_current_tenant_id()
);

-- Step 11: Create RLS policies for notification templates
CREATE POLICY "Admins can manage notification templates" ON public.notification_templates
FOR ALL USING (
    public.is_admin() AND 
    (tenant_id = public.get_current_tenant_id() OR tenant_id IS NULL)
);

-- Step 12: Create RLS policies for enrollment reminders
CREATE POLICY "System can manage enrollment reminders" ON public.enrollment_reminders
FOR ALL USING (true);

-- Step 13: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_enrollments_user_id ON public.enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_subject_id ON public.enrollments(subject_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_tenant_id ON public.enrollments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_status ON public.enrollments(status);
CREATE INDEX IF NOT EXISTS idx_enrollments_payment_due_date ON public.enrollments(payment_due_date) WHERE payment_due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_enrollments_created_at ON public.enrollments(created_at);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_enrollment_id ON public.notifications(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON public.notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_sent_at ON public.notifications(sent_at);

CREATE INDEX IF NOT EXISTS idx_reminders_enrollment_id ON public.enrollment_reminders(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_reminders_scheduled_for ON public.enrollment_reminders(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_reminders_is_active ON public.enrollment_reminders(is_active);

-- Step 14: Create updated_at trigger for enrollments
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_enrollments_updated_at
    BEFORE UPDATE ON public.enrollments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notification_templates_updated_at
    BEFORE UPDATE ON public.notification_templates
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Step 15: Insert default notification templates
INSERT INTO public.notification_templates (template_name, template_type, subject_template, body_template, variables, tenant_id) VALUES
('enrollment_created', 'email', 'Welcome! Your enrollment is being processed', 
'Hello {{user_name}},

Thank you for enrolling in {{subject_name}}! Your enrollment is currently being processed.

Enrollment Details:
- Subject: {{subject_name}}
- Enrollment ID: {{enrollment_id}}
- Payment Amount: {{payment_amount}} {{payment_currency}}
- Payment Due Date: {{payment_due_date}}

Next Steps:
1. Upload your proof of payment using the link below
2. Wait for admin approval
3. Start learning!

Upload Payment Proof: {{payment_upload_url}}

If you have any questions, please contact our support team.

Best regards,
The Learning Platform Team',
'{"user_name": "Student name", "subject_name": "Subject name", "enrollment_id": "Enrollment ID", "payment_amount": "Amount", "payment_currency": "Currency", "payment_due_date": "Due date", "payment_upload_url": "Upload URL"}',
NULL),

('payment_reminder', 'email', 'Payment Reminder - {{subject_name}}',
'Hello {{user_name}},

This is a friendly reminder that your payment for {{subject_name}} is due on {{payment_due_date}}.

Payment Details:
- Amount: {{payment_amount}} {{payment_currency}}
- Subject: {{subject_name}}
- Due Date: {{payment_due_date}}

Please upload your proof of payment as soon as possible to avoid delays in your enrollment.

Upload Payment Proof: {{payment_upload_url}}

Thank you!
The Learning Platform Team',
'{"user_name": "Student name", "subject_name": "Subject name", "payment_amount": "Amount", "payment_currency": "Currency", "payment_due_date": "Due date", "payment_upload_url": "Upload URL"}',
NULL),

('payment_approved', 'email', 'Payment Approved - Welcome to {{subject_name}}!',
'Hello {{user_name}},

Great news! Your payment for {{subject_name}} has been approved.

You now have full access to:
- Course materials and lessons
- Interactive quizzes and assignments
- Progress tracking
- Support resources

Start Learning: {{dashboard_url}}

Welcome aboard!
The Learning Platform Team',
'{"user_name": "Student name", "subject_name": "Subject name", "dashboard_url": "Dashboard URL"}',
NULL),

('payment_rejected', 'email', 'Payment Review Required - {{subject_name}}',
'Hello {{user_name}},

We need to review your payment submission for {{subject_name}}.

Reason: {{rejection_reason}}

Please:
1. Review the reason above
2. Upload a new proof of payment if needed
3. Contact support if you need assistance

Re-upload Payment Proof: {{payment_upload_url}}

Our support team is here to help: {{support_email}}

Best regards,
The Learning Platform Team',
'{"user_name": "Student name", "subject_name": "Subject name", "rejection_reason": "Reason for rejection", "payment_upload_url": "Upload URL", "support_email": "support@platform.com"}',
NULL);

-- Step 16: Create comment documentation
COMMENT ON TABLE public.enrollments IS 'Comprehensive student enrollment tracking with payment processing and admin approval workflow';
COMMENT ON TABLE public.notification_templates IS 'Email and notification templates for automated communication';
COMMENT ON TABLE public.notifications IS 'Tracking of all sent notifications to users';
COMMENT ON TABLE public.enrollment_reminders IS 'Automated reminder scheduling for enrollments requiring action';

COMMENT ON COLUMN public.enrollments.status IS 'Current enrollment status tracking payment and approval workflow';
COMMENT ON COLUMN public.enrollments.payment_proof_url IS 'Secure URL to uploaded payment proof document';
COMMENT ON COLUMN public.enrollments.admin_notes IS 'Admin notes for enrollment review and approval process';
COMMENT ON COLUMN public.enrollments.rejection_reason IS 'Reason provided when payment/enrollment is rejected';
