/*
# Admin control center: auction moderation, partner benefits, announcements, reports

1. Modified tables
- `elite_breeders`: new boolean columns `benefit_free_pro`, `benefit_preferential_commission`, `benefit_top_placement` (default false). These drive the benefit badges on the public Partners page.
- `platform_settings`: new keys `auction_require_approval` (0/1) and `announcement_active` (0/1). Default 0 (off).
- `platform_text_settings`: new key `announcement_message` (empty by default).

2. New functions
- `admin_moderate_auction(p_auction_id, p_action)`: admin-only. Actions: `approve` (publishes a pending auction and keeps its original duration), `reject` (rejects a pending auction or stops an active one), `promote` (marks as promoted), `delete` (removes the auction).
- `admin_list_user_reports()`: admin-only. Returns the newest 200 user reports with reporter email, reported user email and auction title.
- `auctions_apply_approval_setting()`: trigger function. When `auction_require_approval` is 1, any new auction is stored as `pending_review` instead of `active`, so the server enforces the rule regardless of the app version.
- `admin_set_text_setting` is recreated so the whitelist also accepts `announcement_message`.

3. Security
- New RPCs are revoked from PUBLIC and anon and granted only to authenticated; they verify `is_platform_admin()` internally.
- The trigger function cannot be called by any client role.
- `platform_settings` gets an anon SELECT policy restricted to the `free_launch_mode` key only, so the free-launch banner can show on the login screens without exposing other pricing settings.

4. Important notes
- Auction approval uses `pending_review` status; the public auction list only shows `active` auctions, so pending ones stay hidden until approved.
- Existing auctions are not changed.
*/

ALTER TABLE public.elite_breeders
  ADD COLUMN IF NOT EXISTS benefit_free_pro boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS benefit_preferential_commission boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS benefit_top_placement boolean NOT NULL DEFAULT false;

INSERT INTO public.platform_settings (key, value)
SELECT 'auction_require_approval', 0
WHERE NOT EXISTS (SELECT 1 FROM public.platform_settings WHERE key = 'auction_require_approval');

INSERT INTO public.platform_settings (key, value)
SELECT 'announcement_active', 0
WHERE NOT EXISTS (SELECT 1 FROM public.platform_settings WHERE key = 'announcement_active');

INSERT INTO public.platform_text_settings (key, value)
SELECT 'announcement_message', ''
WHERE NOT EXISTS (SELECT 1 FROM public.platform_text_settings WHERE key = 'announcement_message');

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

IF p_key NOT IN ('free_launch_expires_on', 'free_launch_message', 'payment_iban', 'payment_revolut', 'announcement_message') THEN
RAISE EXCEPTION 'unknown setting' USING ERRCODE = '22023';
END IF;

UPDATE public.platform_text_settings
SET value = COALESCE(p_value, ''), updated_at = now()
WHERE key = p_key;

RETURN FOUND;
END;
$function$;

CREATE OR REPLACE FUNCTION public.auctions_apply_approval_setting()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
IF NEW.status = 'active' AND EXISTS (
SELECT 1 FROM public.platform_settings WHERE key = 'auction_require_approval' AND value = 1
) THEN
NEW.status := 'pending_review';
END IF;
RETURN NEW;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.auctions_apply_approval_setting() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS auctions_require_approval ON public.auctions;
CREATE TRIGGER auctions_require_approval
BEFORE INSERT ON public.auctions
FOR EACH ROW
EXECUTE FUNCTION public.auctions_apply_approval_setting();

CREATE OR REPLACE FUNCTION public.admin_moderate_auction(p_auction_id uuid, p_action text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
affected integer := 0;
BEGIN
IF NOT public.is_platform_admin() THEN
RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
END IF;

IF p_action = 'approve' THEN
UPDATE public.auctions
SET status = 'active',
end_time = now() + (end_time - created_at)
WHERE id = p_auction_id AND status = 'pending_review';
ELSIF p_action = 'reject' THEN
UPDATE public.auctions
SET status = CASE WHEN status = 'pending_review' THEN 'rejected' ELSE 'cancelled' END,
end_time = LEAST(end_time, now())
WHERE id = p_auction_id AND status IN ('pending_review', 'active');
ELSIF p_action = 'promote' THEN
UPDATE public.auctions
SET is_promoted = true, promoted_at = now(), promotion_requested = false
WHERE id = p_auction_id;
ELSIF p_action = 'delete' THEN
DELETE FROM public.auctions WHERE id = p_auction_id;
ELSE
RAISE EXCEPTION 'unknown action' USING ERRCODE = '22023';
END IF;

GET DIAGNOSTICS affected = ROW_COUNT;
RETURN affected > 0;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_list_user_reports()
RETURNS TABLE (
report_id uuid,
report_created_at timestamptz,
report_reason text,
reporter_email text,
reported_email text,
auction_title text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
IF NOT public.is_platform_admin() THEN
RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
END IF;

RETURN QUERY
SELECT r.id, r.created_at, r.reason, rp.email::text, dp.email::text, a.title
FROM public.user_reports r
LEFT JOIN public.profiles rp ON rp.id = r.reporter_id
LEFT JOIN public.profiles dp ON dp.id = r.reported_user_id
LEFT JOIN public.auctions a ON a.id = r.auction_id
ORDER BY r.created_at DESC
LIMIT 200;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.admin_moderate_auction(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_moderate_auction(uuid, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_list_user_reports() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_user_reports() TO authenticated;

GRANT SELECT ON public.platform_settings TO anon;

DROP POLICY IF EXISTS "select_free_launch_mode_anon" ON public.platform_settings;
CREATE POLICY "select_free_launch_mode_anon" ON public.platform_settings
FOR SELECT
TO anon
USING (key = 'free_launch_mode');
