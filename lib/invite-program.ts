import { supabase } from '@/lib/supabase';

export interface InviteSettings {
  enabled: boolean;
  requiredFriends: number;
  bonusDays: number;
}

export interface InviteSummary {
  inviteCode: string;
  friendsPaid: number;
  requiredFriends: number;
  bonusDays: number;
  enabled: boolean;
}

export interface InviteReferrerRow {
  referrerId: string;
  referrerEmail: string;
  referrerName: string;
  inviteCode: string;
  friendsJoined: number;
  friendsPaid: number;
  rewardsGranted: number;
  readyBatches: number;
  requiredFriends: number;
  bonusDays: number;
}

export interface InviteRefereeRow {
  referrerId: string;
  refereeName: string;
  refereeEmail: string;
  joinedAt: string;
  isActive: boolean;
}

function assertNoError(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

export async function fetchInviteSettings(): Promise<InviteSettings> {
  const { data, error } = await supabase.rpc('invite_program_settings');
  assertNoError(error);
  const row = Array.isArray(data) ? data[0] : null;
  if (!row) throw new Error('Invite settings not available');
  return {
    enabled: Boolean(row.enabled),
    requiredFriends: Number(row.required_friends),
    bonusDays: Number(row.bonus_days),
  };
}

export async function saveInviteSettings(settings: InviteSettings): Promise<void> {
  const { error } = await supabase.rpc('admin_set_invite_settings', {
    p_enabled: settings.enabled,
    p_required_friends: settings.requiredFriends,
    p_bonus_days: settings.bonusDays,
  });
  assertNoError(error);
}

export async function fetchMyInviteSummary(): Promise<InviteSummary | null> {
  const { data, error } = await supabase.rpc('my_invite_summary');
  assertNoError(error);
  const row = Array.isArray(data) ? data[0] : null;
  if (!row) return null;
  return {
    inviteCode: row.invite_code,
    friendsPaid: Number(row.friends_paid),
    requiredFriends: Number(row.required_friends),
    bonusDays: Number(row.bonus_days),
    enabled: Boolean(row.enabled),
  };
}

export async function checkInviteCode(code: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('check_invite_code', { p_code: code });
  assertNoError(error);
  return data === true;
}

export async function applyInviteCode(code: string): Promise<void> {
  const { error } = await supabase.rpc('apply_invite_code', { p_code: code });
  assertNoError(error);
}

export async function fetchInviteReferrers(): Promise<InviteReferrerRow[]> {
  const { data, error } = await supabase.rpc('admin_list_invite_referrers');
  assertNoError(error);
  return (data ?? []).map((row: Record<string, unknown>) => ({
    referrerId: String(row.referrer_id),
    referrerEmail: String(row.referrer_email ?? ''),
    referrerName: String(row.referrer_name ?? ''),
    inviteCode: String(row.invite_code ?? ''),
    friendsJoined: Number(row.friends_joined),
    friendsPaid: Number(row.friends_paid),
    rewardsGranted: Number(row.rewards_granted),
    readyBatches: Number(row.ready_batches),
    requiredFriends: Number(row.required_friends),
    bonusDays: Number(row.bonus_days),
  }));
}

export async function fetchInviteReferees(): Promise<InviteRefereeRow[]> {
  const { data, error } = await supabase.rpc('admin_list_invite_referees');
  assertNoError(error);
  return (data ?? []).map((row: Record<string, unknown>) => ({
    referrerId: String(row.referrer_id),
    refereeName: String(row.referee_name ?? ''),
    refereeEmail: String(row.referee_email ?? ''),
    joinedAt: String(row.joined_at),
    isActive: Boolean(row.is_active),
  }));
}

export async function validateInviteRewards(referrerId: string): Promise<number> {
  const { data, error } = await supabase.rpc('admin_validate_invite_rewards', { p_referrer_id: referrerId });
  assertNoError(error);
  return Number(data ?? 0);
}

export function buildInviteWhatsAppUrl(code: string, isRo: boolean): string {
  const text = isRo
    ? `Te invit să te alături mie în aplicația Pigeon Fan! La înregistrare, folosește codul meu de invitație: ${code}`
    : `Join me on Pigeon Fan! When you sign up, use my invite code: ${code}`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
