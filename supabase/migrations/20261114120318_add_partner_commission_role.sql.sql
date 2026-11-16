/*
# Partner commission role and per-user commission roles

## 1. Summary
Adds a third commission role, "Partener", with a lower auction commission than the standard rate. Each account now has one commission role: Standard (default), Partner, or Ambassador. Platform admins choose the role per account. The partner rate is stored next to the standard rate in global settings and defaults to 2%.

## 2. New and modified tables
- `platform_settings`: new key `auction_partner_commission_rate` (default 2).
- `profiles`: new column `commission_role` (text, not null, default 'standard'; allowed values: standard, partner, ambassador). Only admins can change it, through a function.

## 3. Functions
- `effective_commission_role(user)`: returns 'ambassador' if the account is on the ambassador list (existing mechanism), otherwise the account's commission role. Not callable by app roles.
- `admin_set_user_commission_role(user, role)`: admin-only. Sets an account's commission role.
- `admin_list_users()`: now also returns each account's commission role.
- `record_auction_sale`: uses the rate for the seller's effective role (0% ambassador, partner rate, standard rate).
- `enforce_auction_commission_acceptance`: requires the accepted rate to match the rate for the seller's effective role.

## 4. Security
- `profiles.commission_role` is not granted to app roles for direct writes, so users cannot raise their own role.
- The role setter checks the admin whitelist and is executable only by signed-in users, not by anon or PUBLIC.
- Existing transactions keep the rate they were recorded with.

## 5. Important notes
1. Accounts already on the ambassador list stay ambassadors regardless of their commission role value.
2. Every existing account starts as Standard.
*/

INSERT INTO public.platform_settings (key, value)
VALUES ('auction_partner_commission_rate', 2)
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS commission_role text NOT NULL DEFAULT 'standard';

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_commission_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_commission_role_check
  CHECK (commission_role IN ('standard', 'partner', 'ambassador'));

CREATE OR REPLACE FUNCTION public.effective_commission_role(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  IF EXISTS (
    SELECT 1 FROM profiles p
    JOIN vip_list v ON lower(v.email) = lower(p.email)
    WHERE p.id = p_user_id AND v.badge = 'ambassador'
  ) THEN
    RETURN 'ambassador';
  END IF;

  SELECT p.commission_role INTO v_role FROM profiles p WHERE p.id = p_user_id;
  RETURN COALESCE(v_role, 'standard');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.effective_commission_role(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_user_commission_role(p_user_id uuid, p_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admin_whitelist w WHERE w.email = (auth.jwt() ->> 'email')) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  IF p_role NOT IN ('standard', 'partner', 'ambassador') THEN
    RAISE EXCEPTION 'invalid commission role';
  END IF;

  UPDATE public.profiles SET commission_role = p_role WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'user not found';
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_set_user_commission_role(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_user_commission_role(uuid, text) TO authenticated;

DROP FUNCTION IF EXISTS public.admin_list_users();

CREATE FUNCTION public.admin_list_users()
RETURNS TABLE (u_id uuid, u_breeder_name text, u_email text, u_created_at timestamptz, u_subscription_plan text, u_pro_expires_at timestamptz, u_commission_role text)
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
         p.subscription_plan, p.pro_expires_at, p.commission_role
  FROM public.profiles p
  LEFT JOIN auth.users au ON au.id = p.id
  ORDER BY COALESCE(au.created_at, p.created_at) DESC;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.admin_list_users() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;

CREATE OR REPLACE FUNCTION public.record_auction_sale(p_auction_id uuid, p_winner uuid, p_amount numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rate numeric;
  v_seller uuid;
  v_title text;
  v_seller_name text;
  v_winner_name text;
  v_role text;
BEGIN
  IF p_winner IS NULL OR p_amount IS NULL OR p_amount <= 0 THEN
    RETURN;
  END IF;

  SELECT seller_id, title INTO v_seller, v_title FROM auctions WHERE id = p_auction_id;
  SELECT breeder_name INTO v_seller_name FROM profiles WHERE id = v_seller;
  SELECT breeder_name INTO v_winner_name FROM profiles WHERE id = p_winner;

  v_role := public.effective_commission_role(v_seller);

  SELECT value INTO v_rate FROM platform_settings
  WHERE key = CASE v_role
    WHEN 'ambassador' THEN NULL
    WHEN 'partner' THEN 'auction_partner_commission_rate'
    ELSE 'auction_commission_rate'
  END;

  IF v_role = 'ambassador' THEN
    v_rate := 0;
  END IF;

  INSERT INTO auction_transactions (
    auction_id, auction_title, seller_id, seller_name, winner_id, winner_name,
    sale_amount, commission_rate, commission_amount
  )
  VALUES (
    p_auction_id, v_title, v_seller, v_seller_name, p_winner, v_winner_name,
    p_amount, v_rate, round(p_amount * v_rate / 100, 2)
  )
  ON CONFLICT (auction_id) DO NOTHING;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.record_auction_sale(uuid, uuid, numeric) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.enforce_auction_commission_acceptance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rate numeric;
  v_role text;
BEGIN
  v_role := public.effective_commission_role(NEW.seller_id);

  IF v_role = 'ambassador' THEN
    NEW.commission_rate_accepted := 0;
    NEW.commission_accepted_at := COALESCE(NEW.commission_accepted_at, now());
    RETURN NEW;
  END IF;

  IF NEW.commission_accepted_at IS NULL THEN
    RAISE EXCEPTION 'commission_not_accepted';
  END IF;

  SELECT value INTO v_rate FROM platform_settings
  WHERE key = CASE v_role
    WHEN 'partner' THEN 'auction_partner_commission_rate'
    ELSE 'auction_commission_rate'
  END;

  IF NEW.commission_rate_accepted IS DISTINCT FROM v_rate THEN
    RAISE EXCEPTION 'commission_rate_changed';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enforce_auction_commission_acceptance() FROM PUBLIC, anon, authenticated;
