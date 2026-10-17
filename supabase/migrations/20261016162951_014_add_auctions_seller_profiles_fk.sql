-- Add FK from auctions.seller_id to profiles.id so PostgREST can resolve the join
ALTER TABLE public.auctions
  ADD CONSTRAINT auctions_seller_id_profiles_fkey
  FOREIGN KEY (seller_id) REFERENCES public.profiles(id) ON DELETE CASCADE;