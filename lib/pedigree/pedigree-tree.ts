import { supabase } from '@/lib/supabase';

export const MIN_GENERATIONS = 2;
export const MAX_GENERATIONS = 10;

export interface PedigreeRecord {
  id: string;
  ring_series: string;
  year: number | null;
  sex: string;
  color: string;
  sire_id: string | null;
  dam_id: string | null;
  photo_url: string | null;
  is_champion: boolean;
}

export interface PalmaresEntry {
  id: string;
  pigeon_id: string | null;
  position: number;
  race_name: string;
  year: number | null;
  distance_km: number | null;
}

export interface PedigreeData {
  pigeonById: Map<string, PedigreeRecord>;
  palmaresByPigeon: Map<string, PalmaresEntry[]>;
}

export interface PedigreeNode extends PedigreeRecord {
  sire: PedigreeNode | null;
  dam: PedigreeNode | null;
}

export type ParentSlot = 'sire' | 'dam';

export interface PedigreeRow {
  generation: number;
  lineage: ParentSlot[];
  node: PedigreeNode | null;
}

export function clampGenerations(value: number): number {
  return Math.min(MAX_GENERATIONS, Math.max(MIN_GENERATIONS, Math.round(value)));
}

export async function loadPedigreeData(): Promise<PedigreeData> {
  const [pigeonsResult, palmaresResult] = await Promise.all([
    supabase
      .from('pigeons')
      .select('id, ring_series, year, sex, color, sire_id, dam_id, photo_url, is_champion'),
    supabase
      .from('pigeon_palmares')
      .select('id, pigeon_id, position, race_name, year, distance_km')
      .order('position', { ascending: true }),
  ]);
  if (pigeonsResult.error) throw new Error(pigeonsResult.error.message);
  if (palmaresResult.error) throw new Error(palmaresResult.error.message);

  const pigeons = (pigeonsResult.data || []) as PedigreeRecord[];
  const palmares = (palmaresResult.data || []) as PalmaresEntry[];

  const palmaresByPigeon = new Map<string, PalmaresEntry[]>();
  for (const entry of palmares) {
    if (!entry.pigeon_id) continue;
    const list = palmaresByPigeon.get(entry.pigeon_id) || [];
    list.push(entry);
    palmaresByPigeon.set(entry.pigeon_id, list);
  }

  return {
    pigeonById: new Map(pigeons.map((pigeon) => [pigeon.id, pigeon])),
    palmaresByPigeon,
  };
}

function buildNode(
  data: PedigreeData,
  pigeon: PedigreeRecord,
  level: number,
  generations: number,
  ancestors: Set<string>
): PedigreeNode {
  const path = new Set(ancestors).add(pigeon.id);

  const buildParent = (parentId: string | null): PedigreeNode | null => {
    if (level >= generations || !parentId || path.has(parentId)) return null;
    const parent = data.pigeonById.get(parentId);
    return parent ? buildNode(data, parent, level + 1, generations, path) : null;
  };

  return { ...pigeon, sire: buildParent(pigeon.sire_id), dam: buildParent(pigeon.dam_id) };
}

export function buildPedigreeTree(data: PedigreeData, rootId: string, generations: number): PedigreeNode | null {
  const root = data.pigeonById.get(rootId);
  if (!root) return null;
  return buildNode(data, root, 1, generations, new Set());
}

export function flattenPedigree(root: PedigreeNode, generations: number): PedigreeRow[] {
  const rows: PedigreeRow[] = [];

  const walk = (node: PedigreeNode, level: number, lineage: ParentSlot[]) => {
    if (level >= generations) return;
    for (const slot of ['sire', 'dam'] as const) {
      const child = node[slot];
      const childLineage = [...lineage, slot];
      rows.push({ generation: level + 1, lineage: childLineage, node: child });
      if (child) walk(child, level + 1, childLineage);
    }
  };

  walk(root, 1, []);
  return rows;
}
