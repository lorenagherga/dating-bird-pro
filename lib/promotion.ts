import { supabase } from '@/lib/supabase';

export const DEFAULT_PROMOTION_FEE = 25;

export interface PromotionText {
  optionTitle: string;
  optionHint: string;
  optionHintFree: string;
  requested: string;
  badge: string;
  free: string;
  feePrefix: string;
  feeSuffix: string;
  saved: string;
  paidLocked: string;
  adminTitle: string;
  adminHint: string;
  adminFeeLabel: string;
  adminFeeSave: string;
  adminAuctionsTitle: string;
  adminActivate: string;
  adminDeactivate: string;
  adminNoAuctions: string;
  adminRequested: string;
  adminPromotedLabel: string;
  error: string;
}

const EN: PromotionText = {
  optionTitle: 'Promote this auction',
  optionHint: 'Promoted auctions stay at the top of the list with a gold frame.',
  optionHintFree: 'Free for your account.',
  requested: 'Promotion requested. It activates once payment is confirmed.',
  badge: 'PROMOTED',
  free: 'Free',
  feePrefix: 'Fee',
  feeSuffix: 'lei',
  saved: 'Saved',
  paidLocked: 'Paid promotion can only be changed by the platform owner.',
  adminTitle: 'Auction promotion',
  adminHint: 'Set the promotion fee and activate promotion for auctions after payment is confirmed.',
  adminFeeLabel: 'Fee per auction',
  adminFeeSave: 'Save fee',
  adminAuctionsTitle: 'Auctions',
  adminActivate: 'Activate',
  adminDeactivate: 'Deactivate',
  adminNoAuctions: 'No auctions to promote right now.',
  adminRequested: 'Awaiting payment',
  adminPromotedLabel: 'Promoted',
  error: 'Something went wrong. Please try again.',
};

const RO: PromotionText = {
  optionTitle: 'Promovează această licitație',
  optionHint: 'Licitațiile promovate rămân în capul listei, cu un chenar auriu.',
  optionHintFree: 'Gratuit pentru contul tău.',
  requested: 'Promovare solicitată. Se activează după confirmarea plății.',
  badge: 'PROMOVAT',
  free: 'Gratuit',
  feePrefix: 'Tarif',
  feeSuffix: 'lei',
  saved: 'Salvat',
  paidLocked: 'Promovarea plătită poate fi modificată doar de proprietarul platformei.',
  adminTitle: 'Promovare licitații',
  adminHint: 'Stabilește tariful de promovare și activează promovarea după confirmarea plății.',
  adminFeeLabel: 'Tarif per licitație',
  adminFeeSave: 'Salvează tariful',
  adminAuctionsTitle: 'Licitații',
  adminActivate: 'Activează',
  adminDeactivate: 'Dezactivează',
  adminNoAuctions: 'Nu există licitații active de promovat.',
  adminRequested: 'Așteaptă plata',
  adminPromotedLabel: 'Promovată',
  error: 'A apărut o eroare. Încearcă din nou.',
};

export function getPromotionText(language: string): PromotionText {
  return language === 'ro' ? RO : EN;
}

export async function fetchPromotionFee(): Promise<number> {
  const { data, error } = await supabase
    .from('promotion_pricing')
    .select('fee_lei')
    .eq('id', 1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const fee = Number(data?.fee_lei);
  return Number.isFinite(fee) ? fee : DEFAULT_PROMOTION_FEE;
}

export async function updatePromotionFee(fee: number): Promise<void> {
  const { error } = await supabase.rpc('set_promotion_fee', { p_fee: fee });
  if (error) throw new Error(error.message);
}

export async function requestAuctionPromotion(auctionId: string, enable: boolean): Promise<void> {
  const { error } = await supabase.rpc('request_auction_promotion', { p_auction_id: auctionId, p_enable: enable });
  if (error) throw new Error(error.message);
}

export async function setAuctionPromoted(auctionId: string, promoted: boolean): Promise<void> {
  const { error } = await supabase.rpc('set_auction_promoted', { p_auction_id: auctionId, p_promoted: promoted });
  if (error) throw new Error(error.message);
}
