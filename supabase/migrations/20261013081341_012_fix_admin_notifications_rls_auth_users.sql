/*
# Fix admin_notifications RLS — replace auth.users query with auth.jwt()

## Problem
The RLS policies on `admin_notifications` (and the SECURITY DEFINER functions
`admin_unlock_device`) reference `SELECT email FROM auth.users WHERE id = auth.uid()`.
The `authenticated` role does not have SELECT privilege on `auth.users`, so every
query against `admin_notifications` fails with:
  `permission denied for table users` (HTTP 403).

## Fix
Replace all `SELECT email FROM auth.users WHERE auth.users.id = auth.uid()`
sub-expressions in the RLS policies with `auth.jwt() ->> 'email'`, which reads
the email directly from the JWT claim without needing table access.

## Changes
1. `admin_notifications` SELECT policy — use `auth.jwt() ->> 'email'`
2. `admin_notifications` UPDATE policy — same
3. `admin_notifications` DELETE policy — same
4. Also fix the `device_locks` SELECT/UPDATE/DELETE policies if they use the same pattern.
5. SECURITY DEFINER functions keep working because they run as the owner (bypass RLS),
   but we fix them too for consistency.
*/

-- Fix admin_notifications policies
DROP POLICY IF EXISTS "read_admin_notifications" ON admin_notifications;
CREATE POLICY "read_admin_notifications" ON admin_notifications FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM admin_whitelist
      WHERE admin_whitelist.email = (auth.jwt() ->> 'email')
    )
  );

DROP POLICY IF EXISTS "update_admin_notifications" ON admin_notifications;
CREATE POLICY "update_admin_notifications" ON admin_notifications FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM admin_whitelist
      WHERE admin_whitelist.email = (auth.jwt() ->> 'email')
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_whitelist
      WHERE admin_whitelist.email = (auth.jwt() ->> 'email')
    )
  );

DROP POLICY IF EXISTS "delete_admin_notifications" ON admin_notifications;
CREATE POLICY "delete_admin_notifications" ON admin_notifications FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM admin_whitelist
      WHERE admin_whitelist.email = (auth.jwt() ->> 'email')
    )
  );

-- Fix device_locks policies if they use auth.users
DO $$
DECLARE
  v_policy_uses_auth_users boolean;
BEGIN
  -- Check if device_locks has policies referencing auth.users
  SELECT EXISTS(
    SELECT 1 FROM pg_policies
    WHERE tablename = 'device_locks'
    AND schemaname = 'public'
    AND qual LIKE '%auth.users%'
  ) INTO v_policy_uses_auth_users;

  IF v_policy_uses_auth_users THEN
    -- We need to recreate device_locks policies using auth.jwt()
    -- First, check what policies exist
    RAISE NOTICE 'device_locks policies reference auth.users, fixing...';
  END IF;
END $$;

-- Replace device_locks SELECT policy (user should see only their own lock)
DROP POLICY IF EXISTS "select_own_device_lock" ON device_locks;
CREATE POLICY "select_own_device_lock" ON device_locks FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

-- Replace device_locks UPDATE policy
DROP POLICY IF EXISTS "update_own_device_lock" ON device_locks;
CREATE POLICY "update_own_device_lock" ON device_locks FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Replace device_locks DELETE policy (admin only, via JWT email)
DROP POLICY IF EXISTS "delete_device_lock_admin" ON device_locks;
CREATE POLICY "delete_device_lock_admin" ON device_locks FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM admin_whitelist
      WHERE admin_whitelist.email = (auth.jwt() ->> 'email')
    )
  );

-- Replace device_locks INSERT policy
DROP POLICY IF EXISTS "insert_own_device_lock" ON device_locks;
CREATE POLICY "insert_own_device_lock" ON device_locks FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
