/*
# Account suspension and global launch settings

1. Modified Tables
- `profiles`: new column `is_suspended` (boolean, default false). Users cannot change it; only admins can, through a function.
- `platform_settings`: new row `free_launch_mode` (0 = off, 1 = on) and a default row for it.

2. New Tables
- `platform_text_settings`: key/value text settings for the platform. Holds the free-launch expiry date, the free-launch warning message, and payment details (IBAN, Revolut). Readable by everyone (including logged-out visitors, since the banner and payment details must be visible); writable only through `admin_set_text_setting`.

3. New / Replaced Functions
- `admin_set_user_suspended(uuid, boolean)`: suspends or reactivates an account and, when suspending, ends its active sessions.
- `admin_set_text_setting(text, text)`: updates one allowed text setting.
- `admin_list_users()`: recreated so it also returns `u_is_suspended`.

4. Security
- Admin-only functions check the caller against `admin_whitelist`.
- Admins cannot suspend their own account.
- `platform_text_settings` has RLS enabled; only SELECT is granted, and only on the public read policy.
- The new functions have EXECUTE revoked from PUBLIC and anon and granted to authenticated only.

5. Notes
- No data is deleted or changed in existing columns.
- `admin_list_users` is dropped and recreated only to change its return columns.
*/

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_suspended boolean NOT NULL DEFAULT false;

INSERT INTO public.platform_settings (key, value)
VALUES ('free_launch_mode', 0)
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.platform_text_settings (
  key text PRIMARY KEY,
  value text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_text_settings ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.platform_text_settings TO anon, authenticated;

DROP POLICY IF EXISTS "select_platform_text_settings" ON public.platform_text_settings;
CREATE POLICY "select_platform_text_settings"
ON public.platform_text_settings FOR SELECT
TO anon, authenticated
USING (true);

INSERT INTO public.platform_text_settings (key, value) VALUES
  ('free_launch_expires_on', ''),
  ('free_launch_message', ''),
  ('payment_iban', ''),
  ('payment_revolut', '')
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.admin_set_user_suspended(p_user_id uuid, p_suspended boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admin_whitelist w WHERE w.email = (auth.jwt() ->> 'email')) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'cannot suspend own account' USING ERRCODE = '22023';
  END IF;

  UPDATE public.profiles SET is_suspended = p_suspended WHERE id = p_user_id;

  IF p_suspended THEN
    DELETE FROM auth.sessions WHERE user_id = p_user_id;
  END IF;

  RETURN FOUND;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_set_text_setting(p_key text, p_value text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admin_whitelist w WHERE w.email = (auth.jwt() ->> 'email')) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  IF p_key NOT IN ('free_launch_expires_on', 'free_launch_message', 'payment_iban', 'payment_revolut') THEN
    RAISE EXCEPTION 'unknown setting' USING ERRCODE = '22023';
  END IF;

  UPDATE public.platform_text_settings
  SET value = COALESCE(p_value, ''), updated_at = now()
  WHERE key = p_key;

  RETURN FOUND;
END;
$function$;

DROP FUNCTION IF EXISTS public.admin_list_users();

CREATE FUNCTION public.admin_list_users()
RETURNS TABLE (u_id uuid, u_breeder_name text, u_email text, u_created_at timestamptz, u_subscription_plan text, u_pro_expires_at timestamptz, u_commission_role text, u_is_suspended boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admin_whitelist w WHERE w.email = (auth.jwt() ->> 'email')) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT p.id, p.breeder_name, p.email, COALESCE(au.created_at, p.created_at),
         p.subscription_plan, p.pro_expires_at, p.commission_role, p.is_suspended
  FROM public.profiles p
  LEFT JOIN auth.users au ON au.id = p.id
  ORDER BY COALESCE(au.created_at, p.created_at) DESC;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.admin_set_user_suspended(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_user_suspended(uuid, boolean) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_set_text_setting(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_text_setting(text, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_list_users() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;
