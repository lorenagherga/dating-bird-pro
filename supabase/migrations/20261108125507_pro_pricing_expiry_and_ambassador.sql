/*
# Pro pricing, Pro expiry, Ambassador VIP and public badges

## What changes
1. New table `pro_pricing` holds the single current price of the Pro annual plan (60 lei / 10 EUR launch price). Only the super admin can change it, through the function `set_pro_pricing`.
2. `profiles` gets `pro_expires_at`. Pro granted by the admin lasts 365 days from the grant. Empty means no expiry.
3. New function `admin_grant_pro_year(user_id)` gives an account 365 days of Pro. Only whitelisted admins can call it.
4. `admin_list_users()` also returns the plan and expiry date of every account.
5. `vip_list` accepts the plan `pro`, and gets a `badge` column. The Ambassador entry for raduloft@gmail.com is permanent VIP (no expiry).
6. New view `public_profiles` exposes only id, display name and badge of every account, so chat and auction names and trophy badges can be shown for other users.

## Security changes
- Users can no longer change their own `subscription_plan`, `pro_expires_at` or other plan fields. Their UPDATE privilege on `profiles` is limited to profile columns (name, phone, location, language, pigeon type and categories).
- `pro_pricing`: readable by signed-in users, writable only through `set_pro_pricing`, which checks the super admin email.
- `set_pro_pricing` and `admin_grant_pro_year` are not callable by anonymous visitors.
- `public_profiles` is a view that runs with owner rights, but it only returns three columns that are meant to be public.

## Notes
1. Accounts created before this migration keep their current plan. Pro accounts with no expiry date stay Pro permanently.
2. The super admin email for pricing is the same one used by the commission feature.
*/

CREATE TABLE IF NOT EXISTS public.pro_pricing (
  id int PRIMARY KEY CHECK (id = 1),
  annual_price_lei numeric(10,2) NOT NULL CHECK (annual_price_lei >= 0),
  annual_price_eur numeric(10,2) NOT NULL CHECK (annual_price_eur >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.pro_pricing (id, annual_price_lei, annual_price_eur)
VALUES (1, 60, 10)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.pro_pricing ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.pro_pricing TO authenticated;

DROP POLICY IF EXISTS "select_pro_pricing" ON public.pro_pricing;
CREATE POLICY "select_pro_pricing" ON public.pro_pricing
  FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.set_pro_pricing(p_lei numeric, p_eur numeric)
RETURNS public.pro_pricing
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result public.pro_pricing;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  UPDATE public.pro_pricing
  SET annual_price_lei = p_lei, annual_price_eur = p_eur, updated_at = now()
  WHERE id = 1
  RETURNING * INTO result;

  RETURN result;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.set_pro_pricing(numeric, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_pro_pricing(numeric, numeric) TO authenticated;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pro_expires_at timestamptz;

REVOKE UPDATE ON public.profiles FROM anon, authenticated;
GRANT UPDATE (breeder_name, phone, location, language, pigeon_type, pigeon_categories) ON public.profiles TO authenticated;

ALTER TABLE public.vip_list DROP CONSTRAINT IF EXISTS vip_list_plan_check;
ALTER TABLE public.vip_list ADD CONSTRAINT vip_list_plan_check
  CHECK (plan IN ('hobby', 'standard', 'professional', 'pro'));

ALTER TABLE public.vip_list ADD COLUMN IF NOT EXISTS badge text CHECK (badge IN ('ambassador'));

INSERT INTO public.vip_list (email, plan, reason, badge)
VALUES ('raduloft@gmail.com', 'pro', 'Ambasador', 'ambassador')
ON CONFLICT (email) DO UPDATE SET plan = 'pro', reason = 'Ambasador', badge = 'ambassador';

CREATE OR REPLACE VIEW public.public_profiles AS
SELECT p.id, p.breeder_name, v.badge
FROM public.profiles p
LEFT JOIN public.vip_list v ON lower(v.email) = lower(p.email);

GRANT SELECT ON public.public_profiles TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_grant_pro_year(p_user_id uuid)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_expiry timestamptz;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admin_whitelist w WHERE w.email = (auth.jwt() ->> 'email')) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  UPDATE public.profiles p
  SET subscription_plan = 'pro',
      pro_expires_at = CASE
        WHEN p.subscription_plan = 'pro' AND p.pro_expires_at IS NULL THEN NULL
        ELSE GREATEST(COALESCE(p.pro_expires_at, now()), now()) + interval '365 days'
      END
  WHERE p.id = p_user_id
  RETURNING p.pro_expires_at INTO new_expiry;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'user not found';
  END IF;

  RETURN new_expiry;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.admin_grant_pro_year(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_grant_pro_year(uuid) TO authenticated;

DROP FUNCTION IF EXISTS public.admin_list_users();

CREATE FUNCTION public.admin_list_users()
RETURNS TABLE (u_id uuid, u_breeder_name text, u_email text, u_created_at timestamptz, u_subscription_plan text, u_pro_expires_at timestamptz)
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
         p.subscription_plan, p.pro_expires_at
  FROM public.profiles p
  LEFT JOIN auth.users au ON au.id = p.id
  ORDER BY COALESCE(au.created_at, p.created_at) DESC;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.admin_list_users() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;
