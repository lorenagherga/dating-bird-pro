import { supabase } from '@/lib/supabase';
import { loadPdfAssets } from '@/lib/pdf/pdf-export';
import type { PdfFonts, PdfHeaderInfo } from '@/lib/pdf/pdf-builder';
import type { GameStyle } from '@/lib/types';

export interface PdfContext {
  header: PdfHeaderInfo;
  fonts: PdfFonts;
}

export interface PigeonRecord {
  id: string;
  ring_series: string | null;
  year: number | null;
  sex: string;
  color: string;
  status: string;
  game_style: GameStyle | null;
  is_champion: boolean;
  sire_id: string | null;
  dam_id: string | null;
  notes: string | null;
  genotype: unknown;
}

export interface PalmaresRecord {
  pigeon_id: string | null;
  position: number;
  race_name: string;
  year: number | null;
  distance_km: number | null;
  federation: string | null;
}

export async function loadPdfContext(userId: string): Promise<PdfContext> {
  const [profileResult, assets] = await Promise.all([
    fetchProfile(userId),
    loadPdfAssets(),
  ]);
  if (profileResult.error) throw new Error(profileResult.error.message);
  if (!profileResult.data) throw new Error('Profilul crescatorului nu a fost gasit.');

  const profile = profileResult.data;
  const contactLine = [profile.phone, profile.location].filter(Boolean).join('  |  ') || null;
  return {
    header: {
      appName: 'Pigeon Fan',
      breederName: profile.breeder_name,
      contactLine,
      logoDataUrl: assets.logoDataUrl,
    },
    fonts: { regular: assets.regular, bold: assets.bold },
  };
}

function fetchProfile(userId: string) {
  return supabase
    .from('profiles')
    .select('breeder_name, phone, location')
    .eq('id', userId)
    .maybeSingle();
}

export async function loadPigeonRecords(): Promise<PigeonRecord[]> {
  const { data, error } = await supabase
    .from('pigeons')
    .select('id, ring_series, year, sex, color, status, game_style, is_champion, sire_id, dam_id, notes, genotype')
    .order('ring_series', { ascending: true });
  if (error) throw new Error(error.message);
  return (data || []) as PigeonRecord[];
}

export async function loadPalmares(): Promise<PalmaresRecord[]> {
  const { data, error } = await supabase
    .from('pigeon_palmares')
    .select('pigeon_id, position, race_name, year, distance_km, federation')
    .order('year', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []) as PalmaresRecord[];
}
