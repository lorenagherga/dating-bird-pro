import type { Fraction } from './fraction.ts';
import { HALF, ONE, ZERO, addFractions, fraction, fractionsEqual, multiplyFractions } from './fraction.ts';
import type { LocusDef, LocusId, PhenotypeExpression, Sex } from './loci.ts';
import { LOCI, expressPhenotype, isLethal, normalizeGenotype } from './loci.ts';

export interface ParentGenotype {
  sex: Sex;
  loci: Partial<Record<LocusId, readonly string[]>>;
}

export interface OffspringOutcome {
  sex: Sex;
  loci: Partial<Record<LocusId, string[]>>;
  probability: Fraction;
}

export interface PhenotypeGroup {
  sex: Sex;
  phenotype: Partial<Record<LocusId, PhenotypeExpression>>;
  probability: Fraction;
}

interface AlleleDistribution {
  alleles: string[];
  probability: Fraction;
}

const SEXES: Sex[] = ['male', 'female'];

function gametes(alleles: readonly string[]): Array<{ allele: string; probability: Fraction }> {
  if (alleles.length === 1 || alleles[0] === alleles[1]) {
    return [{ allele: alleles[0], probability: ONE }];
  }
  return alleles.map((allele) => ({ allele, probability: HALF }));
}

function accumulate(
  buckets: Map<string, AlleleDistribution>,
  alleles: string[],
  probability: Fraction
): void {
  const sorted = [...alleles].sort();
  const key = sorted.join('/');
  const existing = buckets.get(key);
  buckets.set(key, {
    alleles: sorted,
    probability: existing ? addFractions(existing.probability, probability) : probability,
  });
}

function locusDistribution(
  locus: LocusDef,
  sire: readonly string[],
  dam: readonly string[],
  offspringSex: Sex
): AlleleDistribution[] {
  const buckets = new Map<string, AlleleDistribution>();
  const sireGametes = gametes(sire);

  if (locus.chromosome === 'Z') {
    for (const sireGamete of sireGametes) {
      const alleles = offspringSex === 'male' ? [sireGamete.allele, dam[0]] : [sireGamete.allele];
      accumulate(buckets, alleles, sireGamete.probability);
    }
  } else {
    const damGametes = gametes(dam);
    for (const sireGamete of sireGametes) {
      for (const damGamete of damGametes) {
        accumulate(
          buckets,
          [sireGamete.allele, damGamete.allele],
          multiplyFractions(sireGamete.probability, damGamete.probability)
        );
      }
    }
  }

  return [...buckets.values()];
}

export function offspringOutcomes(sire: ParentGenotype, dam: ParentGenotype): OffspringOutcome[] {
  if (sire.sex !== 'male') throw new Error('Sire must be male');
  if (dam.sex !== 'female') throw new Error('Dam must be female');

  const lociIds = Object.keys(sire.loci) as LocusId[];
  if (lociIds.length === 0) throw new Error('At least one locus is required');
  const damLociIds = Object.keys(dam.loci);
  if (damLociIds.length !== lociIds.length || !lociIds.every((id) => dam.loci[id] !== undefined)) {
    throw new Error('Both parents must specify the same loci');
  }

  const sireAlleles = Object.fromEntries(
    lociIds.map((id) => [id, normalizeGenotype(LOCI[id], sire.loci[id] ?? [], 'male')])
  ) as Record<LocusId, string[]>;
  const damAlleles = Object.fromEntries(
    lociIds.map((id) => [id, normalizeGenotype(LOCI[id], dam.loci[id] ?? [], 'female')])
  ) as Record<LocusId, string[]>;

  const outcomes: OffspringOutcome[] = [];
  for (const offspringSex of SEXES) {
    let partial: { loci: Partial<Record<LocusId, string[]>>; probability: Fraction }[] = [
      { loci: {}, probability: HALF },
    ];
    for (const id of lociIds) {
      const distribution = locusDistribution(LOCI[id], sireAlleles[id], damAlleles[id], offspringSex);
      partial = partial.flatMap((entry) =>
        distribution.map((option) => ({
          loci: { ...entry.loci, [id]: option.alleles },
          probability: multiplyFractions(entry.probability, option.probability),
        }))
      );
    }
    for (const entry of partial) {
      if (lociIds.some((id) => isLethal(LOCI[id], entry.loci[id] ?? []))) continue;
      outcomes.push({ sex: offspringSex, loci: entry.loci, probability: entry.probability });
    }
  }
  return conditionOnSurvival(outcomes);
}

function conditionOnSurvival(outcomes: OffspringOutcome[]): OffspringOutcome[] {
  const surviving = outcomes.reduce((total, outcome) => addFractions(total, outcome.probability), ZERO);
  if (surviving.num === 0n) throw new Error('No viable offspring: every embryo carries a lethal combination');
  if (fractionsEqual(surviving, ONE)) return outcomes;
  const scale = fraction(surviving.den, surviving.num);
  return outcomes.map((outcome) => ({ ...outcome, probability: multiplyFractions(outcome.probability, scale) }));
}

export function expressGenotype(
  loci: Partial<Record<LocusId, readonly string[]>>
): Partial<Record<LocusId, PhenotypeExpression>> {
  const phenotype: Partial<Record<LocusId, PhenotypeExpression>> = {};
  for (const id of Object.keys(loci) as LocusId[]) {
    phenotype[id] = expressPhenotype(LOCI[id], loci[id] ?? []);
  }
  return phenotype;
}

function phenotypeKey(sex: Sex, phenotype: Partial<Record<LocusId, PhenotypeExpression>>): string {
  const parts = (Object.keys(phenotype) as LocusId[])
    .sort()
    .map((id) => {
      const expression = phenotype[id];
      if (!expression) return '';
      return `${id}:${expression.visible.code}[${expression.split.map((a) => a.code).join(',')}]`;
    });
  return `${sex}|${parts.join(';')}`;
}

export function groupByPhenotype(outcomes: OffspringOutcome[]): PhenotypeGroup[] {
  const groups = new Map<string, PhenotypeGroup>();
  for (const outcome of outcomes) {
    const phenotype = expressGenotype(outcome.loci);
    const key = phenotypeKey(outcome.sex, phenotype);
    const existing = groups.get(key);
    groups.set(key, {
      sex: outcome.sex,
      phenotype,
      probability: existing ? addFractions(existing.probability, outcome.probability) : outcome.probability,
    });
  }
  return [...groups.values()];
}

export function probabilityOfSex(outcomes: OffspringOutcome[], sex: Sex): Fraction {
  return outcomes
    .filter((outcome) => outcome.sex === sex)
    .reduce((total, outcome) => addFractions(total, outcome.probability), ZERO);
}
