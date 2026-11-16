/*
# Invite 3 friends = 2 months Pro free

1. Plain-English summary
- Users get an invite code (PF-XXXXX). Friends who sign up with it are linked to them.
- A friend counts only once they have an annual Pro subscription recorded by an admin (invite_paid_at).
- Every batch of friends who have paid (default 3) grants the referrer a bonus (default 60 days of Pro).
- The whole program is switched ON/OFF from the admin panel and is OFF by default.

2. New columns on profiles
- invite_code (text, unique, always set): the user's personal code, generated automatically on profile creation.
- referred_by (uuid, nullable, references profiles.id): the user who invited this profile.
- invite_paid_at (timestamptz, nullable): first time an annual Pro subscription was recorded for this profile.

3. New settings
- platform_settings.invite_program_enabled (0 or 1, default 0).
- platform_settings.invite_required_friends (default 3, range 1-100).
- platform_text_settings.invite_bonus_days (default '60', range 1-365).

4. New table
- invite_rewards: one row per granted batch (referrer, batch number, days, who granted it). Unique per referrer and batch so a batch is never granted twice. RLS enabled, no client grants; only admin/definer functions touch it.

5. Functions
- invite_program_settings(): read-only settings for the app (anon and authenticated).
- check_invite_code(code): anon/authenticated check that a code exists and the program is ON (used before sign-up).
- apply_invite_code(code): authenticated user links their profile to a referrer (once, not to self).
- my_invite_summary(): the caller's own code and paid-friend count.
- admin_set_invite_settings(enabled, required, bonus_days): admin-only.
- admin_list_invite_referrers(), admin_list_invite_referees(): admin-only evidence lists.
- admin_validate_invite_rewards(referrer_id): admin-only manual grant of any earned, not-yet-granted batch.
- grant_invite_rewards(referrer_id, granted_by): internal; not callable by clients.
- admin_grant_pro_year is replaced: it now also stamps invite_paid_at on the paid user and, when the program is ON, grants any batch the referrer has just completed.

6. Security
- All admin functions check the admin whitelist from the JWT email, same as admin_grant_pro_year.
- Internal and trigger functions have EXECUTE revoked from PUBLIC, anon and authenticated.
- Settings are read only through invite_program_settings(), so no new anon policy is needed on settings tables.

7. Notes
- Idempotent: safe to re-run. No existing data is modified except new columns being filled with codes.
*/

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS invite_code text,
  ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS invite_paid_at timestamptz;

CREATE INDEX IF NOT EXISTS profiles_referred_by_idx ON public.profiles (referred_by);

CREATE OR REPLACE FUNCTION public.generate_unique_invite_code()
RETURNS text
LANGUAGE plpgsql
VOLATILE
SET search_path TO 'public'
AS $function$
DECLARE
  candidate text;
BEGIN
  LOOP
    candidate := 'PF-' || (
      SELECT string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::int, 1), '')
      FROM generate_series(1, 5)
    );
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.invite_code = candidate);
  END LOOP;
  RETURN candidate;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.generate_unique_invite_code() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.profiles_assign_invite_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.invite_code IS NULL THEN
    NEW.invite_code := public.generate_unique_invite_code();
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.profiles_assign_invite_code() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS profiles_assign_invite_code_trg ON public.profiles;
CREATE TRIGGER profiles_assign_invite_code_trg
BEFORE INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.profiles_assign_invite_code();

UPDATE public.profiles SET invite_code = public.generate_unique_invite_code() WHERE invite_code IS NULL;

ALTER TABLE public.profiles ALTER COLUMN invite_code SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_invite_code_key ON public.profiles (invite_code);

INSERT INTO public.platform_settings (key, value)
SELECT 'invite_program_enabled', 0
WHERE NOT EXISTS (SELECT 1 FROM public.platform_settings WHERE key = 'invite_program_enabled');

INSERT INTO public.platform_settings (key, value)
SELECT 'invite_required_friends', 3
WHERE NOT EXISTS (SELECT 1 FROM public.platform_settings WHERE key = 'invite_required_friends');

INSERT INTO public.platform_text_settings (key, value)
SELECT 'invite_bonus_days', '60'
WHERE NOT EXISTS (SELECT 1 FROM public.platform_text_settings WHERE key = 'invite_bonus_days');

CREATE TABLE IF NOT EXISTS public.invite_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  batch_no integer NOT NULL,
  bonus_days integer NOT NULL,
  granted_by text NOT NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (referrer_id, batch_no)
);

