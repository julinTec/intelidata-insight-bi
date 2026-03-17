
-- Add subscription fields to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_paid boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_status text NOT NULL DEFAULT 'trial';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan_type text DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trial_expires_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS paid_until timestamptz DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS payment_notes text DEFAULT NULL;

-- Update existing profiles: set trial_expires_at = created_at + 24 hours
UPDATE public.profiles SET trial_expires_at = created_at + interval '24 hours' WHERE trial_expires_at IS NULL;

-- Update handle_new_user trigger to set trial_expires_at
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, trial_expires_at)
  VALUES (new.id, new.email, new.raw_user_meta_data ->> 'full_name', NOW() + interval '24 hours');
  RETURN new;
END;
$$;

-- Ensure admin role for julio.cezar@redebloom.com.br
INSERT INTO public.user_roles (user_id, role)
SELECT p.id, 'admin'::app_role
FROM public.profiles p
WHERE p.email = 'julio.cezar@redebloom.com.br'
AND NOT EXISTS (
  SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role = 'admin'
);
