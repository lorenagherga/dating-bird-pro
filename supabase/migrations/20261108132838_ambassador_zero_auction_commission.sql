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
  v_seller_is_ambassador boolean;
BEGIN
  IF p_winner IS NULL OR p_amount IS NULL OR p_amount <= 0 THEN
    RETURN;
  END IF;

  SELECT value INTO v_rate FROM platform_settings WHERE key = 'auction_commission_rate';
  SELECT seller_id, title INTO v_seller, v_title FROM auctions WHERE id = p_auction_id;
  SELECT breeder_name INTO v_seller_name FROM profiles WHERE id = v_seller;
  SELECT breeder_name INTO v_winner_name FROM profiles WHERE id = p_winner;

  SELECT EXISTS (
    SELECT 1 FROM profiles p
    JOIN vip_list v ON lower(v.email) = lower(p.email)
    WHERE p.id = v_seller AND v.badge = 'ambassador'
  ) INTO v_seller_is_ambassador;

  IF v_seller_is_ambassador THEN
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

UPDATE public.auction_transactions t
SET commission_rate = 0,
    commission_amount = 0
WHERE EXISTS (
  SELECT 1 FROM public.profiles p
  JOIN public.vip_list v ON lower(v.email) = lower(p.email)
  WHERE p.id = t.seller_id AND v.badge = 'ambassador'
);
