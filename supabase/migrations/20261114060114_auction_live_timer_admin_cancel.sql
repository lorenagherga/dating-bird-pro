/*
# Auction live timer rules: 5-minute extension window and admin cancel

1. Changes
- place_auction_bid: the automatic extension window is now 5 minutes (was 3). A bid placed when less than 5 minutes remain extends the end time by 5 minutes.
- New function admin_cancel_auction(auction id): lets a platform admin stop an active auction immediately. The auction status becomes 'cancelled', its end time is set to now, and no sale is recorded.

2. Security
- admin_cancel_auction is SECURITY DEFINER and checks is_platform_admin() before doing anything.
- EXECUTE is revoked from PUBLIC and anon and granted only to authenticated.

3. Notes
- Existing bids and history are kept untouched.
- close_auction remains the only function that records a sale.
*/

CREATE OR REPLACE FUNCTION public.place_auction_bid(p_auction_id uuid, p_amount integer)
RETURNS TABLE(new_end_time timestamptz, extended boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  IF a.end_time - now() < interval '5 minutes' THEN
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
$function$;

CREATE OR REPLACE FUNCTION public.admin_cancel_auction(p_auction_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'not_allowed';
  END IF;

  UPDATE auctions
  SET status = 'cancelled',
      end_time = LEAST(end_time, now())
  WHERE id = p_auction_id AND status = 'active';
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.admin_cancel_auction(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_cancel_auction(uuid) TO authenticated;
