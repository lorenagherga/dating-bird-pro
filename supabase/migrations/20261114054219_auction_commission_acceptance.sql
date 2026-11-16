/*
# Auction commission acceptance per listing

## 1. Summary
Each auction now records the platform commission rate the seller accepted when publishing it, and the moment of acceptance. The database refuses to create a listing from a non-ambassador seller unless that acceptance matches the current global commission rate. Ambassadors are exempt and are recorded at 0%.

## 2. Modified tables
- `auctions`:
  - `commission_rate_accepted` (numeric, nullable): the commission percentage the seller accepted.
  - `commission_accepted_at` (timestamptz, nullable): when the seller accepted it.

## 3. Functions and triggers
- `enforce_auction_commission_acceptance()`: runs before each new auction is inserted.
  - Ambassador seller: stores 0% and the current time as acceptance.
  - Any other seller: requires an acceptance timestamp, and the accepted rate must equal the current value of `auction_commission_rate` in `platform_settings`. Otherwise the insert is rejected.

## 4. Security
- Columns granted to `authenticated` for reading and for inserting only (no updates to the accepted rate after publishing).
- The trigger function is not callable by any app role.

## 5. Important notes
1. Existing auctions are left unchanged; their acceptance fields stay empty.
2. The global rate is read from `platform_settings`, so the rate the seller sees and the rate stored at publication always come from the same source.
*/

ALTER TABLE public.auctions
  ADD COLUMN IF NOT EXISTS commission_rate_accepted numeric,
  ADD COLUMN IF NOT EXISTS commission_accepted_at timestamptz;

GRANT SELECT (commission_rate_accepted, commission_accepted_at) ON public.auctions TO authenticated;
GRANT INSERT (commission_rate_accepted, commission_accepted_at) ON public.auctions TO authenticated;

CREATE OR REPLACE FUNCTION public.enforce_auction_commission_acceptance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rate numeric;
  v_ambassador boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM profiles p
    JOIN vip_list v ON lower(v.email) = lower(p.email)
    WHERE p.id = NEW.seller_id AND v.badge = 'ambassador'
  ) INTO v_ambassador;

  IF v_ambassador THEN
    NEW.commission_rate_accepted := 0;
    NEW.commission_accepted_at := COALESCE(NEW.commission_accepted_at, now());
    RETURN NEW;
  END IF;

  IF NEW.commission_accepted_at IS NULL THEN
    RAISE EXCEPTION 'commission_not_accepted';
  END IF;

  SELECT value INTO v_rate FROM platform_settings WHERE key = 'auction_commission_rate';
  IF NEW.commission_rate_accepted IS DISTINCT FROM v_rate THEN
    RAISE EXCEPTION 'commission_rate_changed';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enforce_auction_commission_acceptance() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_enforce_auction_commission_acceptance ON public.auctions;
CREATE TRIGGER trg_enforce_auction_commission_acceptance
BEFORE INSERT ON public.auctions
FOR EACH ROW
EXECUTE FUNCTION public.enforce_auction_commission_acceptance();
