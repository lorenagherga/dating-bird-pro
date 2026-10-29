import type { Fraction } from './fraction.ts';
import { ONE, ZERO, addFractions, multiplyFractions, powerOfHalf } from './fraction.ts';

export interface PedigreeEntry {
  sireId: string | null;
  damId: string | null;
}

export type Pedigree = ReadonlyMap<string, PedigreeEntry>;

export interface InbreedingResult {
  coefficient: Fraction;
  sharedAncestorIds: string[];
  cycleDetected: boolean;
  truncated: boolean;
}

interface Context {
  pedigree: Pedigree;
  maxDepth: number;
  memo: Map<string, Fraction>;
  inProgress: Set<string>;
  cycleDetected: boolean;
  truncated: boolean;
}

function pathLengthsFrom(start: string, ctx: Context): Map<string, number[]> {
  const lengths = new Map<string, number[]>();
  const onPath = new Set<string>();

  const walk = (id: string, depth: number) => {
    if (onPath.has(id)) {
      ctx.cycleDetected = true;
      return;
    }
    const known = lengths.get(id);
    if (known) known.push(depth);
    else lengths.set(id, [depth]);

    const entry = ctx.pedigree.get(id);
    if (!entry || (!entry.sireId && !entry.damId)) return;
    if (depth >= ctx.maxDepth) {
      ctx.truncated = true;
      return;
    }

    onPath.add(id);
    if (entry.sireId) walk(entry.sireId, depth + 1);
    if (entry.damId) walk(entry.damId, depth + 1);
    onPath.delete(id);
  };

  walk(start, 0);
  return lengths;
}

function coefficientOf(id: string, ctx: Context): Fraction {
  const memoised = ctx.memo.get(id);
  if (memoised) return memoised;
  if (ctx.inProgress.has(id)) {
    ctx.cycleDetected = true;
    return ZERO;
  }

  const entry = ctx.pedigree.get(id);
  if (!entry || !entry.sireId || !entry.damId) return ZERO;

  ctx.inProgress.add(id);
  const value = parentalCoefficient(entry.sireId, entry.damId, ctx).coefficient;
  ctx.inProgress.delete(id);
  ctx.memo.set(id, value);
  return value;
}

function parentalCoefficient(
  sireId: string,
  damId: string,
  ctx: Context
): { coefficient: Fraction; sharedAncestorIds: string[] } {
  const sireLines = pathLengthsFrom(sireId, ctx);
  const damLines = pathLengthsFrom(damId, ctx);

  let coefficient = ZERO;
  const sharedAncestorIds: string[] = [];

  for (const [ancestorId, sireDistances] of sireLines) {
    const damDistances = damLines.get(ancestorId);
    if (!damDistances) continue;
    sharedAncestorIds.push(ancestorId);

    const ancestorFactor = addFractions(ONE, coefficientOf(ancestorId, ctx));
    for (const n1 of sireDistances) {
      for (const n2 of damDistances) {
        const term = multiplyFractions(powerOfHalf(n1 + n2 + 1), ancestorFactor);
        coefficient = addFractions(coefficient, term);
      }
    }
  }

  return { coefficient, sharedAncestorIds };
}

export function computeInbreeding(
  pedigree: Pedigree,
  sireId: string,
  damId: string,
  maxDepth: number = 12
): InbreedingResult {
  const ctx: Context = {
    pedigree,
    maxDepth,
    memo: new Map(),
    inProgress: new Set(),
    cycleDetected: false,
    truncated: false,
  };

  const { coefficient, sharedAncestorIds } = parentalCoefficient(sireId, damId, ctx);
  return {
    coefficient,
    sharedAncestorIds,
    cycleDetected: ctx.cycleDetected,
    truncated: ctx.truncated,
  };
}
