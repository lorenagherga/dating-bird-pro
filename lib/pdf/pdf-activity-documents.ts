import type { jsPDF } from 'jspdf';
import { supabase } from '@/lib/supabase';
import { createPdfBuilder } from '@/lib/pdf/pdf-builder';
import { loadPdfContext, loadPalmares, loadPigeonRecords } from '@/lib/pdf/pdf-context';
import { GAME_STYLE_LABELS } from '@/lib/types';
import { DB_SEX } from '@/lib/genetics-engine/registry';

const UNKNOWN = '-';

function formatDate(value: string | null | undefined): string {
  if (!value) return UNKNOWN;
  const [year, month, day] = value.slice(0, 10).split('-');
  return year && month && day ? `${day}.${month}.${year}` : value;
}

function formatNumber(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined) return UNKNOWN;
  return Number.isInteger(value) ? String(value) : value.toFixed(digits);
}

interface ColumbodromEntryRow {
  columbodrom_id: string | null;
  pigeon_ring: string | null;
  status: string | null;
  result_position: number | null;
  result_birds_total: number | null;
  result_fci_coeff: number | null;
  created_at: string;
}

interface GpsTrackRow {
  track_date: string | null;
  race_name: string | null;
  pigeon_ring: string | null;
  total_distance_km: number | null;
  avg_speed_kmh: number | null;
  flight_duration_min: number | null;
}

interface NestRow {
  male_ring: string | null;
  female_ring: string | null;
  pairing_date: string | null;
  laying_date: string | null;
  hatching_date: string | null;
  chick_count: number | null;
}

export async function buildResultsPdf(userId: string): Promise<jsPDF> {
  const [{ header, fonts }, entriesResult, columbodromsResult] = await Promise.all([
    loadPdfContext(userId),
    supabase
      .from('columbodrom_entries')
      .select('columbodrom_id, pigeon_ring, status, result_position, result_birds_total, result_fci_coeff, created_at')
      .order('created_at', { ascending: false }),
    supabase.from('columbodroms').select('id, name'),
  ]);
  if (entriesResult.error) throw new Error(entriesResult.error.message);
  if (columbodromsResult.error) throw new Error(columbodromsResult.error.message);

  const entries = (entriesResult.data || []) as ColumbodromEntryRow[];
  const nameById = new Map((columbodromsResult.data || []).map((row) => [row.id as string, row.name as string]));

  const builder = createPdfBuilder(header, fonts);
  builder.title('Rezultatele concursurilor');

  if (entries.length === 0) {
    builder.paragraph('Nu există rezultate înregistrate.');
  } else {
    builder.table(
      [
        { label: 'Data', width: 1.2 },
        { label: 'Columbodrom', width: 2.6 },
        { label: 'Inel', width: 1.4 },
        { label: 'Status', width: 1.2 },
        { label: 'Poz.', width: 0.7 },
        { label: 'Păsări', width: 0.9 },
        { label: 'Coef. FCI', width: 1 },
      ],
      entries.map((entry) => [
        formatDate(entry.created_at),
        (entry.columbodrom_id && nameById.get(entry.columbodrom_id)) || UNKNOWN,
        entry.pigeon_ring || UNKNOWN,
        entry.status || UNKNOWN,
        entry.result_position !== null ? String(entry.result_position) : UNKNOWN,
        entry.result_birds_total !== null ? String(entry.result_birds_total) : UNKNOWN,
        formatNumber(entry.result_fci_coeff, 2),
      ])
    );
  }

  return builder.finish();
}

export async function buildFlightsPdf(userId: string): Promise<jsPDF> {
  const [{ header, fonts }, tracksResult] = await Promise.all([
    loadPdfContext(userId),
    supabase
      .from('gps_tracks')
      .select('track_date, race_name, pigeon_ring, total_distance_km, avg_speed_kmh, flight_duration_min')
      .order('track_date', { ascending: false }),
  ]);
  if (tracksResult.error) throw new Error(tracksResult.error.message);

  const tracks = (tracksResult.data || []) as GpsTrackRow[];

  const builder = createPdfBuilder(header, fonts);
  builder.title('Zborurile porumbeilor');

  if (tracks.length === 0) {
    builder.paragraph('Nu există zboruri înregistrate.');
  } else {
    builder.table(
      [
        { label: 'Data', width: 1.2 },
        { label: 'Inel', width: 1.4 },
        { label: 'Concurs', width: 2.8 },
        { label: 'Distanță (km)', width: 1.4 },
        { label: 'Viteză medie', width: 1.3 },
        { label: 'Durată (min)', width: 1.3 },
      ],
      tracks.map((track) => [
        formatDate(track.track_date),
        track.pigeon_ring || UNKNOWN,
        track.race_name || UNKNOWN,
        formatNumber(track.total_distance_km),
        formatNumber(track.avg_speed_kmh),
        formatNumber(track.flight_duration_min, 0),
      ])
    );
  }

  return builder.finish();
}

