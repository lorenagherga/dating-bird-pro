import { supabase } from '@/lib/supabase';

export interface FreeLaunchSettings {
  mode: boolean;
  expiresOn: string;
  message: string;
  iban: string;
  revolut: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const BANNER_WINDOW_DAYS = 7;

export async function fetchFreeLaunchSettings(): Promise<FreeLaunchSettings> {
  const [modeRes, textRes] = await Promise.all([
    supabase.from('platform_settings').select('value').eq('key', 'free_launch_mode').maybeSingle(),
    supabase.from('platform_text_settings').select('key, value'),
  ]);
  if (modeRes.error || textRes.error) throw new Error('Could not load launch settings');

  const texts: Record<string, string> = {};
  for (const row of textRes.data ?? []) texts[row.key] = row.value ?? '';

  return {
    mode: Number(modeRes.data?.value) === 1,
    expiresOn: texts.free_launch_expires_on ?? '',
    message: texts.free_launch_message ?? '',
    iban: texts.payment_iban ?? '',
    revolut: texts.payment_revolut ?? '',
  };
}

export async function saveFreeLaunchSettings(settings: FreeLaunchSettings): Promise<void> {
  const { data, error } = await supabase
    .from('platform_settings')
    .update({ value: settings.mode ? 1 : 0, updated_at: new Date().toISOString() })
    .eq('key', 'free_launch_mode')
    .select('key');
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error('Launch mode setting not found');

  const textEntries: [string, string][] = [
    ['free_launch_expires_on', settings.expiresOn],
    ['free_launch_message', settings.message],
    ['payment_iban', settings.iban],
    ['payment_revolut', settings.revolut],
  ];
  for (const [key, value] of textEntries) {
    const { error: rpcError } = await supabase.rpc('admin_set_text_setting', { p_key: key, p_value: value });
    if (rpcError) throw new Error(rpcError.message);
  }
}

export function daysUntilExpiry(expiresOn: string, now: number = Date.now()): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(expiresOn)) return null;
  const end = new Date(`${expiresOn}T23:59:59`).getTime();
  if (Number.isNaN(end)) return null;
  return Math.ceil((end - now) / DAY_MS);
}

export function getFreeLaunchBannerDays(settings: FreeLaunchSettings, now: number = Date.now()): number | null {
  if (!settings.mode) return null;
  const days = daysUntilExpiry(settings.expiresOn, now);
  if (days === null || days < 0 || days > BANNER_WINDOW_DAYS) return null;
  return days;
}
