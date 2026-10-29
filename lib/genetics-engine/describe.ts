import type { Fraction } from './fraction.ts';
import { fractionToNumber } from './fraction.ts';
import type { LocusId, PhenotypeExpression } from './loci.ts';
import type { PhenotypeGroup } from './punnett.ts';
import { expressGenotype } from './punnett.ts';

export type TextLanguage = 'ro' | 'en';

const SPLIT_LABEL: Record<TextLanguage, (split: string) => string> = {
  ro: (split) => `purtători de ${split}`,
  en: (split) => `split ${split}`,
};

const WILD_TYPE_LABEL: Record<TextLanguage, string> = {
  ro: 'tip sălbatic',
  en: 'wild type',
};

export const LOCUS_TITLES: Record<LocusId, Record<TextLanguage, string>> = {
  B: { ro: 'Culoare de bază (Z)', en: 'Base colour (Z)' },
  e: { ro: 'Roșu recesiv', en: 'Recessive red' },
  z: { ro: 'Alb, ochi de sticlă', en: 'White, glass eyes' },
  S: { ro: 'Spread', en: 'Spread' },
  O: { ro: 'Opal', en: 'Opal' },
};

export function describeLocus(expression: PhenotypeExpression, lang: TextLanguage): string {
  const visible = expression.visible[lang];
  if (expression.split.length === 0) return visible;
  const split = expression.split.map((allele) => allele[lang]).join(', ');
  return `${visible} (${SPLIT_LABEL[lang](split)})`;
}

function isHiddenWildType(expression: PhenotypeExpression): boolean {
  return expression.visible.wildType === true && expression.split.length === 0;
}

export function describePhenotype(
  phenotype: Partial<Record<LocusId, PhenotypeExpression>>,
  lang: TextLanguage
): string {
  const parts = (Object.keys(phenotype) as LocusId[])
    .sort()
    .map((id) => phenotype[id])
    .filter((expression): expression is PhenotypeExpression => expression !== undefined)
    .filter((expression) => !isHiddenWildType(expression))
    .map((expression) => describeLocus(expression, lang));
  return parts.length > 0 ? parts.join(', ') : WILD_TYPE_LABEL[lang];
}

export function describePhenotypeGroup(group: PhenotypeGroup, lang: TextLanguage): string {
  return describePhenotype(group.phenotype, lang);
}

export function describeGenotype(
  loci: Partial<Record<LocusId, readonly string[]>>,
  lang: TextLanguage
): string {
  return describePhenotype(expressGenotype(loci), lang);
}

export function formatPercent(probability: Fraction): string {
  const percent = fractionToNumber(probability) * 100;
  return `${Number.isInteger(percent) ? percent : percent.toFixed(2)}%`;
}
