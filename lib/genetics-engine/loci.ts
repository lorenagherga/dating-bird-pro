export type LocusId = 'B' | 'e' | 'z' | 'S' | 'O';
export type Chromosome = 'Z' | 'autosome';
export type Sex = 'male' | 'female';

export interface AlleleDef {
  code: string;
  ro: string;
  en: string;
  wildType?: true;
}

export interface LocusDef {
  id: LocusId;
  chromosome: Chromosome;
  alleles: readonly AlleleDef[];
  lethal?: readonly (readonly string[])[];
  source: string;
}

export const LOCI: Record<LocusId, LocusDef> = {
  B: {
    id: 'B',
    chromosome: 'Z',
    alleles: [
      { code: 'BA', ro: 'roșu cenușiu', en: 'ash-red' },
      { code: 'B', ro: 'albastru', en: 'blue' },
      { code: 'b', ro: 'maro', en: 'brown' },
    ],
    source: 'Domyan et al. 2014; Utah Genetics; Barnhart; Seraphim. Dominance ash-red > blue > brown, Z-linked.',
  },
  e: {
    id: 'e',
    chromosome: 'autosome',
    alleles: [
      { code: 'E', ro: 'normal', en: 'normal', wildType: true },
      { code: 'e', ro: 'roșu recesiv', en: 'recessive red' },
    ],
    source: 'User specification: recessive red, autosomal recessive.',
  },
  z: {
    id: 'z',
    chromosome: 'autosome',
    alleles: [
      { code: '+', ro: 'normal', en: 'normal', wildType: true },
      { code: 'z', ro: 'alb cu ochi de sticlă', en: 'white, glass eyes' },
    ],
    source: 'User specification: recessive white, autosomal recessive assumed. Not yet checked against a published source.',
  },
  S: {
    id: 'S',
    chromosome: 'autosome',
    alleles: [
      { code: 'S', ro: 'spread', en: 'spread' },
      { code: '+', ro: 'normal', en: 'normal', wildType: true },
    ],
    source: 'Autosomal dominant (Pigeon Genetics, spread S). One source only; not cross-checked.',
  },
  O: {
    id: 'O',
    chromosome: 'autosome',
    alleles: [
      { code: 'Od', ro: 'opal dominant', en: 'dominant opal' },
      { code: '+', ro: 'normal', en: 'normal', wildType: true },
      { code: 'o', ro: 'opal recesiv', en: 'recessive opal' },
    ],
    lethal: [['Od', 'Od']],
    source: "Dominant opal autosomal dominant; recessive opal autosomal recessive (Barnhart & Son, Tom's Genetics Page). Homozygous dominant opal lethal per earlier research, not re-checked.",
  },
};

export const LOCUS_IDS = Object.keys(LOCI) as LocusId[];

export function alleleRank(locus: LocusDef, code: string): number {
  const index = locus.alleles.findIndex((allele) => allele.code === code);
  if (index === -1) throw new Error(`Unknown allele ${code} at locus ${locus.id}`);
  return index;
}

export function normalizeGenotype(locus: LocusDef, alleles: readonly string[], sex: Sex): string[] {
  const expectedCopies = locus.chromosome === 'Z' && sex === 'female' ? 1 : 2;
  if (alleles.length !== expectedCopies) {
    throw new Error(
      `Locus ${locus.id} needs ${expectedCopies} allele(s) for a ${sex}, got ${alleles.length}`
    );
  }
  return [...alleles].sort((a, b) => alleleRank(locus, a) - alleleRank(locus, b));
}

export function isLethal(locus: LocusDef, alleles: readonly string[]): boolean {
  const key = [...alleles].sort().join('/');
  return (locus.lethal ?? []).some((combination) => [...combination].sort().join('/') === key);
}

export interface PhenotypeExpression {
  visible: AlleleDef;
  split: AlleleDef[];
}

export function expressPhenotype(locus: LocusDef, alleles: readonly string[]): PhenotypeExpression {
  const ranked = alleles.map((code) => alleleRank(locus, code));
  const visibleIndex = Math.min(...ranked);
  const visible = locus.alleles[visibleIndex];
  const split = locus.alleles.filter(
    (allele, index) => index !== visibleIndex && alleles.includes(allele.code) && allele.wildType !== true
  );
  return { visible, split };
}
