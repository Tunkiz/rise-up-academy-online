-- Temporary Account System Migration
-- This migration adds account status tracking to support temporary accounts that get promoted after payment approval

-- Step 1: Create account_status enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_status') THEN
        CREATE TYPE public.account_status AS ENUM (
            'temporary',           -- Created during registration, limited access
            'pending_payment',     -- Account created but payment not submitted
            'payment_submitted',   -- Payment submitted, awaiting approval
            'active',             -- Payment approved, full access
            'suspended',          -- Account suspended
            'expired'             -- Temporary account expired
        );
    END IF;
END $$;

-- Step 2: Add account status and temporary account fields to profiles table
DO $$
BEGIN
    -- Add account_status column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'account_status') THEN
        ALTER TABLE public.profiles ADD COLUMN account_status public.account_status DEFAULT 'temporary';
    END IF;
    
    -- Add temporary account expiration
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'temporary_expires_at') THEN
        ALTER TABLE public.profiles ADD COLUMN temporary_expires_at TIMESTAMPTZ;
    END IF;
    
    -- Add enrollment completion timestamp
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'enrollment_completed_at') THEN
        ALTER TABLE public.profiles ADD COLUMN enrollment_completed_at TIMESTAMPTZ;
    END IF;
    
    -- Add payment approval timestamp
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'payment_approved_at') THEN
        ALTER TABLE public.profiles ADD COLUMN payment_approved_at TIMESTAMPTZ;
    END IF;
    
    -- Add registration metadata
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'registration_metadata') THEN
        ALTER TABLE public.profiles ADD COLUMN registration_metadata JSONB;
    END IF;
    
    -- Add temporary account reason
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'temporary_reason') THEN
        ALTER TABLE public.profiles ADD COLUMN temporary_reason TEXT DEFAULT 'registration_in_progress';
    END IF;
END $$;

-- Step 3: Create function to set temporary account expiration
CREATE OR REPLACE FUNCTION public.set_temporary_account_expiration()
RETURNS TRIGGER AS $$
BEGIN
    -- Set expiration to 7 days from account creation for temporary accounts
    IF NEW.account_status = 'temporary' AND NEW.temporary_expires_at IS NULL THEN
        NEW.temporary_expires_at := NOW() + INTERVAL '7 days';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create trigger for temporary account expiration
DROP TRIGGER IF EXISTS set_temporary_expiration ON public.profiles;
CREATE TRIGGER set_temporary_expiration
    BEFORE INSERT OR UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.set_temporary_account_expiration();

