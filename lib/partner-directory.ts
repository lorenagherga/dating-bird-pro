import { supabase } from '@/lib/supabase';

export type PartnerKind = 'breeder' | 'columbodrome' | 'club_federation';

export const PARTNER_KIND_OPTIONS: { value: PartnerKind; label: string }[] = [
  { value: 'breeder', label: 'Crescător' },
  { value: 'columbodrome', label: 'Columbodrom' },
  { value: 'club_federation', label: 'Club / Federație' },
];

export function getPartnerKindLabel(kind: PartnerKind): string {
  return PARTNER_KIND_OPTIONS.find((option) => option.value === kind)?.label ?? 'Crescător';
}

export const PARTNER_BENEFITS = [
  { key: 'benefit_free_pro', label: 'Abonament Pro Gratuit' },
  { key: 'benefit_preferential_commission', label: 'Comision preferențial la licitații' },
  { key: 'benefit_top_placement', label: 'Promovare în capul listei' },
] as const;

export type PartnerBenefitKey = (typeof PARTNER_BENEFITS)[number]['key'];

export type PartnerBenefits = Record<PartnerBenefitKey, boolean>;

export const NO_PARTNER_BENEFITS: PartnerBenefits = {
  benefit_free_pro: false,
  benefit_preferential_commission: false,
  benefit_top_placement: false,
};

export interface PartnerListing extends PartnerBenefits {
  id: string;
  breeder_name: string;
  logo_url: string | null;
  county: string | null;
  locality: string | null;
  partner_kind: PartnerKind;
  categories: string[];
  description: string;
  external_link: string | null;
  is_featured: boolean;
  sort_order: number;
  user_id: string | null;
}

export interface PartnerListingInput extends PartnerBenefits {
  breeder_name: string;
  logo_url: string | null;
  partner_kind: PartnerKind;
  locality: string | null;
  description: string;
  external_link: string | null;
  user_id: string | null;
}

export interface PartnerAuction {
  id: string;
  title: string;
  current_price: number;
  bid_count: number;
  end_time: string;
}

const LISTING_COLUMNS =
  'id, breeder_name, logo_url, county, locality, partner_kind, categories, description, external_link, is_featured, sort_order, user_id, benefit_free_pro, benefit_preferential_commission, benefit_top_placement';

export async function fetchPartnerListings(): Promise<PartnerListing[]> {
  const { data, error } = await supabase
    .from('elite_breeders')
    .select(LISTING_COLUMNS)
    .order('benefit_top_placement', { ascending: false })
    .order('is_featured', { ascending: false })
    .order('sort_order', { ascending: true });
  if (error) throw new Error(error.message);
  return (data || []) as PartnerListing[];
}

export async function fetchPartnerListing(id: string): Promise<PartnerListing | null> {
  const { data, error } = await supabase
    .from('elite_breeders')
    .select(LISTING_COLUMNS)
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as PartnerListing | null) ?? null;
}

export async function fetchPartnerActiveAuctions(sellerId: string): Promise<PartnerAuction[]> {
  const { data, error } = await supabase
    .from('auctions')
    .select('id, title, current_price, bid_count, end_time')
    .eq('seller_id', sellerId)
    .eq('status', 'active')
    .order('end_time', { ascending: true });
  if (error) throw new Error(error.message);
  return (data || []) as PartnerAuction[];
}

export async function findUserIdByEmail(email: string): Promise<string | null> {
  const { data, error } = await supabase.rpc('admin_find_user_id_by_email', { p_email: email.trim() });
  if (error) throw new Error(error.message);
  return (data as string | null) ?? null;
}

export async function savePartnerListing(
  id: string | null,
  input: PartnerListingInput,
): Promise<void> {
  const query = id
    ? supabase.from('elite_breeders').update(input).eq('id', id).select('id')
    : supabase.from('elite_breeders').insert(input).select('id');
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error('Partner listing not saved');
}

export async function uploadPartnerLogo(uri: string): Promise<string> {
  const fileExt = uri.split('.').pop()?.split('?')[0] || 'jpg';
  const filePath = `partner-logos/${Date.now()}.${fileExt}`;
  const response = await fetch(uri);
  const blob = await response.blob();
  const { error } = await supabase.storage
    .from('pigeon-photos')
    .upload(filePath, blob, { contentType: blob.type || `image/${fileExt}`, upsert: false });
  if (error) throw new Error(error.message);
  return supabase.storage.from('pigeon-photos').getPublicUrl(filePath).data.publicUrl;
}

export async function deletePartnerListing(id: string): Promise<void> {
  const { error } = await supabase.from('elite_breeders').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