ALTER TABLE public.invite_rewards ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.invite_rewards FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.invite_program_settings()
RETURNS TABLE (enabled boolean, required_friends integer, bonus_days integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    COALESCE((SELECT s.value = 1 FROM public.platform_settings s WHERE s.key = 'invite_program_enabled'), false),
    COALESCE((SELECT s.value::integer FROM public.platform_settings s WHERE s.key = 'invite_required_friends'), 3),
    COALESCE((SELECT t.value::integer FROM public.platform_text_settings t WHERE t.key = 'invite_bonus_days'), 60)
$function$;

REVOKE EXECUTE ON FUNCTION public.invite_program_settings() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.invite_program_settings() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.check_invite_code(p_code text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_enabled boolean;
BEGIN
  SELECT s.enabled INTO v_enabled FROM public.invite_program_settings() s;
  IF NOT COALESCE(v_enabled, false) THEN
    RETURN false;
  END IF;
  RETURN EXISTS (SELECT 1 FROM public.profiles p WHERE p.invite_code = upper(btrim(p_code)));
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.check_invite_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_invite_code(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.apply_invite_code(p_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_enabled boolean;
  v_referrer uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT s.enabled INTO v_enabled FROM public.invite_program_settings() s;
  IF NOT COALESCE(v_enabled, false) THEN
    RAISE EXCEPTION 'invite program disabled' USING ERRCODE = '22023';
  END IF;

  SELECT p.id INTO v_referrer FROM public.profiles p WHERE p.invite_code = upper(btrim(p_code));
  IF v_referrer IS NULL THEN
    RAISE EXCEPTION 'invalid invite code' USING ERRCODE = '22023';
  END IF;

  IF v_referrer = auth.uid() THEN
    RAISE EXCEPTION 'own invite code' USING ERRCODE = '22023';
  END IF;

  UPDATE public.profiles p
  SET referred_by = v_referrer
  WHERE p.id = auth.uid() AND p.referred_by IS NULL;

  RETURN FOUND;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.apply_invite_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_invite_code(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.my_invite_summary()
RETURNS TABLE (invite_code text, friends_paid integer, required_friends integer, bonus_days integer, enabled boolean)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_enabled boolean;
  v_required integer;
  v_bonus integer;
BEGIN
  SELECT s.enabled, s.required_friends, s.bonus_days
  INTO v_enabled, v_required, v_bonus
  FROM public.invite_program_settings() s;

  RETURN QUERY
  SELECT
    p.invite_code,
    (SELECT count(*)::integer FROM public.profiles f WHERE f.referred_by = p.id AND f.invite_paid_at IS NOT NULL),
    v_required,
    v_bonus,
    COALESCE(v_enabled, false)
  FROM public.profiles p
  WHERE p.id = auth.uid();
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.my_invite_summary() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_invite_summary() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_invite_settings(p_enabled boolean, p_required_friends integer, p_bonus_days integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admin_whitelist w WHERE w.email = (auth.jwt() ->> 'email')) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  IF p_enabled IS NULL THEN
    RAISE EXCEPTION 'invalid enabled flag' USING ERRCODE = '22023';
  END IF;

  IF p_required_friends IS NULL OR p_required_friends < 1 OR p_required_friends > 100 THEN
    RAISE EXCEPTION 'invalid required friends' USING ERRCODE = '22023';
  END IF;

  IF p_bonus_days IS NULL OR p_bonus_days < 1 OR p_bonus_days > 365 THEN
    RAISE EXCEPTION 'invalid bonus days' USING ERRCODE = '22023';
  END IF;

  UPDATE public.platform_settings SET value = CASE WHEN p_enabled THEN 1 ELSE 0 END WHERE key = 'invite_program_enabled';
  UPDATE public.platform_settings SET value = p_required_friends WHERE key = 'invite_required_friends';
  UPDATE public.platform_text_settings SET value = p_bonus_days::text WHERE key = 'invite_bonus_days';
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.admin_set_invite_settings(boolean, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_invite_settings(boolean, integer, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.grant_invite_rewards(p_referrer_id uuid, p_granted_by text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_required integer;
  v_bonus integer;
  v_paid integer;
  v_earned integer;
  v_batch integer;
  v_granted integer := 0;
BEGIN
  SELECT s.required_friends, s.bonus_days INTO v_required, v_bonus
  FROM public.invite_program_settings() s;

  IF v_required IS NULL OR v_required < 1 OR v_bonus IS NULL OR v_bonus < 1 THEN
    RETURN 0;
  END IF;

  SELECT count(*)::integer INTO v_paid
  FROM public.profiles f
  WHERE f.referred_by = p_referrer_id AND f.invite_paid_at IS NOT NULL;

  v_earned := v_paid / v_required;

  SELECT COALESCE(max(ir.batch_no), 0) INTO v_batch
  FROM public.invite_rewards ir
  WHERE ir.referrer_id = p_referrer_id;

  WHILE v_batch < v_earned LOOP
    v_batch := v_batch + 1;

    INSERT INTO public.invite_rewards (referrer_id, batch_no, bonus_days, granted_by)
    VALUES (p_referrer_id, v_batch, v_bonus, p_granted_by);

    UPDATE public.profiles p
    SET subscription_plan = 'pro',
        pro_expires_at = CASE
          WHEN p.subscription_plan = 'pro' AND p.pro_expires_at IS NULL THEN NULL
          ELSE GREATEST(COALESCE(p.pro_expires_at, now()), now()) + make_interval(days => v_bonus)
        END
    WHERE p.id = p_referrer_id;

    v_granted := v_granted + 1;
  END LOOP;

  RETURN v_granted;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.grant_invite_rewards(uuid, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_grant_pro_year(p_user_id uuid)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_expiry timestamptz;
  v_referrer uuid;
  v_enabled boolean;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admin_whitelist w WHERE w.email = (auth.jwt() ->> 'email')) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  UPDATE public.profiles p
  SET subscription_plan = 'pro',
      pro_expires_at = CASE
        WHEN p.subscription_plan = 'pro' AND p.pro_expires_at IS NULL THEN NULL
        ELSE GREATEST(COALESCE(p.pro_expires_at, now()), now()) + interval '365 days'
      END,
      invite_paid_at = COALESCE(p.invite_paid_at, now())
  WHERE p.id = p_user_id
  RETURNING p.pro_expires_at, p.referred_by INTO new_expiry, v_referrer;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'user not found';
  END IF;

  IF v_referrer IS NOT NULL THEN
    SELECT s.enabled INTO v_enabled FROM public.invite_program_settings() s;
    IF COALESCE(v_enabled, false) THEN
      PERFORM public.grant_invite_rewards(v_referrer, 'auto');
    END IF;
  END IF;

  RETURN new_expiry;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.admin_grant_pro_year(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_grant_pro_year(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_validate_invite_rewards(p_referrer_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admin_whitelist w WHERE w.email = (auth.jwt() ->> 'email')) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  RETURN public.grant_invite_rewards(p_referrer_id, auth.jwt() ->> 'email');
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.admin_validate_invite_rewards(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_validate_invite_rewards(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_list_invite_referrers()
RETURNS TABLE (
  referrer_id uuid,
  referrer_email text,
  referrer_name text,
  invite_code text,
  friends_joined integer,
  friends_paid integer,
  rewards_granted integer,
  ready_batches integer,
  required_friends integer,
  bonus_days integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_required integer;
  v_bonus integer;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admin_whitelist w WHERE w.email = (auth.jwt() ->> 'email')) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  SELECT s.required_friends, s.bonus_days INTO v_required, v_bonus
  FROM public.invite_program_settings() s;

  RETURN QUERY
  WITH stats AS (
    SELECT f.referred_by AS rid,
           count(*)::integer AS joined,
           (count(*) FILTER (WHERE f.invite_paid_at IS NOT NULL))::integer AS paid
    FROM public.profiles f
    WHERE f.referred_by IS NOT NULL
    GROUP BY f.referred_by
  ),
  granted AS (
    SELECT ir.referrer_id AS rid, count(*)::integer AS batches
    FROM public.invite_rewards ir
    GROUP BY ir.referrer_id
  )
  SELECT
    r.id,
    r.email::text,
    COALESCE(r.breeder_name, r.full_name)::text,
    r.invite_code,
    s.joined,
    s.paid,
    COALESCE(g.batches, 0),
    GREATEST(0, (s.paid / v_required) - COALESCE(g.batches, 0)),
    v_required,
    v_bonus
  FROM stats s
  JOIN public.profiles r ON r.id = s.rid
  LEFT JOIN granted g ON g.rid = s.rid
  ORDER BY s.paid DESC, s.joined DESC;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.admin_list_invite_referrers() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_invite_referrers() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_list_invite_referees()
RETURNS TABLE (
  referrer_id uuid,
  referee_name text,
  referee_email text,
  joined_at timestamptz,
  is_paid boolean,
  is_active boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admin_whitelist w WHERE w.email = (auth.jwt() ->> 'email')) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    f.referred_by,
    COALESCE(f.breeder_name, f.full_name)::text,
    f.email::text,
    f.created_at,
    f.invite_paid_at IS NOT NULL,
    (f.invite_paid_at IS NOT NULL
      AND f.subscription_plan = 'pro'
      AND (f.pro_expires_at IS NULL OR f.pro_expires_at > now()))
  FROM public.profiles f
  WHERE f.referred_by IS NOT NULL
  ORDER BY f.created_at DESC;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.admin_list_invite_referees() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_invite_referees() TO authenticated;
