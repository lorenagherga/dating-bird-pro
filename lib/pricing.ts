import { supabase } from '@/lib/supabase';

export interface ProPricing {
  annual_price_lei: number;
  annual_price_eur: number;
}

export async function fetchProPricing(): Promise<ProPricing> {
  const { data, error } = await supabase
    .from('pro_pricing')
    .select('annual_price_lei, annual_price_eur')
    .eq('id', 1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error('Pro pricing not found');
  return {
    annual_price_lei: Number(data.annual_price_lei),
    annual_price_eur: Number(data.annual_price_eur),
  };
}

export async function updateProPricing(lei: number, eur: number): Promise<ProPricing> {
  const { data, error } = await supabase.rpc('set_pro_pricing', {
    p_lei: lei,
    p_eur: eur,
  });

  if (error) throw new Error(error.message);
  return {
    annual_price_lei: Number(data.annual_price_lei),
    annual_price_eur: Number(data.annual_price_eur),
  };
}
