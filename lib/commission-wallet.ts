import { supabase } from '@/lib/supabase';

export type CommissionWalletKind = 'top_up' | 'adjustment' | 'commission';

export interface CommissionWalletEntry {
  id: string;
  kind: CommissionWalletKind;
  amount: number;
  note: string | null;
  auction_id: string | null;
  created_at: string;
}

export const COMMISSION_KIND_LABELS: Record<CommissionWalletKind, string> = {
  top_up: 'Alimentare',
  adjustment: 'Ajustare',
  commission: 'Comision licitație',
};

export function formatLei(value: number): string {
  return `${value.toFixed(2)} lei`;
}

export async function fetchMyCommissionEntries(limit = 10): Promise<CommissionWalletEntry[]> {
  const { data, error } = await supabase
    .from('commission_wallet_entries')
    .select('id, kind, amount, note, auction_id, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data || []) as CommissionWalletEntry[];
}

export async function fetchMyCommissionBalance(): Promise<number> {
  const { data, error } = await supabase
    .from('commission_wallet_entries')
    .select('amount');
  if (error) throw new Error(error.message);
  return ((data || []) as { amount: number }[]).reduce((sum, row) => sum + Number(row.amount), 0);
}

export const PAYMENT_PROOF_BUCKET = 'payment-proofs';
export const TOPUP_MAX_AMOUNT = 100000;

export interface PendingTopUpRequest {
  t_id: string;
  t_user_id: string;
  t_user_email: string | null;
  t_user_name: string | null;
  t_amount: number;
  t_note: string | null;
  t_proof_path: string | null;
  t_created_at: string;
}

export async function uploadPaymentProof(userId: string, uri: string, mimeType: string): Promise<string> {
  const extension = mimeType === 'image/png' ? 'png' : 'jpg';
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${extension}`;
  const response = await fetch(uri);
  if (!response.ok) throw new Error('Imaginea nu a putut fi citită.');
  const blob = await response.blob();
  const { error } = await supabase.storage
    .from(PAYMENT_PROOF_BUCKET)
    .upload(path, blob, { contentType: mimeType, upsert: false });
  if (error) throw new Error(error.message);
  return path;
}

export async function submitCommissionTopUp(input: {
  amount: number;
  note: string | null;
  proofPath: string | null;
}): Promise<void> {
  const { error } = await supabase.from('commission_topup_requests').insert({
    amount: input.amount,
    note: input.note,
    proof_path: input.proofPath,
  });
  if (error) throw new Error(error.message);
}

export async function fetchPendingTopUpRequests(): Promise<PendingTopUpRequest[]> {
  const { data, error } = await supabase.rpc('admin_list_commission_topups');
  if (error) throw new Error(error.message);
  return (data || []) as PendingTopUpRequest[];
}

export async function getPaymentProofUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(PAYMENT_PROOF_BUCKET)
    .createSignedUrl(path, 300);
  if (error || !data?.signedUrl) throw new Error(error?.message ?? 'Dovada nu a putut fi deschisă.');
  return data.signedUrl;
}

export async function approveCommissionTopUp(requestId: string): Promise<number> {
  const { data, error } = await supabase.rpc('admin_approve_commission_topup', { p_request_id: requestId });
  if (error) throw new Error(error.message);
  return Number(data ?? 0);
}

export async function rejectCommissionTopUp(requestId: string): Promise<void> {
  const { error } = await supabase.rpc('admin_reject_commission_topup', { p_request_id: requestId });
  if (error) throw new Error(error.message);
}

export async function adminAdjustCommissionWallet(
  userId: string,
  amount: number,
  note: string,
): Promise<number> {
  const { data, error } = await supabase.rpc('admin_adjust_commission_wallet', {
    p_user_id: userId,
    p_amount: amount,
    p_note: note,
  });
  if (error) throw new Error(error.message);
  return Number(data ?? 0);
}
