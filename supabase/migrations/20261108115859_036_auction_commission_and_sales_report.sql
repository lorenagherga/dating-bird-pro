/*
# Auction platform commission and sales report

## 1. Summary
Adds a platform commission on auctions (5% by default, editable by platform admins),
and records a transaction for every auction that closes with a winner. The owner account
can read all transactions in a report.

## 2. New tables
- `platform_settings`: key/value settings for the platform. Holds `auction_commission_rate` (percent, 0 to 100, default 5).
- `auction_transactions`: one row per auction that ended with a winner. Stores the sale amount, the commission rate applied at that moment, the commission amount, and the seller and winner names as they were at sale time.

## 3. Functions
- `is_super_admin()`: true only when the signed-in email is the platform owner.
- `record_auction_sale(auction, winner, amount)`: internal helper that writes one transaction using the current rate. Not callable from the app.
- `close_auction` and `buy_now_auction` now record the sale when a winner exists.
- Existing ended auctions with a winner are backfilled once (the current rate is used for them).

## 4. Security
- RLS enabled on both tables.
- `platform_settings`: signed-in users can read; only platform admins can change the rate, and only the value column.
- `auction_transactions`: readable only by the platform owner. No direct inserts, updates or deletes from the app.
- Transactions keep working if an auction is deleted (the link is cleared, the financial record stays).

## 5. Important notes
1. Commission is recorded, not collected. Payment between buyer and seller happens outside the app.
2. Changing the rate never changes past transactions; each keeps the rate used when it was created.
*/

CREATE TABLE IF NOT EXISTS public.platform_settings (
  key text PRIMARY KEY,
  value numeric NOT NULL CHECK (value >= 0 AND value <= 100),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

INSERT INTO public.platform_settings (key, value)
VALUES ('auction_commission_rate', 5)
ON CONFLICT (key) DO NOTHING;

GRANT SELECT ON public.platform_settings TO authenticated;
GRANT UPDATE (value, updated_at) ON public.platform_settings TO authenticated;

DROP POLICY IF EXISTS "select_platform_settings" ON public.platform_settings;
CREATE POLICY "select_platform_settings"
ON public.platform_settings FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "update_platform_settings_admin" ON public.platform_settings;
CREATE POLICY "update_platform_settings_admin"
ON public.platform_settings FOR UPDATE
TO authenticated
USING (public.is_platform_admin())
WITH CHECK (public.is_platform_admin());

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lower(coalesce(auth.jwt() ->> 'email', '')) = 'lorena.gherga@gmail.com'
$$;

REVOKE EXECUTE ON FUNCTION public.is_super_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;

CREATE TABLE IF NOT EXISTS public.auction_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id uuid UNIQUE REFERENCES public.auctions(id) ON DELETE SET NULL,
  auction_title text,
  seller_id uuid NOT NULL,
  seller_name text,
  winner_id uuid NOT NULL,
  winner_name text,
  sale_amount numeric NOT NULL CHECK (sale_amount >= 0),
  commission_rate numeric NOT NULL,
  commission_amount numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auction_transactions_created_at ON public.auction_transactions (created_at DESC);

ALTER TABLE public.auction_transactions ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.auction_transactions TO authenticated;

DROP POLICY IF EXISTS "select_auction_transactions_super_admin" ON public.auction_transactions;
CREATE POLICY "select_auction_transactions_super_admin"
ON public.auction_transactions FOR SELECT
TO authenticated
USING (public.is_super_admin());

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
BEGIN
  IF p_winner IS NULL OR p_amount IS NULL OR p_amount <= 0 THEN
    RETURN;
  END IF;

  SELECT value INTO v_rate FROM platform_settings WHERE key = 'auction_commission_rate';
  SELECT seller_id, title INTO v_seller, v_title FROM auctions WHERE id = p_auction_id;
  SELECT breeder_name INTO v_seller_name FROM profiles WHERE id = v_seller;
  SELECT breeder_name INTO v_winner_name FROM profiles WHERE id = p_winner;

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

CREATE OR REPLACE FUNCTION public.close_auction(p_auction_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  a auctions%ROWTYPE;
  v_winner uuid;
  v_amount numeric;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT * INTO a FROM auctions WHERE id = p_auction_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'auction_not_found';
  END IF;
  IF a.status <> 'active' THEN
    RETURN;
  END IF;
  IF NOT (a.end_time <= now() OR a.seller_id = v_uid OR public.is_platform_admin()) THEN
    RAISE EXCEPTION 'not_allowed';
  END IF;

  SELECT b.bidder_id, b.amount INTO v_winner, v_amount
  FROM auction_bids b
  WHERE b.auction_id = a.id
  ORDER BY b.amount DESC, b.created_at ASC
  LIMIT 1;

  UPDATE auctions
  SET status = 'ended',
      winner_id = v_winner,
      end_time = LEAST(end_time, now())
  WHERE id = a.id;

  PERFORM public.record_auction_sale(a.id, v_winner, v_amount);
END;
$$;

CREATE OR REPLACE FUNCTION public.buy_now_auction(p_auction_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  a auctions%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT * INTO a FROM auctions WHERE id = p_auction_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'auction_not_found';
  END IF;
  IF a.status <> 'active' OR a.end_time <= now() THEN
    RAISE EXCEPTION 'auction_closed';
  END IF;
  IF a.seller_id = v_uid THEN
    RAISE EXCEPTION 'own_auction';
  END IF;
  IF a.buy_now_price IS NULL OR a.buy_now_price <= 0 THEN
    RAISE EXCEPTION 'no_buy_now';
  END IF;

  INSERT INTO auction_bids (auction_id, bidder_id, amount)
  VALUES (a.id, v_uid, a.buy_now_price);

  UPDATE auctions
  SET current_price = a.buy_now_price,
      bid_count = bid_count + 1,
      status = 'ended',
      winner_id = v_uid,
      end_time = now()
  WHERE id = a.id;

  PERFORM public.record_auction_sale(a.id, v_uid, a.buy_now_price);
END;
$$;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT a.id, a.winner_id,
      (SELECT max(b.amount) FROM auction_bids b WHERE b.auction_id = a.id) AS amount
    FROM auctions a
    WHERE a.status = 'ended' AND a.winner_id IS NOT NULL
  LOOP
    PERFORM public.record_auction_sale(r.id, r.winner_id, r.amount);
  END LOOP;
END $$;
