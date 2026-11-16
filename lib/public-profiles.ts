import { supabase } from '@/lib/supabase';

export interface PublicProfile {
  breeder_name: string | null;
  isAmbassador: boolean;
}

interface PublicProfileRow {
  id: string;
  breeder_name: string | null;
  badge: string | null;
}

export async function fetchPublicProfiles(userIds: (string | null | undefined)[]): Promise<Map<string, PublicProfile>> {
  const ids = [...new Set(userIds.filter((id): id is string => !!id))];
  const profiles = new Map<string, PublicProfile>();
  if (ids.length === 0) return profiles;

  const { data, error } = await supabase
    .from('public_profiles')
    .select('id, breeder_name, badge')
    .in('id', ids);
  if (error) throw error;

  for (const row of (data ?? []) as PublicProfileRow[]) {
    profiles.set(row.id, { breeder_name: row.breeder_name, isAmbassador: row.badge === 'ambassador' });
  }
  return profiles;
}
