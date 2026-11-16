/*
# Use the commission rate saved on each auction when recording a sale

1. Modified functions
- `record_auction_sale`: the commission percentage is now taken from the auction's saved rate (`commission_rate_accepted`, set when the seller published it). The live platform setting is only used as a fallback for older auctions without a saved rate.
- Ambassadors still pay 0%.

2. Why
- Auctions created while the commission was 0% (free launch) must stay at 0% until they end, even if the admin later changes the rate to 5% or 8%.

3. Security
- No table, policy or grant changes. The function keeps its existing SECURITY DEFINER settings and privileges.

4. Notes
- The function is replaced with CREATE OR REPLACE, so it is safe to re-run.
*/

CREATE OR REPLACE FUNCTION public.record_auction_sale(p_auction_id uuid, p_winner uuid, p_amount numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_rate numeric;
  v_saved_rate numeric;
  v_commission numeric;
  v_seller uuid;
  v_title text;
  v_seller_name text;
  v_winner_name text;
  v_role text;
BEGIN
  IF p_winner IS NULL OR p_amount IS NULL OR p_amount <= 0 THEN
    RETURN;
  END IF;

  SELECT seller_id, title, commission_rate_accepted
    INTO v_seller, v_title, v_saved_rate
  FROM auctions WHERE id = p_auction_id;
  SELECT breeder_name INTO v_seller_name FROM profiles WHERE id = v_seller;
  SELECT breeder_name INTO v_winner_name FROM profiles WHERE id = p_winner;

  v_role := public.effective_commission_role(v_seller);

  IF v_role = 'ambassador' THEN
    v_rate := 0;
  ELSIF v_saved_rate IS NOT NULL THEN
    v_rate := v_saved_rate;
  ELSE
    SELECT value INTO v_rate FROM platform_settings
    WHERE key = CASE WHEN v_role = 'partner' THEN 'auction_partner_commission_rate' ELSE 'auction_commission_rate' END;
  END IF;

  v_commission := round(p_amount * COALESCE(v_rate, 0) / 100, 2);

  INSERT INTO auction_transactions (
    auction_id, auction_title, seller_id, seller_name, winner_id, winner_name,
    sale_amount, commission_rate, commission_amount
  )
  VALUES (
    p_auction_id, v_title, v_seller, v_seller_name, p_winner, v_winner_name,
    p_amount, COALESCE(v_rate, 0), v_commission
  )
  ON CONFLICT (auction_id) DO NOTHING;

  IF FOUND AND v_commission > 0 THEN
    INSERT INTO commission_wallet_entries (user_id, kind, amount, auction_id, note)
    VALUES (v_seller, 'commission', -v_commission, p_auction_id, 'Comision licitatie: ' || v_title);
  END IF;
END;
$function$;
