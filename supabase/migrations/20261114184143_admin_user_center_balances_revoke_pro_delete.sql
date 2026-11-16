/*
# Admin user center: wallet balances, revoke Pro, delete account

1. New Functions
- `admin_user_wallet_balances()` returns each user's commission wallet balance (sum of wallet entries).
- `admin_revoke_pro(p_user_id)` moves a user back to the trial plan and clears the Pro expiry.
- `admin_delete_user(p_user_id)` permanently deletes a user account; profile and dependent rows cascade from auth.users.

2. Security
- All three functions are SECURITY DEFINER and check the caller against `admin_whitelist` (same check as `admin_list_users`).
- EXECUTE is revoked from PUBLIC and anon; granted to authenticated only.
- `admin_delete_user` refuses to delete the caller's own account.

3. Notes
- No existing tables or columns are changed.
*/

CREATE OR REPLACE FUNCTION public.admin_user_wallet_balances()
RETURNS TABLE (user_id uuid, balance numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admin_whitelist w WHERE w.email = (auth.jwt() ->> 'email')) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT e.user_id, COALESCE(SUM(e.amount), 0)::numeric
  FROM public.commission_wallet_entries e
  GROUP BY e.user_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_revoke_pro(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admin_whitelist w WHERE w.email = (auth.jwt() ->> 'email')) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  UPDATE public.profiles
  SET subscription_plan = 'trial', pro_expires_at = NULL
  WHERE id = p_user_id;

  RETURN FOUND;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_delete_user(p_user_id uuid)
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
    RAISE EXCEPTION 'cannot delete own account' USING ERRCODE = '22023';
  END IF;

  DELETE FROM auth.users WHERE id = p_user_id;

  RETURN FOUND;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.admin_user_wallet_balances() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_user_wallet_balances() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_revoke_pro(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_revoke_pro(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_delete_user(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(uuid) TO authenticated;
