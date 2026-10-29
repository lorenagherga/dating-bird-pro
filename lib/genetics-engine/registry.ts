import { LOCUS_IDS, LOCI, normalizeGenotype } from './loci.ts';
import type { LocusId, Sex } from './loci.ts';
import type { ParentGenotype } from './punnett.ts';
import type { Pedigree } from './wright-coi.ts';

export interface RegistryPigeon {
  id: string;
  ring_series: string;
  color: string | null;
  sex: string;
  sire_id: string | null;
  dam_id: string | null;
  genotype: unknown;
}

export type GenotypeReadResult =
  | { ok: true; parent: ParentGenotype }
  | { ok: false; reason: 'missing' | 'invalid' };

export const DB_SEX = { male: 'Mascul', female: 'Femel\u0103' } as const;

export function sexFromRegistry(value: string): Sex | null {
  const normalized = value.normalize('NFC').trim();
  if (normalized === DB_SEX.male) return 'male';
  if (normalized === DB_SEX.female) return 'female';
  return null;
}

export function readStoredGenotype(raw: unknown, sex: Sex): GenotypeReadResult {
  if (raw === null || raw === undefined) return { ok: false, reason: 'missing' };
  if (typeof raw !== 'object' || Array.isArray(raw)) return { ok: false, reason: 'invalid' };

  const record = raw as Record<string, unknown>;
  const loci: Partial<Record<LocusId, string[]>> = {};

  for (const id of LOCUS_IDS) {
    const alleles = record[id];
    if (alleles === undefined) return { ok: false, reason: 'missing' };
    if (!Array.isArray(alleles) || !alleles.every((a): a is string => typeof a === 'string')) {
      return { ok: false, reason: 'invalid' };
    }
    try {
      loci[id] = normalizeGenotype(LOCI[id], alleles, sex);
    } catch {
      return { ok: false, reason: 'invalid' };
    }
  }

  return { ok: true, parent: { sex, loci } };
}

export function buildPedigree(pigeons: RegistryPigeon[]): Pedigree {
  return new Map(pigeons.map((p) => [p.id, { sireId: p.sire_id, damId: p.dam_id }]));
}
