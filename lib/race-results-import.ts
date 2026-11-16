import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase';

export interface ParsedRaceResult {
  ring_number: string;
  series: string | null;
  stage: string | null;
  event_date: string | null;
  distance_km: number | null;
  place: number;
  total_birds: number;
  speed_mpm: number | null;
}

export interface RaceResultsParseOutcome {
  rows: ParsedRaceResult[];
  skipped: number;
  error: string | null;
}

type ColumnKey = 'ring_number' | 'series' | 'stage' | 'event_date' | 'distance_km' | 'place' | 'total_birds' | 'speed_mpm';

const COLUMN_ALIASES: Record<ColumnKey, string[]> = {
  ring_number: ['inel', 'nr inel', 'numar inel', 'ring', 'ring number', 'banda'],
  series: ['seria', 'serie', 'series'],
  stage: ['etapa', 'stage', 'round'],
  event_date: ['data', 'date'],
  distance_km: ['distanta', 'distance', 'km'],
  place: ['loc', 'locul', 'pozitie', 'place', 'rank', 'clasament'],
  total_birds: ['total', 'porumbei', 'nr porumbei', 'numar porumbei', 'birds', 'participanti'],
  speed_mpm: ['viteza', 'speed', 'm/min', 'mpm', 'viteza m/min'],
};

const REQUIRED_COLUMNS: ColumnKey[] = ['ring_number', 'place', 'total_birds'];

export function normalizeHeader(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeRingNumber(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function detectDelimiter(firstLine: string): string {
  const counts = [
    { delimiter: '\t', count: firstLine.split('\t').length },
    { delimiter: ';', count: firstLine.split(';').length },
    { delimiter: ',', count: firstLine.split(',').length },
  ];
  counts.sort((a, b) => b.count - a.count);
  return counts[0].count > 1 ? counts[0].delimiter : ',';
}

function splitDelimitedLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      cells.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

function parseNumber(value: string | undefined): number | null {
  if (value === undefined) return null;
  const cleaned = value.replace(/\s/g, '');
  if (!cleaned) return null;
  const normalized = cleaned.includes(',') && cleaned.includes('.')
    ? cleaned.replace(/\./g, '').replace(',', '.')
    : cleaned.replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseDate(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return trimmed;
  const european = trimmed.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (european) {
    const [, day, month, year] = european;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  return null;
}

export function parseResultsText(text: string): RaceResultsParseOutcome {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0);

  if (lines.length < 2) {
    return { rows: [], skipped: 0, error: 'Tabelul trebuie să conțină un rând de titluri și cel puțin un rezultat.' };
  }

  const delimiter = detectDelimiter(lines[0]);
  const headerCells = splitDelimitedLine(lines[0], delimiter).map(normalizeHeader);

  const columnIndex = {} as Record<ColumnKey, number>;
  (Object.keys(COLUMN_ALIASES) as ColumnKey[]).forEach((key) => {
    const index = headerCells.findIndex((cell) => COLUMN_ALIASES[key].includes(cell));
    if (index >= 0) columnIndex[key] = index;
  });

  const missing = REQUIRED_COLUMNS.filter((key) => columnIndex[key] === undefined);
  if (missing.length > 0) {
    return {
      rows: [],
      skipped: 0,
      error: 'Lipsesc coloanele obligatorii: inel, loc, număr porumbei (total).',
    };
  }

  const cellAt = (cells: string[], key: ColumnKey): string | undefined => {
    const index = columnIndex[key];
    return index === undefined ? undefined : cells[index];
  };

  const rows: ParsedRaceResult[] = [];
  let skipped = 0;

  lines.slice(1).forEach((line) => {
    const cells = splitDelimitedLine(line, delimiter);
    const ringNumber = (cellAt(cells, 'ring_number') ?? '').trim();
    const place = parseNumber(cellAt(cells, 'place'));
    const totalBirds = parseNumber(cellAt(cells, 'total_birds'));

    if (!ringNumber || place === null || totalBirds === null) {
      skipped += 1;
      return;
    }
    const placeInt = Math.trunc(place);
    const totalInt = Math.trunc(totalBirds);
    if (placeInt <= 0 || totalInt <= 0 || placeInt > totalInt) {
      skipped += 1;
      return;
    }

    rows.push({
      ring_number: ringNumber,
      series: (cellAt(cells, 'series') ?? '').trim() || null,
      stage: (cellAt(cells, 'stage') ?? '').trim() || null,
      event_date: parseDate(cellAt(cells, 'event_date')),
      distance_km: parseNumber(cellAt(cells, 'distance_km')),
      place: placeInt,
      total_birds: totalInt,
      speed_mpm: parseNumber(cellAt(cells, 'speed_mpm')),
    });
  });

  if (rows.length === 0) {
    return { rows, skipped, error: 'Nu am găsit niciun rezultat valid în tabel.' };
  }
  return { rows, skipped, error: null };
}

export function spreadsheetBufferToCsv(buffer: ArrayBuffer): string {
  const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!firstSheet) return '';
  return XLSX.utils.sheet_to_csv(firstSheet);
}

export function calculateFncprScore(place: number, totalBirds: number): number {
  return Math.round(((place * 1000) / totalBirds) * 100) / 100;
}

export async function fetchPigeonRingIndex(): Promise<Map<string, string>> {
  const { data, error } = await supabase.from('pigeons').select('id, ring_series');
  if (error) throw error;
  const index = new Map<string, string>();
  (data ?? []).forEach((pigeon: { id: string; ring_series: string | null }) => {
    if (pigeon.ring_series) index.set(normalizeRingNumber(pigeon.ring_series), pigeon.id);
  });
  return index;
}

export async function saveRaceResults(
  rows: ParsedRaceResult[],
  ringIndex: Map<string, string>,
): Promise<{ inserted: number; linked: number; error: string | null }> {
  const payload = rows.map((row) => {
    const pigeonId = ringIndex.get(normalizeRingNumber(row.ring_number)) ?? null;
    return { ...row, pigeon_id: pigeonId };
  });
  const linked = payload.filter((row) => row.pigeon_id !== null).length;

  const chunkSize = 500;
  for (let start = 0; start < payload.length; start += chunkSize) {
    const chunk = payload.slice(start, start + chunkSize);
    const { error } = await supabase.from('race_results').insert(chunk);
    if (error) {
      return { inserted: start, linked: 0, error: error.message };
    }
  }
  return { inserted: payload.length, linked, error: null };
}
