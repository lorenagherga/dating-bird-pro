CREATE OR REPLACE FUNCTION is_admin(p_email text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_whitelist WHERE email = p_email
  );
$$;

-- Allow admins to read and update all support tickets
CREATE POLICY "admin_select_all_tickets" ON support_tickets FOR SELECT
  TO authenticated USING (is_admin(auth.jwt() ->> 'email'));
CREATE POLICY "admin_update_all_tickets" ON support_tickets FOR UPDATE
  TO authenticated USING (is_admin(auth.jwt() ->> 'email'));