-- Step 5: Create function to promote temporary account to active
CREATE OR REPLACE FUNCTION public.promote_temporary_account(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    profile_record RECORD;
    enrollment_record RECORD;
BEGIN
    -- Get the profile
    SELECT * INTO profile_record FROM public.profiles WHERE id = user_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Profile not found for user_id: %', user_id;
    END IF;
    
    -- Check if all enrollments are payment_approved
    SELECT COUNT(*) as total_enrollments,
           COUNT(CASE WHEN status = 'payment_approved' THEN 1 END) as approved_enrollments
    INTO enrollment_record
    FROM public.enrollments 
    WHERE user_id = promote_temporary_account.user_id;
    
    -- Only promote if all enrollments are approved
    IF enrollment_record.total_enrollments > 0 AND 
       enrollment_record.approved_enrollments = enrollment_record.total_enrollments THEN
        
        -- Update profile to active status
        UPDATE public.profiles 
        SET account_status = 'active',
            payment_approved_at = NOW(),
            temporary_expires_at = NULL,
            temporary_reason = NULL
        WHERE id = user_id;
        
        -- Update all enrollments to active status
        UPDATE public.enrollments 
        SET status = 'enrollment_active',
            approved_at = NOW()
        WHERE user_id = promote_temporary_account.user_id 
          AND status = 'payment_approved';
        
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Create function to check if account is expired
CREATE OR REPLACE FUNCTION public.is_account_expired(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    profile_record RECORD;
BEGIN
    SELECT account_status, temporary_expires_at 
    INTO profile_record 
    FROM public.profiles 
    WHERE id = user_id;
    
    IF NOT FOUND THEN
        RETURN TRUE; -- Consider non-existent profiles as expired
    END IF;
    
    -- Check if temporary account is expired
    IF profile_record.account_status = 'temporary' AND 
       profile_record.temporary_expires_at IS NOT NULL AND
       profile_record.temporary_expires_at < NOW() THEN
        
        -- Mark as expired
        UPDATE public.profiles 
        SET account_status = 'expired' 
        WHERE id = user_id;
        
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Create function to get account access level
CREATE OR REPLACE FUNCTION public.get_account_access_level(user_id UUID)
RETURNS TEXT AS $$
DECLARE
    profile_record RECORD;
    is_expired BOOLEAN;
BEGIN
    -- Check if account is expired first
    SELECT public.is_account_expired(user_id) INTO is_expired;
    
    IF is_expired THEN
        RETURN 'expired';
    END IF;
    
    -- Get current account status
    SELECT account_status INTO profile_record FROM public.profiles WHERE id = user_id;
    
    IF NOT FOUND THEN
        RETURN 'none';
    END IF;
    
    CASE profile_record.account_status
        WHEN 'temporary' THEN RETURN 'limited';
        WHEN 'pending_payment' THEN RETURN 'limited';
        WHEN 'payment_submitted' THEN RETURN 'limited';
        WHEN 'active' THEN RETURN 'full';
        WHEN 'suspended' THEN RETURN 'suspended';
        WHEN 'expired' THEN RETURN 'expired';
        ELSE RETURN 'limited';
    END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 8: Update handle_new_user function to create temporary accounts
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (
        id, 
        full_name, 
        account_status, 
        temporary_reason,
        registration_metadata
    )
    VALUES (
        NEW.id, 
        NEW.raw_user_meta_data->>'full_name',
        'temporary',
        'registration_in_progress',
        jsonb_build_object(
            'created_at', NOW(),
            'email', NEW.email,
            'provider', 'email'
        )
    );
    RETURN NEW;
END;
$$;

-- Step 9: Create RLS policies for temporary accounts
CREATE POLICY "Users can view their own profile regardless of status"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile with restrictions"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
    auth.uid() = id AND
    -- Prevent users from directly changing their account status
    (account_status = OLD.account_status OR OLD.account_status IS NULL)
);

-- Step 10: Create view for account status info
CREATE OR REPLACE VIEW public.account_status_view AS
SELECT 
    p.id,
    p.full_name,
    p.account_status,
    p.temporary_expires_at,
    p.enrollment_completed_at,
    p.payment_approved_at,
    p.temporary_reason,
    CASE 
        WHEN p.account_status = 'temporary' AND p.temporary_expires_at < NOW() THEN 'expired'
        WHEN p.account_status = 'temporary' THEN 'temporary'
        WHEN p.account_status = 'active' THEN 'active'
        ELSE p.account_status::text
    END as effective_status,
    public.get_account_access_level(p.id) as access_level,
    -- Days remaining for temporary accounts
    CASE 
        WHEN p.account_status = 'temporary' AND p.temporary_expires_at IS NOT NULL THEN
            EXTRACT(DAYS FROM (p.temporary_expires_at - NOW()))
        ELSE NULL
    END as days_remaining
FROM public.profiles p;

-- Step 11: Update existing profiles to temporary status if they don't have active enrollments
UPDATE public.profiles 
SET account_status = 'temporary',
    temporary_reason = 'existing_user_migration'
WHERE account_status IS NULL
  AND id NOT IN (
    SELECT DISTINCT user_id 
    FROM public.enrollments 
    WHERE status = 'enrollment_active'
  );

-- Step 12: Grant necessary permissions
GRANT SELECT ON public.account_status_view TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_account_access_level(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_account_expired(UUID) TO authenticated;