export async function buildPairingsPdf(userId: string): Promise<jsPDF> {
  const [{ header, fonts }, nestsResult] = await Promise.all([
    loadPdfContext(userId),
    supabase
      .from('nests')
      .select('male_ring, female_ring, pairing_date, laying_date, hatching_date, chick_count')
      .order('pairing_date', { ascending: false }),
  ]);
  if (nestsResult.error) throw new Error(nestsResult.error.message);

  const nests = (nestsResult.data || []) as NestRow[];

  const builder = createPdfBuilder(header, fonts);
  builder.title('Împerecherile');

  if (nests.length === 0) {
    builder.paragraph('Nu există împerecheri înregistrate.');
  } else {
    builder.table(
      [
        { label: 'Mascul', width: 1.6 },
        { label: 'Femelă', width: 1.6 },
        { label: 'Împerechere', width: 1.3 },
        { label: 'Ouă', width: 1.3 },
        { label: 'Eclozare', width: 1.3 },
        { label: 'Pui', width: 0.7 },
      ],
      nests.map((nest) => [
        nest.male_ring || UNKNOWN,
        nest.female_ring || UNKNOWN,
        formatDate(nest.pairing_date),
        formatDate(nest.laying_date),
        formatDate(nest.hatching_date),
        nest.chick_count !== null ? String(nest.chick_count) : UNKNOWN,
      ])
    );
  }

  return builder.finish();
}

interface TreatmentRow {
  pigeon_ring: string | null;
  disease: string | null;
  treatment: string | null;
  admin_date: string | null;
  booster_date: string | null;
}

export async function buildTreatmentsPdf(userId: string): Promise<jsPDF> {
  const [{ header, fonts }, treatmentsResult] = await Promise.all([
    loadPdfContext(userId),
    supabase
      .from('treatments')
      .select('pigeon_ring, disease, treatment, admin_date, booster_date')
      .order('admin_date', { ascending: false }),
  ]);
  if (treatmentsResult.error) throw new Error(treatmentsResult.error.message);

  const treatments = (treatmentsResult.data || []) as TreatmentRow[];

  const builder = createPdfBuilder(header, fonts);
  builder.title('Tratamentele porumbeilor');

  if (treatments.length === 0) {
    builder.paragraph('Nu există tratamente înregistrate.');
  } else {
    builder.table(
      [
        { label: 'Inel', width: 1.3 },
        { label: 'Boală', width: 2 },
        { label: 'Tratament', width: 2.6 },
        { label: 'Administrare', width: 1.3 },
        { label: 'Booster', width: 1.3 },
      ],
      treatments.map((item) => [
        item.pigeon_ring || UNKNOWN,
        item.disease || UNKNOWN,
        item.treatment || UNKNOWN,
        formatDate(item.admin_date),
        formatDate(item.booster_date),
      ])
    );
  }

  return builder.finish();
}

export async function buildReportsPdf(userId: string): Promise<jsPDF> {
  const [{ header, fonts }, pigeons, palmares, nestsResult, treatmentsResult, tracksResult] = await Promise.all([
    loadPdfContext(userId),
    loadPigeonRecords(),
    loadPalmares(),
    supabase.from('nests').select('id'),
    supabase.from('treatments').select('id'),
    supabase.from('gps_tracks').select('id'),
  ]);
  for (const result of [nestsResult, treatmentsResult, tracksResult]) {
    if (result.error) throw new Error(result.error.message);
  }

  const males = pigeons.filter((pigeon) => pigeon.sex === DB_SEX.male).length;
  const females = pigeons.filter((pigeon) => pigeon.sex === DB_SEX.female).length;
  const champions = pigeons.filter((pigeon) => pigeon.is_champion);

  const builder = createPdfBuilder(header, fonts);
  builder.title('Rapoarte generale');

  builder.section('Sumar crescătorie');
  builder.keyValues([
    ['Total porumbei', pigeons.length],
    ['Masculi', males],
    ['Femele', females],
    ['Campioni', champions.length],
    ['Rezultate în palmares', palmares.length],
    ['Împerecheri', nestsResult.data?.length ?? 0],
    ['Tratamente', treatmentsResult.data?.length ?? 0],
    ['Zboruri GPS', tracksResult.data?.length ?? 0],
  ]);

  builder.section('Campioni');
  if (champions.length === 0) {
    builder.paragraph('Nu există campioni înregistrați.');
  } else {
    builder.table(
      [
        { label: 'Inel', width: 1.6 },
        { label: 'Sex', width: 1.2 },
        { label: 'Culoare', width: 1.8 },
        { label: 'An', width: 0.8 },
        { label: 'Stil de joc', width: 1.8 },
      ],
      champions.map((pigeon) => [
        pigeon.ring_series || UNKNOWN,
        pigeon.sex,
        pigeon.color,
        pigeon.year ? String(pigeon.year) : UNKNOWN,
        pigeon.game_style ? GAME_STYLE_LABELS[pigeon.game_style] : UNKNOWN,
      ])
    );
  }

  return builder.finish();
}
