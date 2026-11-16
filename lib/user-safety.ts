import { supabase } from '@/lib/supabase';

export const REPORT_REASON_MAX_LENGTH = 500;

export async function fetchBlockedUserIds(userId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('user_blocks')
    .select('blocked_id')
    .eq('blocker_id', userId);
  if (error) throw new Error(error.message);
  return new Set((data || []).map((row) => row.blocked_id as string));
}

export async function blockUser(blockedId: string): Promise<void> {
  const { error } = await supabase.from('user_blocks').insert({ blocked_id: blockedId });
  if (error && error.code !== '23505') throw new Error(error.message);
}

export async function reportUser(params: {
  reporterId: string;
  reportedUserId: string;
  reason: string;
  auctionId?: string | null;
}): Promise<void> {
  const { error } = await supabase.from('user_reports').insert({
    reporter_id: params.reporterId,
    reported_user_id: params.reportedUserId,
    auction_id: params.auctionId ?? null,
    reason: params.reason.trim(),
  });
  if (error) throw new Error(error.message);
}
