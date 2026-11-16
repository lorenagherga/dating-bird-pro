/*
# Paid auction promotion (promoted listings)

## 1. Summary
Sellers can promote one of their auctions. Promoted auctions always appear at the top of the auction lists, highlighted with a gold frame and a PROMOTED label.
Ambassadors and admins promote for free. Other sellers request a promotion for a fee; the platform owner confirms the payment and activates it manually.

## 2. New table
- promotion_pricing: single-row table holding the current promotion fee in lei (default 25). Only the platform owner can change it, through set_promotion_fee.

## 3. Changed table
- auctions gets three columns:
  - is_promoted (boolean, default false): the auction is currently promoted.
  - promotion_requested (boolean, default false): a paid seller asked for promotion and it is waiting for payment confirmation.
  - promoted_at (timestamp): when promotion was activated.
- Sellers can no longer insert or change these columns directly. The app inserts only the columns it always used; promotion changes go through functions.

## 4. Functions
- request_auction_promotion(auction, enable): called by the seller. Free promoters are activated immediately. Other sellers are marked as requested. A seller cannot remove a promotion the owner has activated on a paid listing.
- set_auction_promoted(auction, promoted): platform owner only. Turns the promoted status on or off for any auction.
- set_promotion_fee(fee): platform owner only.
- has_free_promotion(user): internal check for ambassador or admin accounts.

## 5. Security
- RLS on promotion_pricing: signed-in users can read; nobody can write directly.
- Table-level INSERT on auctions is replaced with a column-level list so the promotion columns cannot be set by the app.
- Functions are not callable by anonymous visitors.

## 6. Important notes
1. Payment happens outside the app. The owner confirms it and then uses the promotion switch in the admin panel.
2. Changing the fee does not change existing requests or active promotions.
*/

CREATE TABLE IF NOT EXISTS public.promotion_pricing (
  id int PRIMARY KEY CHECK (id = 1),
  fee_lei numeric(10,2) NOT NULL CHECK (fee_lei >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.promotion_pricing (id, fee_lei)
VALUES (1, 25)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.promotion_pricing ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.promotion_pricing TO authenticated;

DROP POLICY IF EXISTS "select_promotion_pricing" ON public.promotion_pricing;
CREATE POLICY "select_promotion_pricing" ON public.promotion_pricing
  FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.set_promotion_fee(p_fee numeric)
RETURNS public.promotion_pricing
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  result public.promotion_pricing;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  UPDATE public.promotion_pricing
  SET fee_lei = p_fee, updated_at = now()
  WHERE id = 1
  RETURNING * INTO result;

  RETURN result;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.set_promotion_fee(numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_promotion_fee(numeric) TO authenticated;

ALTER TABLE public.auctions ADD COLUMN IF NOT EXISTS is_promoted boolean NOT NULL DEFAULT false;
ALTER TABLE public.auctions ADD COLUMN IF NOT EXISTS promotion_requested boolean NOT NULL DEFAULT false;
ALTER TABLE public.auctions ADD COLUMN IF NOT EXISTS promoted_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_auctions_promoted_created ON public.auctions (is_promoted DESC, created_at DESC);

REVOKE INSERT ON public.auctions FROM authenticated;
GRANT INSERT (seller_id, pigeon_id, title, description, starting_price, min_bid_step, current_price, end_time, status, bid_count, buy_now_price) ON public.auctions TO authenticated;

CREATE OR REPLACE FUNCTION public.has_free_promotion(p_user uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.vip_list v ON lower(v.email) = lower(p.email)
    WHERE p.id = p_user AND v.badge = 'ambassador'
  )
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.admin_whitelist w ON lower(w.email) = lower(p.email)
    WHERE p.id = p_user
  );
$$;

REVOKE EXECUTE ON FUNCTION public.has_free_promotion(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.request_auction_promotion(p_auction_id uuid, p_enable boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  a auctions%ROWTYPE;
  v_free boolean;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT * INTO a FROM auctions WHERE id = p_auction_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'auction_not_found';
  END IF;
  IF a.seller_id <> v_uid THEN
    RAISE EXCEPTION 'not_allowed' USING ERRCODE = '42501';
  END IF;
  IF a.status <> 'active' OR a.end_time <= now() THEN
    RAISE EXCEPTION 'auction_closed';
  END IF;

  v_free := public.has_free_promotion(v_uid);

  IF p_enable THEN
    IF v_free THEN
      UPDATE auctions
      SET is_promoted = true,
          promotion_requested = false,
          promoted_at = COALESCE(promoted_at, now())
      WHERE id = a.id;
    ELSIF NOT a.is_promoted THEN
      UPDATE auctions SET promotion_requested = true WHERE id = a.id;
    END IF;
  ELSE
    IF a.is_promoted AND NOT v_free THEN
      RAISE EXCEPTION 'promotion_paid';
    END IF;
    UPDATE auctions
    SET is_promoted = false,
        promotion_requested = false,
        promoted_at = NULL
    WHERE id = a.id;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.request_auction_promotion(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_auction_promotion(uuid, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_auction_promoted(p_auction_id uuid, p_promoted boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  UPDATE auctions
  SET is_promoted = p_promoted,
      promotion_requested = false,
      promoted_at = CASE WHEN p_promoted THEN COALESCE(promoted_at, now()) ELSE NULL END
  WHERE id = p_auction_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'auction_not_found';
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_auction_promoted(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_auction_promoted(uuid, boolean) TO authenticated;
