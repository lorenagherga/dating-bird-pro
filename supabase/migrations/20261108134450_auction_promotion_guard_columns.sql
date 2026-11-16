/*
# Protect auction promotion columns from direct client edits

1. Purpose
- Sellers keep an UPDATE policy on their own auctions, so the promotion columns
  could be changed by a direct table update, bypassing payment confirmation.

2. Security changes
- New trigger function `guard_auction_promotion_columns` on `auctions`.
- When the caller runs as `anon` or `authenticated` (direct client access), any change to
  `is_promoted`, `promotion_requested` or `promoted_at` raises an error.
- SECURITY DEFINER functions (`request_auction_promotion`, `set_auction_promoted`) run as the
  function owner, so they remain the only supported way to change promotion state.

3. Notes
- No table data is modified and no existing grants are removed.
*/

CREATE OR REPLACE FUNCTION public.guard_auction_promotion_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF current_user IN ('anon', 'authenticated') AND (
    NEW.is_promoted IS DISTINCT FROM OLD.is_promoted OR
    NEW.promotion_requested IS DISTINCT FROM OLD.promotion_requested OR
    NEW.promoted_at IS DISTINCT FROM OLD.promoted_at
  ) THEN
    RAISE EXCEPTION 'Promotion status can only be changed through the promotion functions'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.guard_auction_promotion_columns() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS guard_auction_promotion_columns ON public.auctions;
CREATE TRIGGER guard_auction_promotion_columns
BEFORE UPDATE ON public.auctions
FOR EACH ROW
EXECUTE FUNCTION public.guard_auction_promotion_columns();
