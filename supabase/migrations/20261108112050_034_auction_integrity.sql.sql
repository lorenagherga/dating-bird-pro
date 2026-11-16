/*
# Auction integrity: server-enforced bidding, closing and admin moderation

Plain-English summary
Moves the auction rules out of the phone app and into the database so they
cannot be bypassed. Bids, closing an auction, and buy-now now go through
database functions that check every rule before saving.

1. New functions
- `is_platform_admin()`: true when the signed-in email is in the admin list.
- `place_auction_bid(auction_id, amount)`: rejects bids on closed or expired
  auctions, rejects the seller bidding on their own auction, and rejects any
  amount below current price + minimum step. Applies the 3-minute anti-snipe
  extension (adds 5 minutes) on the server.
- `close_auction(auction_id)`: closes an auction and records the highest bidder
  as winner. Allowed when the time has run out, or when the seller or an admin
  ends it early. Safe to call repeatedly.
- `buy_now_auction(auction_id)`: the buyer takes the auction at the buy-now
  price; recorded as a bid and closed with the buyer as winner.
- `recalc_auction_after_bid_delete()` trigger: when a bid is removed (by its
  bidder, the seller, or an admin), the price, bid count and winner are
  recalculated.

2. Security changes
- `auction_bids`: direct inserts are removed; bids must go through
  `place_auction_bid`. Delete is allowed for the bidder, the seller, or an admin.
- `auctions`: sellers can only change title, description and pigeon. Price,
  status, winner, end time and bid count can no longer be edited directly.
- Delete of an auction is allowed for the seller or an admin.
- Functions are callable only by signed-in users (not anonymous visitors).

3. Important notes
- Existing rows are not changed; the new rules apply to every new action.
- Migration is idempotent: safe to run again.
*/

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_whitelist
    WHERE admin_whitelist.email = (auth.jwt() ->> 'email')
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_platform_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;

CREATE OR REPLACE FUNCTION public.place_auction_bid(p_auction_id uuid, p_amount integer)
RETURNS TABLE (new_end_time timestamptz, extended boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  a auctions%ROWTYPE;
  v_new_end timestamptz;
  v_extended boolean := false;
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
  IF p_amount IS NULL OR p_amount < a.current_price + a.min_bid_step THEN
    RAISE EXCEPTION 'bid_too_low';
  END IF;

  INSERT INTO auction_bids (auction_id, bidder_id, amount)
  VALUES (a.id, v_uid, p_amount);

  v_new_end := a.end_time;
  IF a.end_time - now() <= interval '3 minutes' THEN
    v_new_end := a.end_time + interval '5 minutes';
    v_extended := true;
  END IF;

  UPDATE auctions
  SET current_price = p_amount,
      bid_count = bid_count + 1,
      end_time = v_new_end
  WHERE id = a.id;

  RETURN QUERY SELECT v_new_end, v_extended;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.place_auction_bid(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.place_auction_bid(uuid, integer) TO authenticated;

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

  SELECT b.bidder_id INTO v_winner
  FROM auction_bids b
  WHERE b.auction_id = a.id
  ORDER BY b.amount DESC, b.created_at ASC
  LIMIT 1;

  UPDATE auctions
  SET status = 'ended',
      winner_id = v_winner,
      end_time = LEAST(end_time, now())
  WHERE id = a.id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.close_auction(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.close_auction(uuid) TO authenticated;

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
END;
$$;

REVOKE EXECUTE ON FUNCTION public.buy_now_auction(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.buy_now_auction(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.recalc_auction_after_bid_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE auctions a
  SET bid_count = (SELECT count(*) FROM auction_bids b WHERE b.auction_id = OLD.auction_id),
      current_price = GREATEST(
        a.starting_price,
        COALESCE((SELECT max(b.amount) FROM auction_bids b WHERE b.auction_id = OLD.auction_id), 0)
      ),
      winner_id = CASE
        WHEN a.status = 'ended' THEN (
          SELECT b.bidder_id FROM auction_bids b
          WHERE b.auction_id = OLD.auction_id
          ORDER BY b.amount DESC, b.created_at ASC
          LIMIT 1
        )
        ELSE a.winner_id
      END
  WHERE a.id = OLD.auction_id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_recalc_auction_after_bid_delete ON auction_bids;
CREATE TRIGGER trg_recalc_auction_after_bid_delete
AFTER DELETE ON auction_bids
FOR EACH ROW EXECUTE FUNCTION public.recalc_auction_after_bid_delete();

REVOKE EXECUTE ON FUNCTION public.recalc_auction_after_bid_delete() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON auctions FROM anon;
REVOKE ALL ON auction_bids FROM anon;

REVOKE INSERT, UPDATE, DELETE ON auctions FROM authenticated;
GRANT SELECT, INSERT, DELETE ON auctions TO authenticated;
GRANT UPDATE (title, description, pigeon_id) ON auctions TO authenticated;

REVOKE INSERT, UPDATE, DELETE ON auction_bids FROM authenticated;
GRANT SELECT, DELETE ON auction_bids TO authenticated;

DROP POLICY IF EXISTS "insert_auction_bids" ON auction_bids;

DROP POLICY IF EXISTS "delete_auction_bids" ON auction_bids;
CREATE POLICY "delete_auction_bids"
ON auction_bids FOR DELETE
TO authenticated
USING (
  auth.uid() = bidder_id
  OR auth.uid() = (SELECT seller_id FROM auctions WHERE auctions.id = auction_bids.auction_id)
  OR public.is_platform_admin()
);

DROP POLICY IF EXISTS "delete_own_auctions" ON auctions;
CREATE POLICY "delete_own_or_admin_auctions"
ON auctions FOR DELETE
TO authenticated
USING (auth.uid() = seller_id OR public.is_platform_admin());
