-- Add FK from auction_bids.bidder_id to profiles.id so PostgREST can resolve the join
ALTER TABLE public.auction_bids
  ADD CONSTRAINT auction_bids_bidder_id_profiles_fkey
  FOREIGN KEY (bidder_id) REFERENCES public.profiles(id) ON DELETE CASCADE;