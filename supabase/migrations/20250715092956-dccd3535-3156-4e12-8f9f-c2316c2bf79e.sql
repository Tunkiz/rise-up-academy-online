-- Ensure all core tables, policies, functions and storage are set up

-- Create enum types
DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM ('admin', 'learner', 'tutor', 'parent', 'super_admin', 'student');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.subject_category AS ENUM ('matric_amended', 'national_senior', 'senior_phase');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.enrollment_status AS ENUM ('pending_payment', 'payment_submitted', 'payment_approved', 'payment_rejected', 'enrollment_active', 'enrollment_suspended');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.payment_method AS ENUM ('bank_transfer', 'credit_card', 'paypal', 'cryptocurrency', 'cash', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create default tenant if it doesn't exist
INSERT INTO public.tenants (id, name, domain, is_active) 
VALUES ('00000000-0000-0000-0000-000000000001', 'Default Organization', 'default.edu', true)
ON CONFLICT (id) DO NOTHING;

-- Create core tables
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    domain TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY,
    full_name TEXT,
    grade INTEGER,
    avatar_url TEXT,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id),
    learner_category public.subject_category DEFAULT 'national_senior'
);

CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    role public.app_role NOT NULL,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id)
);

CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category public.subject_category NOT NULL,
    teams_link TEXT,
    class_time TEXT,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    subject_id UUID NOT NULL REFERENCES public.subjects(id),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id)
);

CREATE TABLE IF NOT EXISTS public.lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT,
    description TEXT,
    lesson_type TEXT NOT NULL,
    topic_id UUID NOT NULL REFERENCES public.topics(id),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id),
    "order" INTEGER NOT NULL DEFAULT 0,
    duration_minutes INTEGER DEFAULT 30,
    grade INTEGER,
    pass_mark INTEGER,
    attachment_url TEXT,
    time_limit INTEGER,
    due_date TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    file_url TEXT,
    subject_id UUID REFERENCES public.subjects(id),
    grade INTEGER,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id),
    created_by UUID DEFAULT auth.uid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.quiz_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    explanation TEXT,
    "order" INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.quiz_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
    option_text TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.user_subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    subject_id UUID NOT NULL REFERENCES public.subjects(id),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id)
);

CREATE TABLE IF NOT EXISTS public.lesson_completions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    lesson_id UUID NOT NULL REFERENCES public.lessons(id),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id),
    completed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.quiz_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    lesson_id UUID NOT NULL REFERENCES public.lessons(id),
    score INTEGER NOT NULL,
    passed BOOLEAN NOT NULL,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.student_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    subject_id UUID NOT NULL REFERENCES public.subjects(id),
    progress INTEGER NOT NULL,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id)
);

CREATE TABLE IF NOT EXISTS public.study_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    goal TEXT NOT NULL,
    timeframe TEXT NOT NULL,
    hours_per_week INTEGER NOT NULL,
    plan_content TEXT NOT NULL,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.tutor_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    prompt TEXT NOT NULL,
    response TEXT NOT NULL,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.recent_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    course TEXT NOT NULL,
    activity TEXT NOT NULL,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id),
    date TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    registration_start_date DATE NOT NULL,
    registration_end_date DATE NOT NULL,
    exam_date DATE NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutor_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recent_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('resource_files', 'resource_files', true, 52428800, ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png'])
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;