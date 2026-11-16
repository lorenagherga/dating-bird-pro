import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

export function useAutoCloseAuction(auctionId: string | undefined, status: string | undefined, ended: boolean, onClosed: () => void) {
  const requestedRef = useRef(false);

  useEffect(() => {
    if (!auctionId || status !== 'active' || !ended || requestedRef.current) return;
    requestedRef.current = true;
    supabase.rpc('close_auction', { p_auction_id: auctionId }).then(() => onClosed());
  }, [auctionId, status, ended, onClosed]);
}
