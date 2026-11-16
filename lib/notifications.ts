import { supabase } from '@/lib/supabase';

export type UserNotificationKind = 'auction_question' | 'auction_won';

export interface UserNotification {
  id: string;
  kind: UserNotificationKind;
  auction_id: string | null;
  title: string;
  body: string | null;
  read_at: string | null;
  created_at: string;
}

const NOTIFICATIONS_LIMIT = 30;

export async function fetchMyNotifications(): Promise<UserNotification[]> {
  const { data, error } = await supabase
    .from('user_notifications')
    .select('id, kind, auction_id, title, body, read_at, created_at')
    .order('created_at', { ascending: false })
    .limit(NOTIFICATIONS_LIMIT);
  if (error) throw new Error(error.message);
  return (data || []) as UserNotification[];
}

export async function markNotificationsRead(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await supabase
    .from('user_notifications')
    .update({ read_at: new Date().toISOString() })
    .in('id', ids);
  if (error) throw new Error(error.message);
}
