
-- Allow admins to update any profile (for payment management)
CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());
