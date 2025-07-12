
-- First create a default tenant if it doesn't exist
INSERT INTO public.tenants (id, name) 
VALUES ('00000000-0000-0000-0000-000000000001', 'Default Organization')
ON CONFLICT (id) DO NOTHING;

-- Create or replace the handle_new_user function to assign default tenant
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    default_tenant_id uuid := '00000000-0000-0000-0000-000000000001';
BEGIN
  INSERT INTO public.profiles (
    id, 
    full_name, 
    grade, 
    tenant_id
  )
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    CASE 
      WHEN new.raw_user_meta_data->>'grade' = 'not_applicable' THEN NULL
      ELSE (new.raw_user_meta_data->>'grade')::integer
    END,
    default_tenant_id
  );
  
  -- Assign default student role
  INSERT INTO public.user_roles (user_id, role, tenant_id)
  VALUES (new.id, 'student', default_tenant_id);
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
