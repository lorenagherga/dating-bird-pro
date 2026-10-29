import {
  computeInbreeding,
  type PedigreeEntry,
} from './genetics-engine/wright-coi.ts';
import { fractionToNumber } from './genetics-engine/fraction.ts';

export interface BreedingPigeon {
  id: string;
  ring_series: string;
  year: number | null;
  sex: string;
  color: string;
  sire_id: string | null;
  dam_id: string | null;
  is_champion: boolean;
  game_style: string | null;
  photo_url: string | null;
}

export interface PalmaresRecord {
  pigeon_id: string;
  position: number;
  race_name: string;
  year: number | null;
  distance_km: number | null;
  birds_released: number | null;
  fci_coefficient: number | null;
}

export interface NestRecord {
  male_ring: string;
  female_ring: string;
  chick_count: number | null;
  hatching_date: string | null;
}

export interface AncestorNode {
  id: string;
  sire_id: string | null;
  dam_id: string | null;
}

export interface PairScore {
  male: BreedingPigeon;
  female: BreedingPigeon;
  totalScore: number;
  geneticScore: number;
  performanceScore: number;
  compatibilityScore: number;
  inbreedingCoeff: number;
  sharedAncestors: string[];
  complementarity: string[];
  warnings: string[];
  strengths: string[];
  recommended: boolean;
  rationale: string;
}

const INBREEDING_LIMIT = 0.0625; // 6.25% = first cousin level

export function buildAncestorMap(pigeons: BreedingPigeon[], rootId: string, maxDepth: number = 6): Map<string, AncestorNode> {
  const map = new Map<string, AncestorNode>();
  const pigeonById = new Map(pigeons.map(p => [p.id, p]));

  const traverse = (id: string | null, depth: number) => {
    if (!id || depth > maxDepth || map.has(id)) return;
    const p = pigeonById.get(id);
    if (!p) return;
    map.set(id, { id: p.id, sire_id: p.sire_id, dam_id: p.dam_id });
    traverse(p.sire_id, depth + 1);
    traverse(p.dam_id, depth + 1);
  };

  traverse(rootId, 0);
  return map;
}

function computePerformanceScore(
  pigeonId: string,
  palmares: PalmaresRecord[],
  nests: NestRecord[],
  ring: string
): { score: number; wins: number; podiums: number; offspringCount: number; avgChicks: number } {
  const records = palmares.filter(p => p.pigeon_id === pigeonId);
  const wins = records.filter(r => r.position === 1).length;
  const podiums = records.filter(r => r.position <= 3).length;

  // Performance score: weighted wins and podiums
  let perfScore = 0;
  for (const r of records) {
    if (r.position === 1) perfScore += 30;
    else if (r.position <= 3) perfScore += 15;
    else if (r.position <= 10) perfScore += 8;
    else if (r.position <= 50) perfScore += 3;

    // Bonus for large races
    if (r.birds_released && r.birds_released > 500) perfScore += 5;
    if (r.birds_released && r.birds_released > 1000) perfScore += 5;
  }

  // Historical breeding success
  const offspringNests = nests.filter(n => n.male_ring === ring || n.female_ring === ring);
  const offspringCount = offspringNests.length;
  const successfulHatches = offspringNests.filter(n => n.chick_count && n.chick_count > 0).length;
  const avgChicks = offspringNests.length > 0
    ? offspringNests.reduce((sum, n) => sum + (n.chick_count || 0), 0) / offspringNests.length
    : 0;

  // Breeding success bonus
  if (offspringCount > 0) {
    perfScore += Math.min(successfulHatches * 10, 30);
    perfScore += Math.min(avgChicks * 5, 20);
  }

  return {
    score: Math.min(perfScore, 100),
    wins,
    podiums,
    offspringCount,
    avgChicks,
  };
}

function computeColorComplementarity(maleColor: string, femaleColor: string): { score: number; note: string } {
  if (!maleColor || !femaleColor) return { score: 50, note: 'unknown' };

  const mc = maleColor.toLowerCase();
  const fc = femaleColor.toLowerCase();

  // Same color = less genetic diversity in color expression
  if (mc === fc) return { score: 30, note: 'same_color' };

  // Complementary pairs that produce diverse offspring
  const complementaryPairs: [string[], string[], number][] = [
    [['albastru', 'blue', 'blau', 'blauw'], ['roșu', 'red', 'rot', 'rood', 'rouge', 'rojo'], 90],
    [['albastru', 'blue'], ['argintiu', 'silver', 'silber', 'zilver', 'argent'], 85],
    [['albastru', 'blue'], ['galben', 'yellow', 'gelb', 'geel', 'jaune', 'amarillo'], 80],
    [['roșu', 'red'], ['argintiu', 'silver'], 75],
    [['grizzle'], ['albastru', 'blue'], 85],
    [['indigo'], ['albastru', 'blue'], 80],
    [['spread', 'negru', 'black', 'schwarz', 'zwart', 'noir', 'negro'], ['albastru', 'blue'], 70],
  ];

  for (const [maleGroup, femaleGroup, score] of complementaryPairs) {
    const maleMatch = maleGroup.some(c => mc.includes(c));
    const femaleMatch = femaleGroup.some(c => fc.includes(c));
    if (maleMatch && femaleMatch) return { score, note: 'complementary' };
    // Also check reverse
    const maleMatch2 = femaleGroup.some(c => mc.includes(c));
    const femaleMatch2 = maleGroup.some(c => fc.includes(c));
    if (maleMatch2 && femaleMatch2) return { score, note: 'complementary' };
  }

  // Different colors but not specifically complementary
  return { score: 60, note: 'diverse' };
}

