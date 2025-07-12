-- Create basic subjects table that other migrations depend on
CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create tenants table if it doesn't exist (also needed by enrollment system)
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on subjects table
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access to subjects during registration
CREATE POLICY "Allow public read access to subjects"
ON public.subjects
FOR SELECT
TO public
USING (true);

-- Create policies for authenticated read access to subjects
CREATE POLICY "Allow authenticated read access to subjects"
ON public.subjects
FOR SELECT
TO authenticated
USING (true);

-- Create policies for tenants
CREATE POLICY "Allow public read access to tenants"
ON public.tenants
FOR SELECT
TO public
USING (true);

-- Insert sample data
INSERT INTO public.subjects (name) VALUES ('Mathematics'), ('Physical Sciences'), ('English')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.tenants (name) VALUES ('Default Tenant')
ON CONFLICT DO NOTHING;
