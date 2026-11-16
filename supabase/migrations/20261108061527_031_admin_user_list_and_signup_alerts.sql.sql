/*
# Admin user list and new-signup alerts

## What changes
1. New table `signup_notifications` stores one unread alert per newly created account (name, email, time).
2. A trigger on `profiles` creates that alert automatically whenever a new account is registered.
3. New function `admin_list_users()` returns every registered user (name, email, account creation time), newest first. It only works for emails listed in `admin_whitelist`.

## Security changes
- `signup_notifications`: row level security enabled. Only admins (whitelisted emails) can read and mark alerts as read. Regular users and anonymous visitors cannot access it. No insert or delete is granted to app users; only the trigger writes rows.
- `admin_list_users()`: checks the caller's email against `admin_whitelist` and raises "not authorized" otherwise. Execute is revoked from public and anonymous roles and granted only to signed-in users.
- No existing tables, policies, or sign-up behaviour are changed. Sign-up stays open, no approvals.

## Notes
1. Accounts created before this migration do not generate alerts, but they appear in the user list.
2. Alerts are shown inside the admin panel.
*/

CREATE TABLE IF NOT EXISTS public.signup_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  breeder_name text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.signup_notifications ENABLE ROW LEVEL SECURITY;

GRANT SELECT, UPDATE (is_read) ON public.signup_notifications TO authenticated;

DROP POLICY IF EXISTS "admin_select_signup_notifications" ON public.signup_notifications;
CREATE POLICY "admin_select_signup_notifications" ON public.signup_notifications
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_whitelist w WHERE w.email = (auth.jwt() ->> 'email')));

DROP POLICY IF EXISTS "admin_update_signup_notifications" ON public.signup_notifications;
CREATE POLICY "admin_update_signup_notifications" ON public.signup_notifications
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_whitelist w WHERE w.email = (auth.jwt() ->> 'email')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_whitelist w WHERE w.email = (auth.jwt() ->> 'email')));

CREATE OR REPLACE FUNCTION public.notify_new_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.signup_notifications (user_id, email, breeder_name)
  VALUES (NEW.id, NEW.email, NEW.breeder_name)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.notify_new_signup() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_profile_created_notify_signup ON public.profiles;
CREATE TRIGGER on_profile_created_notify_signup
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_signup();

CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE (u_id uuid, u_breeder_name text, u_email text, u_created_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admin_whitelist w WHERE w.email = (auth.jwt() ->> 'email')) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT p.id, p.breeder_name, p.email, COALESCE(au.created_at, p.created_at)
  FROM public.profiles p
  LEFT JOIN auth.users au ON au.id = p.id
  ORDER BY COALESCE(au.created_at, p.created_at) DESC;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.admin_list_users() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;
