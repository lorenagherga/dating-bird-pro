import { supabase } from '@/lib/supabase';
import type { CommissionRole } from '@/lib/types';

const SUPER_ADMIN_EMAIL = 'lorena.gherga@gmail.com';

export const DEFAULT_COMMISSION_RATE = 5;
export const DEFAULT_PARTNER_COMMISSION_RATE = 2;

export interface CommissionRates {
  standard: number;
  partner: number;
}

export interface AuctionTransaction {
  id: string;
  auction_id: string | null;
  auction_title: string;
  seller_name: string | null;
  winner_name: string | null;
  sale_amount: number;
  commission_rate: number;
  commission_amount: number;
  created_at: string;
}

export function isSuperAdminEmail(email: string | null | undefined): boolean {
  return (email ?? '').trim().toLowerCase() === SUPER_ADMIN_EMAIL;
}

export function calculateCommission(amount: number, rate: number): number {
  return Math.round(amount * rate) / 100;
}

export function getCommissionRateForRole(role: CommissionRole, rates: CommissionRates): number {
  if (role === 'ambassador') return 0;
  return role === 'partner' ? rates.partner : rates.standard;
}

async function fetchPlatformRate(key: string, fallback: number): Promise<number> {
  const { data, error } = await supabase
    .from('platform_settings')
    .select('value')
    .eq('key', key)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const value = Number(data?.value);
  return Number.isFinite(value) ? value : fallback;
}

async function updatePlatformRate(key: string, rate: number): Promise<void> {
  const { data, error } = await supabase
    .from('platform_settings')
    .update({ value: rate, updated_at: new Date().toISOString() })
    .eq('key', key)
    .select('key');
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error('Commission setting not found');
}

export async function fetchAuctionCommissionRate(): Promise<number> {
  return fetchPlatformRate('auction_commission_rate', DEFAULT_COMMISSION_RATE);
}

export async function fetchPartnerCommissionRate(): Promise<number> {
  return fetchPlatformRate('auction_partner_commission_rate', DEFAULT_PARTNER_COMMISSION_RATE);
}

export async function fetchPartnerProFree(): Promise<boolean> {
  return (await fetchPlatformRate('partner_pro_free', 0)) !== 0;
}

export async function updatePartnerProFree(enabled: boolean): Promise<void> {
  return updatePlatformRate('partner_pro_free', enabled ? 1 : 0);
}

export async function fetchCommissionRates(): Promise<CommissionRates> {
  const [standard, partner] = await Promise.all([
    fetchAuctionCommissionRate(),
    fetchPartnerCommissionRate(),
  ]);
  return { standard, partner };
}

export async function updateAuctionCommissionRate(rate: number): Promise<void> {
  return updatePlatformRate('auction_commission_rate', rate);
}

export async function updatePartnerCommissionRate(rate: number): Promise<void> {
  return updatePlatformRate('auction_partner_commission_rate', rate);
}

export function normalizeCommissionRole(value: unknown): CommissionRole {
  return value === 'partner' || value === 'ambassador' ? value : 'standard';
}

export async function setUserCommissionRole(userId: string, role: CommissionRole): Promise<void> {
  const { error } = await supabase.rpc('admin_set_user_commission_role', { p_user_id: userId, p_role: role });
  if (error) throw new Error(error.message);
}

export async function fetchAuctionTransactions(): Promise<AuctionTransaction[]> {
  const { data, error } = await supabase
    .from('auction_transactions')
    .select('id, auction_id, auction_title, seller_name, winner_name, sale_amount, commission_rate, commission_amount, created_at')
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message);
  return (data || []).map((row) => ({
    ...row,
    sale_amount: Number(row.sale_amount),
    commission_rate: Number(row.commission_rate),
    commission_amount: Number(row.commission_amount),
  })) as AuctionTransaction[];
}