function computeStyleCompatibility(maleStyle: string | null, femaleStyle: string | null): number {
  if (!maleStyle || !femaleStyle) return 50;
  if (maleStyle === femaleStyle) return 85; // Same racing style = focused offspring
  // Speed + Endurance = all-round offspring
  if (
    (maleStyle === 'Viteza' && femaleStyle === 'Rezistență') ||
    (maleStyle === 'Rezistență' && femaleStyle === 'Viteza')
  ) {
    return 90;
  }
  return 60;
}

export function scoreAllPairs(
  males: BreedingPigeon[],
  females: BreedingPigeon[],
  allPigeons: BreedingPigeon[],
  palmares: PalmaresRecord[],
  nests: NestRecord[]
): PairScore[] {
  const results: PairScore[] = [];

  for (const male of males) {
    for (const female of females) {
      const score = scorePair(male, female, allPigeons, palmares, nests);
      results.push(score);
    }
  }

  // Sort by total score descending
  results.sort((a, b) => b.totalScore - a.totalScore);

  // Mark top 3 as recommended
  results.forEach((r, i) => {
    r.recommended = i < 3 && r.warnings.length === 0;
  });

  return results;
}

export function scorePair(
  male: BreedingPigeon,
  female: BreedingPigeon,
  allPigeons: BreedingPigeon[],
  palmares: PalmaresRecord[],
  nests: NestRecord[]
): PairScore {
  // 1. Genetic score — inbreeding + diversity
  const maleAncestors = buildAncestorMap(allPigeons, male.id);
  const femaleAncestors = buildAncestorMap(allPigeons, female.id);
  const pedigree = new Map<string, PedigreeEntry>();
  for (const node of [...maleAncestors.values(), ...femaleAncestors.values()]) {
    pedigree.set(node.id, { sireId: node.sire_id, damId: node.dam_id });
  }
  const { coefficient, sharedAncestorIds: sharedAncestors } = computeInbreeding(pedigree, male.id, female.id);
  const inbreedingCoeff = fractionToNumber(coefficient);

  let geneticScore = 100;
  const warnings: string[] = [];
  const strengths: string[] = [];

  if (inbreedingCoeff > 0) {
    // Penalty proportional to inbreeding
    geneticScore -= inbreedingCoeff * 400; // 6.25% → -25 points, 12.5% → -50 points
  }

  if (inbreedingCoeff > INBREEDING_LIMIT) {
    warnings.push('high_inbreeding');
    geneticScore -= 20;
  } else if (inbreedingCoeff > 0 && inbreedingCoeff <= INBREEDING_LIMIT) {
    strengths.push('controlled_linebreeding');
  } else if (inbreedingCoeff === 0) {
    strengths.push('no_inbreeding');
  }

  // 2. Performance score — historical results of both parents
  const malePerf = computePerformanceScore(male.id, palmares, nests, male.ring_series || '');
  const femalePerf = computePerformanceScore(female.id, palmares, nests, female.ring_series || '');

  const performanceScore = (malePerf.score + femalePerf.score) / 2;

  if (malePerf.wins > 0 || femalePerf.wins > 0) {
    strengths.push('champion_parents');
  }
  if (malePerf.podiums > 2 || femalePerf.podiums > 2) {
    strengths.push('proven_performers');
  }
  if (malePerf.offspringCount > 0 && malePerf.avgChicks >= 2) {
    strengths.push('proven_breeder_male');
  }
  if (femalePerf.offspringCount > 0 && femalePerf.avgChicks >= 2) {
    strengths.push('proven_breeder_female');
  }

  // 3. Compatibility score — color + style
  const colorComp = computeColorComplementarity(male.color || '', female.color || '');
  const styleComp = computeStyleCompatibility(male.game_style, female.game_style);

  const compatibilityScore = (colorComp.score * 0.4 + styleComp * 0.6);

  const complementarity: string[] = [];
  if (colorComp.note === 'complementary') complementarity.push('color_complementary');
  if (styleComp >= 85) complementarity.push('style_synergy');
  if (male.is_champion && female.is_champion) complementarity.push('double_champion');

  // Weighted total: genetic 35%, performance 40%, compatibility 25%
  const totalScore = Math.round(
    geneticScore * 0.35 +
    performanceScore * 0.40 +
    compatibilityScore * 0.25
  );

  // Build rationale
  const rationaleParts: string[] = [];
  if (inbreedingCoeff === 0) {
    rationaleParts.push('no_inbreeding_rationale');
  } else if (inbreedingCoeff <= INBREEDING_LIMIT) {
    rationaleParts.push('linebreeding_rationale');
  } else {
    rationaleParts.push('high_inbreeding_rationale');
  }
  if (malePerf.wins + femalePerf.wins > 0) rationaleParts.push('winner_parents_rationale');
  if (complementarity.length > 0) rationaleParts.push('complementary_rationale');

  return {
    male,
    female,
    totalScore: Math.max(0, Math.min(100, totalScore)),
    geneticScore: Math.max(0, Math.min(100, Math.round(geneticScore))),
    performanceScore: Math.round(performanceScore),
    compatibilityScore: Math.round(compatibilityScore),
    inbreedingCoeff: Math.round(inbreedingCoeff * 10000) / 100, // percentage with 2 decimals
    sharedAncestors,
    complementarity,
    warnings,
    strengths,
    recommended: false,
    rationale: rationaleParts.join(','),
  };
}
