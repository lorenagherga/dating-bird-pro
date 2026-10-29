// ============================================================
// PIGEON GENETICS ENGINE — Complete genetic database
// Based on Mendelian inheritance for Columba livia domestica
// ============================================================

import type { Language } from './i18n';

// --- SEX DETERMINATION: ZW system (female = ZW, male = ZZ) ---
// Sex-linked traits are carried on the Z chromosome
// Males (ZZ) get 2 copies, females (ZW) get only 1

// === BASE COLOR (autosomal, 3 alleles with dominance hierarchy) ===
// Symbol: B (blue/black) > BA (ash-red) > b (brown) — all at same locus
export type BaseColor = 'B' | 'BA' | 'b';
export const BASE_COLOR_PRIORITY: Record<BaseColor, number> = { BA: 3, B: 2, b: 1 };
export const BASE_COLOR_NAMES: Record<BaseColor, { ro: string; en: string }> = {
  B: { ro: 'Albastru/Negru', en: 'Blue/Black' },
  BA: { ro: 'Roșu Cenușiu', en: 'Ash Red' },
  b: { ro: 'Maro', en: 'Brown' },
};

// === PATTERN (allelic series on Spread locus) ===
// T-pattern (most dark) > Checker > Bar > Barless
export type Pattern = 'T-pattern' | 'Checker' | 'Bar' | 'Barless';
export const PATTERN_PRIORITY: Record<Pattern, number> = { 'T-pattern': 4, Checker: 3, Bar: 2, Barless: 1 };
export const PATTERN_NAMES: Record<Pattern, { ro: string; en: string }> = {
  'T-pattern': { ro: 'Tip T', en: 'T-Pattern' },
  Checker: { ro: 'Tablă', en: 'Checker' },
  Bar: { ro: 'Barat', en: 'Bar' },
  Barless: { ro: 'Fără Bare', en: 'Barless' },
};

// === DILUTION (sex-linked recessive on Z chromosome) ===
// D (normal) dominant over d (dilute)
// Males: DD = normal, Dd = dilute carrier (normal phenotype), dd = dilute
// Females: D_ = normal, d_ = dilute (only 1 Z)
export type Dilution = 'normal' | 'dilute';
export type DilutionGenotype = 'DD' | 'Dd' | 'dd' | 'D_' | 'd_';

// === ALMOND (classical, sex-linked dominant on Z) ===
// St (almond/wild-type) > st (recessive)
// Actually almond is caused by the "St" (spread) mutation on the Z
// In almond: St = almond phenotype (dominant), st = wild-type
// Homozygous almond males (StSt) = "De Roy" phenotype
// Almond causes progressive feather depigmentation
export type Almond = 'none' | 'almond' | 'de-roy';

// === INDIGO / ANDALUSIAN (autosomal, incomplete dominant) ===
// Indigo (In) acts on base color
// InIn = more extreme (Andalusian on blue), inin = normal
// Inin = indigo expression (heterozygous)
export type Indigo = 'none' | 'hetero' | 'homo';

// === RECESSIVE RED (autosomal recessive) ===
// e (recessive red) is recessive to E (normal)
// ee = recessive red/yellow phenotype, Ee = carrier, EE = normal
export type RecessiveRed = 'none' | 'carrier' | 'expressed';

// === TOY STENCIL (autosomal, codominant / incomplete dominant) ===
// Ts (toy stencil) — the heterozygous form shows white-wing patterns
// TsTs = more extreme (white flight feathers)
export type ToyStencil = 'none' | 'hetero' | 'homo';

// === REDUCED (sex-linked recessive on Z) ===
// r (reduced) reduces pigment, R (normal) dominant
// Males: rr = reduced, Rr = carrier, RR = normal
// Females: r_ = reduced, R_ = normal
export type Reduced = 'none' | 'carrier' | 'expressed';

// === SLATE (autosomal recessive) ===
// sl (slate) recessive, Sl (normal) dominant
// slsl = slate, Slsl = carrier, SlSl = normal
export type Slate = 'none' | 'carrier' | 'expressed';

// === KITE (modifier, autosomal dominant-ish) ===
// Kite is a darkening modifier on T-pattern/checker
export type Kite = 'none' | 'present';

// === SPREAD (autosomal dominant) ===
// S (spread) makes pattern areas spread over whole bird
// S_ = spread phenotype, ss = normal pattern
// On blue base: spread = solid black
// On ash-red base: spread = solid ash (lavender)
export type Spread = 'none' | 'present';

// === STRUCTURE: CREST (autosomal recessive) ===
// cr (crest) recessive, Cr (no crest) dominant
// crcr = crested, Crcr = no crest (carrier), CrCr = no crest
export type Crest = 'none' | 'carrier' | 'crested';

// === STRUCTURE: MUFFS / FOOT FEATHERS (autosomal dominant-ish) ===
// Mu (muffs) dominant, mu (clean-legged) recessive
// Mu_ = muffed, mumu = clean-legged
export type Muffs = 'none' | 'present';

// === EYE COLOR ===
// Bull eye (dark/black): associated with recessive red, certain whites
// Pearl eye: common in performance breeds
// Orange eye: wild-type in most racing pigeons
// Odd eye / Crack eye: one eye different from the other (often genetic + environmental)
// Bull eye gene: b_e (recessive), only expressed in white/pied areas
export type EyeColor = 'orange' | 'pearl' | 'bull' | 'odd' | 'crack';
export const EYE_COLOR_NAMES: Record<EyeColor, { ro: string; en: string }> = {
  orange: { ro: 'Ochi Portocaliu', en: 'Orange Eye' },
  pearl: { ro: 'Ochi Perlat', en: 'Pearl Eye' },
  bull: { ro: 'Ochi Negru (Bull)', en: 'Bull Eye' },
  odd: { ro: 'Ochi Sparți (Odd)', en: 'Odd Eye' },
  crack: { ro: 'Ochi Crăpat', en: 'Crack Eye' },
};

// === LETHAL / SEMI-LETHAL MUTATIONS ===
// These should NEVER be paired homozygously
export interface LethalMutation {
  name: { ro: string; en: string };
  gene: string;
  description: { ro: string; en: string };
  severity: 'lethal' | 'semi-lethal';
}

export const LETHAL_MUTATIONS: LethalMutation[] = [
  {
    name: { ro: 'Almond (De Roy) — homozigot', en: 'Almond (De Roy) — homozygous' },
    gene: 'StSt',
    description: {
      ro: 'Masculii homozigot Almond (StSt) sunt în mare parte sterili și au probleme grave de vedere. Nu împerecheați niciodată doi părinți Almond/De Roy.',
      en: 'Homozygous almond males (StSt) are largely sterile and have severe vision problems. Never pair two almond/de-roy birds.',
    },
    severity: 'semi-lethal',
  },
  {
    name: { ro: 'Cataractă congenitală', en: 'Congenital cataract' },
    gene: 'cat-cat',
    description: {
      ro: 'Cataracta congenitală este o mutație recesivă letală în homozigoție care cauzează orbire și moarte timpurie a puilor.',
      en: 'Congenital cataract is a recessive lethal mutation that causes blindness and early death in squabs.',
    },
    severity: 'lethal',
  },
  {
    name: { ro: 'Pui cu gât scurt (Lethal Short Beak)', en: 'Short Beak Lethal' },
    gene: 'sb-sb',
    description: {
      ro: 'Genă recesivă care în stare homozigotă produce pui cu cioc scurt care nu se pot hrăni și mor în primele zile.',
      en: 'Recessive gene producing short-beaked squabs that cannot feed and die within days.',
    },
    severity: 'lethal',
  },
];

// === COMPLETE PHENOTYPE DEFINITION ===
export interface PigeonPhenotype {
  base: BaseColor;
  pattern: Pattern;
  dilution: Dilution;
  almond: Almond;
  indigo: Indigo;
  recessiveRed: RecessiveRed;
  toyStencil: ToyStencil;
  reduced: Reduced;
  slate: Slate;
  kite: Kite;
  spread: Spread;
  crest: Crest;
  muffs: Muffs;
  eyeColor: EyeColor;
}

// === PARENT GENOTYPE INPUT ===
export interface ParentGenotype {
  base: BaseColor;          // expressed base
  baseCarrier?: BaseColor;  // hidden allele (if heterozygous)
  pattern: Pattern;
  dilution: Dilution;       // expressed dilution status
  almond: Almond;           // expressed almond status
  indigo: Indigo;
  recessiveRed: RecessiveRed;
  toyStencil: ToyStencil;
  reduced: Reduced;
  slate: Slate;
  kite: Kite;
  spread: Spread;
  crest: Crest;
  muffs: Muffs;
  eyeColor: EyeColor;
  sex: 'male' | 'female';
}

// === OFFSPRING RESULT ===
export interface OffspringResult {
  label: { ro: string; en: string };
  percentage: number;
  imageKey?: string;     // key into phenotype images
  description: { ro: string; en: string };
  rarity: 'common' | 'uncommon' | 'rare' | 'very-rare';
}

// === INBREEDING ANALYSIS ===
export interface AncestorNode {
  id: string;
  ring: string;
  sire_id?: string | null;
  dam_id?: string | null;
}

export interface InbreedingResult {
  coefficient: number;        // COI percentage (0-100)
  level: 'safe' | 'linebreeding' | 'extreme';
  commonAncestors: string[];
  relationship: { ro: string; en: string };
  warning: { ro: string; en: string } | null;
  color: 'green' | 'gold' | 'red';
}

// === LETHAL COMBINATION RESULT ===
export interface LethalResult {
  detected: boolean;
  mutations: LethalMutation[];
  warning: { ro: string; en: string } | null;
}

// ============================================================
// PHENOTYPE LABEL GENERATION
// ============================================================
export function getPhenotypeLabel(p: Partial<PigeonPhenotype>, lang: Language): string {
  const parts: string[] = [];
  const L = (obj: { ro: string; en: string }) => lang === 'ro' ? obj.ro : obj.en;

  // Recessive red overrides most visual
  if (p.recessiveRed === 'expressed') {
    if (p.dilution === 'dilute') {
      parts.push(lang === 'ro' ? 'Roșu Recesiv (Galben)' : 'Recessive Red (Yellow)');
    } else {
      parts.push(lang === 'ro' ? 'Roșu Recesiv' : 'Recessive Red');
    }
    if (p.pattern) parts.push(L(PATTERN_NAMES[p.pattern]));
    return parts.join(' ');
  }

  // Almond / De Roy
  if (p.almond === 'de-roy') {
    parts.push(lang === 'ro' ? 'De Roy (Almond homozigot)' : 'De Roy (Homozygous Almond)');
  } else if (p.almond === 'almond') {
    parts.push(lang === 'ro' ? 'Almond (Migdală)' : 'Almond');
  }

  // Indigo
  if (p.indigo === 'homo') {
    parts.push(lang === 'ro' ? 'Andaluzian' : 'Andalusian');
  } else if (p.indigo === 'hetero') {
    parts.push(lang === 'ro' ? 'Indigo' : 'Indigo');
  }

  // Toy Stencil
  if (p.toyStencil === 'homo') {
    parts.push(lang === 'ro' ? 'Toy Stencil Extrem' : 'Extreme Toy Stencil');
  } else if (p.toyStencil === 'hetero') {
    parts.push(lang === 'ro' ? 'Toy Stencil' : 'Toy Stencil');
  }

  // Slate
  if (p.slate === 'expressed') {
    parts.push(lang === 'ro' ? 'Slate (Ardezie)' : 'Slate');
  }

  // Kite
  if (p.kite === 'present') {
    parts.push(lang === 'ro' ? 'Kite' : 'Kite');
  }

  // Base color with dilution
  if (p.base) {
    const baseName = L(BASE_COLOR_NAMES[p.base]);
    if (p.dilution === 'dilute') {
      if (p.base === 'B') parts.push(lang === 'ro' ? 'Argintiu' : 'Silver');
      else if (p.base === 'BA') parts.push(lang === 'ro' ? 'Galben Cenușiu' : 'Yellow');
      else parts.push(lang === 'ro' ? 'Kaki' : 'Khaki');
    } else {
      parts.push(baseName);
    }
  }

  // Spread
  if (p.spread === 'present') {
    if (p.base === 'B') {
      parts.push(lang === 'ro' ? '(Spread/Negru Solid)' : '(Spread/Solid Black)');
    } else if (p.base === 'BA') {
      parts.push(lang === 'ro' ? '(Spread/Lavanda)' : '(Spread/Lavender)');
    }
  }

  // Pattern (unless spread covers it)
  if (p.pattern && p.spread !== 'present' && (p.recessiveRed as RecessiveRed) !== 'expressed') {
    parts.push(L(PATTERN_NAMES[p.pattern]));
  }

  // Reduced
  if (p.reduced === 'expressed') {
    parts.push(lang === 'ro' ? 'Reduced (Redus)' : 'Reduced');
  }

  // Structure
  if (p.crest === 'crested') {
    parts.push(lang === 'ro' ? 'cu Moț' : 'Crested');
  }
  if (p.muffs === 'present') {
    parts.push(lang === 'ro' ? 'cu Picioare Plume' : 'Muffed');
  }

  // Eye
  if (p.eyeColor && p.eyeColor !== 'orange') {
    parts.push(lang === 'ro' ? `· Ochi: ${L(EYE_COLOR_NAMES[p.eyeColor])}` : `· Eye: ${L(EYE_COLOR_NAMES[p.eyeColor])}`);
  }

  return parts.join(' ') || (lang === 'ro' ? 'Sălbatic (tip normal)' : 'Wild Type (Normal)');
}

// ============================================================
// PHENOTYPE IMAGE KEY — maps to generated photos
// ============================================================
export function getPhenotypeImageKey(p: Partial<PigeonPhenotype>): string {
  if (p.recessiveRed === 'expressed') {
    return p.dilution === 'dilute' ? 'recessive_yellow' : 'recessive_red';
  }
  if (p.almond === 'de-roy') return 'de_roy';
  if (p.almond === 'almond') return 'almond';
  if (p.indigo === 'homo') return 'andalusian';
  if (p.indigo === 'hetero') return 'indigo';
  if (p.toyStencil !== 'none') return 'toy_stencil';
  if (p.slate === 'expressed') return 'slate';
  if (p.kite === 'present') return 'kite';
  if (p.spread === 'present' && p.base === 'B') return 'spread_black';
  if (p.reduced === 'expressed') return 'reduced';
  if (p.base === 'B' && p.dilution === 'normal' && p.pattern === 'Bar') return 'blue_bar';
  if (p.base === 'B' && p.dilution === 'normal' && p.pattern === 'Checker') return 'blue_checker';
  if (p.base === 'B' && p.dilution === 'dilute' && p.pattern === 'Bar') return 'silver_bar';
  if (p.base === 'BA' && p.dilution === 'normal') return 'ash_red';
  if (p.base === 'BA' && p.dilution === 'dilute') return 'ash_yellow';
  if (p.base === 'b') return 'brown';
  if (p.crest === 'crested') return 'crested';
  if (p.muffs === 'present') return 'muffed';
  if (p.eyeColor === 'bull') return 'bull_eye';
  if (p.eyeColor === 'odd') return 'odd_eye';
  return 'blue_bar';
}

// ============================================================
// RARITY DETERMINATION
// ============================================================
export function getRarity(p: Partial<PigeonPhenotype>): 'common' | 'uncommon' | 'rare' | 'very-rare' {
  if (p.almond === 'de-roy' || p.toyStencil === 'homo' || p.reduced === 'expressed') return 'very-rare';
  if (p.almond === 'almond' || p.indigo !== 'none' || p.slate === 'expressed' || p.recessiveRed === 'expressed') return 'rare';
  if (p.kite === 'present' || p.crest === 'crested' || p.muffs === 'present' || p.toyStencil !== 'none') return 'uncommon';
  if (p.dilution === 'dilute' || p.eyeColor !== 'orange') return 'uncommon';
  return 'common';
}

// ============================================================
// CALCULATE OFFSPRING
// ============================================================
export function calculateOffspring(
  sire: ParentGenotype,
  dam: ParentGenotype,
  lang: Language
): { results: OffspringResult[]; lethal: LethalResult } {
  const results: OffspringResult[] = [];
  const resultMap: Record<string, { percentage: number; phenotype: Partial<PigeonPhenotype> }> = {};

  // Helper to add or merge a result
  const addResult = (pct: number, phenotype: Partial<PigeonPhenotype>) => {
    const key = getPhenotypeImageKey(phenotype) + '|' + getPhenotypeLabel(phenotype, lang);
    if (resultMap[key]) {
      resultMap[key].percentage += pct;
    } else {
      resultMap[key] = { percentage: pct, phenotype };
    }
  };

  // --- BASE COLOR (autosomal, 3 alleles B > BA > b) ---
  // Each parent contributes one allele; the higher-priority one is expressed
  const sireBases: BaseColor[] = sire.baseCarrier && sire.baseCarrier !== sire.base ? [sire.base, sire.baseCarrier] : [sire.base, sire.base];
  const damBases: BaseColor[] = dam.baseCarrier && dam.baseCarrier !== dam.base ? [dam.base, dam.baseCarrier] : [dam.base, dam.base];

  const baseProbabilities: Record<string, number> = {};
  for (const sb of sireBases) {
    for (const db of damBases) {
      const expressed = BASE_COLOR_PRIORITY[sb] >= BASE_COLOR_PRIORITY[db] ? sb : db;
      const hidden = BASE_COLOR_PRIORITY[sb] >= BASE_COLOR_PRIORITY[db] ? db : sb;
      const comboKey = `${expressed}|${hidden}`;
      baseProbabilities[comboKey] = (baseProbabilities[comboKey] || 0) + 25;
    }
  }

  // --- PATTERN (allelic, incomplete dominance) ---
  const sirePatternP: Pattern[] = [sire.pattern, sire.pattern];
  const damPatternP: Pattern[] = [dam.pattern, dam.pattern];
  const patternProbabilities: Record<string, number> = {};
  for (const sp of sirePatternP) {
    for (const dp of damPatternP) {
      const expressed = PATTERN_PRIORITY[sp] >= PATTERN_PRIORITY[dp] ? sp : dp;
      const hidden = PATTERN_PRIORITY[sp] >= PATTERN_PRIORITY[dp] ? dp : sp;
      const comboKey = `${expressed}|${hidden}`;
      patternProbabilities[comboKey] = (patternProbabilities[comboKey] || 0) + 25;
    }
  }

  // --- DILUTION (sex-linked recessive, Z chromosome) ---
  // Male = ZZ, Female = ZW
  // Sire (ZZ) passes one Z to all offspring
  // Dam (ZW) passes Z to sons, W to daughters
  // So: sons get Z from dam, daughters get W from dam (no dilution gene from dam)
  // Sire dilution: if normal could be DD or Dd (carrier); simplify:
  // If sire is dilute, all his Z carry 'd'. If normal, assume DD (no carrier)
  // If dam is dilute, her single Z carries 'd'
  const sireDilute = sire.dilution === 'dilute';   // if true, sire is dd
  const damDilute = dam.dilution === 'dilute';      // if true, dam is d_

  const dilutionProbabilities: Record<Dilution, number> = { normal: 0, dilute: 0 };

  // Sons (50%): get Z from sire + Z from dam
  // Daughters (50%): get Z from sire + W from dam
  // Sons dilute: need d from both parents
  //   sireDilute (dd) gives d, damDilute (d_) gives d with 50% prob
  //   → sons have 50% chance dilute if dam is dilute AND sire is dilute
  // Daughters dilute: need d from sire (only Z source) + W has nothing
  //   → daughters dilute if sire is dilute (dd) → all daughters get d from sire
  if (sireDilute && damDilute) {
    // Sons: dd (dilute) 100%, Daughters: d_ (dilute) 100%
    dilutionProbabilities.dilute = 100;
  } else if (sireDilute && !damDilute) {
    // Sons: Dd (normal phenotype), Daughters: d_ (dilute)
    dilutionProbabilities.dilute = 50;
    dilutionProbabilities.normal = 50;
  } else if (!sireDilute && damDilute) {
    // Sons: Dd (normal, carrier), Daughters: D_ (normal)
    dilutionProbabilities.normal = 100;
  } else {
    dilutionProbabilities.normal = 100;
  }

  // --- ALMOND (sex-linked on Z, dominant) ---
  // Almond St is dominant. StSt males = De Roy (sterile), St_ = almond, st_ = normal
  const sireAlmond = sire.almond;  // male ZZ
  const damAlmond = dam.almond;    // female ZW

  const almondProbabilities: Record<string, number> = { none: 0, almond: 0, 'de-roy': 0 };

  if (sireAlmond === 'de-roy') {
    // StSt male passes St to all
    if (damAlmond === 'almond' || damAlmond === 'de-roy') {
      // St_ dam passes St with 50% to sons
      // Sons: 50% StSt (de-roy), 50% Stst (almond)
      // Daughters: StSt_ = 100% almond
      almondProbabilities['de-roy'] = 25;
      almondProbabilities['almond'] = 75;
    } else {
      // dam is st_ (normal)
      almondProbabilities['almond'] = 100;
    }
  } else if (sireAlmond === 'almond') {
    // Stst male passes St 50%, st 50%
    if (damAlmond === 'almond' || damAlmond === 'de-roy') {
      almondProbabilities['de-roy'] = 25;
      almondProbabilities['almond'] = 50;
      almondProbabilities['none'] = 25;
    } else {
      almondProbabilities['almond'] = 50;
      almondProbabilities['none'] = 50;
    }
  } else {
    // sire normal (stst)
    if (damAlmond === 'almond' || damAlmond === 'de-roy') {
      // dam passes St to sons (50%), W to daughters
      almondProbabilities['almond'] = 50;
      almondProbabilities['none'] = 50;
    } else {
      almondProbabilities['none'] = 100;
    }
  }

  // --- INDIGO (autosomal, incomplete dominant) ---
  const sireIndigo = sire.indigo === 'homo' ? 'InIn' : sire.indigo === 'hetero' ? 'Inin' : 'inin';
  const damIndigo = dam.indigo === 'homo' ? 'InIn' : dam.indigo === 'hetero' ? 'Inin' : 'inin';
  const indigoProbabilities: Record<string, number> = {};
  const sireAllelesI = sireIndigo === 'InIn' ? ['In', 'In'] : sireIndigo === 'Inin' ? ['In', 'in'] : ['in', 'in'];
  const damAllelesI = damIndigo === 'InIn' ? ['In', 'In'] : damIndigo === 'Inin' ? ['In', 'in'] : ['in', 'in'];
  for (const sa of sireAllelesI) {
    for (const da of damAllelesI) {
      const combo = sa === 'In' && da === 'In' ? 'homo' : sa === 'In' || da === 'In' ? 'hetero' : 'none';
      indigoProbabilities[combo] = (indigoProbabilities[combo] || 0) + 25;
    }
  }

  // --- RECESSIVE RED (autosomal recessive) ---
  const sireRR = sire.recessiveRed === 'expressed' ? 'ee' : sire.recessiveRed === 'carrier' ? 'Ee' : 'EE';
  const damRR = dam.recessiveRed === 'expressed' ? 'ee' : dam.recessiveRed === 'carrier' ? 'Ee' : 'EE';
  const rrProbabilities: Record<string, number> = {};
  const sireAllelesR = sireRR === 'ee' ? ['e', 'e'] : sireRR === 'Ee' ? ['E', 'e'] : ['E', 'E'];
  const damAllelesR = damRR === 'ee' ? ['e', 'e'] : damRR === 'Ee' ? ['E', 'e'] : ['E', 'E'];
  for (const sa of sireAllelesR) {
    for (const da of damAllelesR) {
      const combo = sa === 'e' && da === 'e' ? 'expressed' : sa === 'e' || da === 'e' ? 'carrier' : 'none';
      rrProbabilities[combo] = (rrProbabilities[combo] || 0) + 25;
    }
  }

  // --- TOY STENCIL (autosomal, incomplete dominant) ---
  const sireTS = sire.toyStencil === 'homo' ? 'TsTs' : sire.toyStencil === 'hetero' ? 'Tsts' : 'tsts';
  const damTS = dam.toyStencil === 'homo' ? 'TsTs' : dam.toyStencil === 'hetero' ? 'Tsts' : 'tsts';
  const tsProbabilities: Record<string, number> = {};
  const sireAllelesT = sireTS === 'TsTs' ? ['Ts', 'Ts'] : sireTS === 'Tsts' ? ['Ts', 'ts'] : ['ts', 'ts'];
  const damAllelesT = damTS === 'TsTs' ? ['Ts', 'Ts'] : damTS === 'Tsts' ? ['Ts', 'ts'] : ['ts', 'ts'];
  for (const sa of sireAllelesT) {
    for (const da of damAllelesT) {
      const combo = sa === 'Ts' && da === 'Ts' ? 'homo' : sa === 'Ts' || da === 'Ts' ? 'hetero' : 'none';
      tsProbabilities[combo] = (tsProbabilities[combo] || 0) + 25;
    }
  }

  // --- REDUCED (sex-linked recessive on Z) ---
  const sireReduced = sire.reduced;  // male ZZ: none=RR, carrier=Rr, expressed=rr
  const damReduced = dam.reduced;    // female ZW: none=R_, expressed=r_
  const reducedProbabilities: Record<string, number> = { none: 0, carrier: 0, expressed: 0 };

  if (sireReduced === 'expressed') {
    // rr sire passes r to all
    if (damReduced === 'expressed') {
      reducedProbabilities.expressed = 100;
    } else {
      reducedProbabilities.expressed = 50; // daughters r_ expressed
      reducedProbabilities.carrier = 50;   // sons Rr carriers
    }
  } else if (sireReduced === 'carrier') {
    // Rr sire passes R 50%, r 50%
    if (damReduced === 'expressed') {
      reducedProbabilities.expressed = 50;
      reducedProbabilities.carrier = 50;
    } else {
      reducedProbabilities.carrier = 50;
      reducedProbabilities.none = 50;
    }
  } else {
    if (damReduced === 'expressed') {
      reducedProbabilities.carrier = 50;  // sons get r from dam
      reducedProbabilities.none = 50;     // daughters get W
    } else {
      reducedProbabilities.none = 100;
    }
  }

  // --- SLATE (autosomal recessive) ---
  const sireSlate = sire.slate === 'expressed' ? 'slsl' : sire.slate === 'carrier' ? 'Slsl' : 'SlSl';
  const damSlate = dam.slate === 'expressed' ? 'slsl' : dam.slate === 'carrier' ? 'Slsl' : 'SlSl';
  const slateProbabilities: Record<string, number> = {};
  const sireAllelesSl = sireSlate === 'slsl' ? ['sl', 'sl'] : sireSlate === 'Slsl' ? ['Sl', 'sl'] : ['Sl', 'Sl'];
  const damAllelesSl = damSlate === 'slsl' ? ['sl', 'sl'] : damSlate === 'Slsl' ? ['Sl', 'sl'] : ['Sl', 'Sl'];
  for (const sa of sireAllelesSl) {
    for (const da of damAllelesSl) {
      const combo = sa === 'sl' && da === 'sl' ? 'expressed' : sa === 'sl' || da === 'sl' ? 'carrier' : 'none';
      slateProbabilities[combo] = (slateProbabilities[combo] || 0) + 25;
    }
  }

  // --- KITE (autosomal dominant, simplified) ---
  const kiteProb: Record<string, number> = {};
  if (sire.kite === 'present' || dam.kite === 'present') {
    kiteProb.present = 75;
    kiteProb.none = 25;
  } else {
    kiteProb.none = 100;
  }

  // --- SPREAD (autosomal dominant) ---
  const spreadProb: Record<string, number> = {};
  if (sire.spread === 'present' || dam.spread === 'present') {
    spreadProb.present = 75;
    spreadProb.none = 25;
  } else {
    spreadProb.none = 100;
  }

  // --- CREST (autosomal recessive) ---
  const sireCrest = sire.crest === 'crested' ? 'crcr' : sire.crest === 'carrier' ? 'Crcr' : 'CrCr';
  const damCrest = dam.crest === 'crested' ? 'crcr' : dam.crest === 'carrier' ? 'Crcr' : 'CrCr';
  const crestProbabilities: Record<string, number> = {};
  const sireAllelesC = sireCrest === 'crcr' ? ['cr', 'cr'] : sireCrest === 'Crcr' ? ['Cr', 'cr'] : ['Cr', 'Cr'];
  const damAllelesC = damCrest === 'crcr' ? ['cr', 'cr'] : damCrest === 'Crcr' ? ['Cr', 'cr'] : ['Cr', 'Cr'];
  for (const sa of sireAllelesC) {
    for (const da of damAllelesC) {
      const combo = sa === 'cr' && da === 'cr' ? 'crested' : sa === 'cr' || da === 'cr' ? 'carrier' : 'none';
      crestProbabilities[combo] = (crestProbabilities[combo] || 0) + 25;
    }
  }

  // --- MUFFS (autosomal dominant, simplified) ---
  const muffsProb: Record<string, number> = {};
  if (sire.muffs === 'present' || dam.muffs === 'present') {
    muffsProb.present = 75;
    muffsProb.none = 25;
  } else {
    muffsProb.none = 100;
  }

  // --- EYE COLOR ---
  // Simplified: bull eye is recessive, pearl is recessive to orange
  // If either parent has bull/pearl, some offspring may express it
  const eyeProbabilities: Record<string, number> = {};
  if (sire.eyeColor === 'bull' && dam.eyeColor === 'bull') {
    eyeProbabilities.bull = 100;
  } else if (sire.eyeColor === 'bull' || dam.eyeColor === 'bull') {
    eyeProbabilities.bull = 50;
    eyeProbabilities.orange = 50;
  } else if (sire.eyeColor === 'pearl' && dam.eyeColor === 'pearl') {
    eyeProbabilities.pearl = 100;
  } else if (sire.eyeColor === 'pearl' || dam.eyeColor === 'pearl') {
    eyeProbabilities.pearl = 50;
    eyeProbabilities.orange = 50;
  } else if (sire.eyeColor === 'odd' || dam.eyeColor === 'odd') {
    eyeProbabilities.odd = 30;
    eyeProbabilities.orange = 70;
  } else {
    eyeProbabilities.orange = 100;
  }

  // === COMBINE ALL TRAITS ===
  // Only combine the major visible traits to keep result count manageable
  // We combine: base, pattern, dilution, almond, indigo, recessive red, toy stencil
  // Other traits (slate, kite, spread, crest, muffs, eye) are added as notes

  type ComboEntry = { pct: number; phenotype: Partial<PigeonPhenotype> };

  let combos: ComboEntry[] = [{ pct: 100, phenotype: {} }];

  // Base color
  combos = expandCombos(combos, baseProbabilities, (p, key) => {
    const [expressed, hidden] = key.split('|');
    p.base = expressed as BaseColor;
  });

  // Pattern
  combos = expandCombos(combos, patternProbabilities, (p, key) => {
    const [expressed] = key.split('|');
    p.pattern = expressed as Pattern;
  });

  // Dilution
  combos = expandCombos(combos, dilutionProbabilities as Record<string, number>, (p, key) => {
    p.dilution = key as Dilution;
  });

  // Almond
  combos = expandCombos(combos, almondProbabilities, (p, key) => {
    p.almond = key as Almond;
  });

  // Indigo
  combos = expandCombos(combos, indigoProbabilities, (p, key) => {
    p.indigo = key as Indigo;
  });

  // Recessive red
  combos = expandCombos(combos, rrProbabilities, (p, key) => {
    p.recessiveRed = key as RecessiveRed;
  });

  // Toy stencil
  combos = expandCombos(combos, tsProbabilities, (p, key) => {
    p.toyStencil = key as ToyStencil;
  });

  // Now add non-splitting traits as majority expression
  for (const c of combos) {
    // Slate: only show if expressed
    const slateEntries = Object.entries(slateProbabilities).filter(([k]) => k === 'expressed');
    if (slateEntries.length > 0 && slateEntries[0][1] > 0) {
      c.phenotype.slate = slateProbabilities.expressed > 25 ? 'expressed' : 'none';
    }
    // Kite
    if (kiteProb.present > 50) c.phenotype.kite = 'present';
    // Spread
    if (spreadProb.present > 50) c.phenotype.spread = 'present';
    // Crest
    if (crestProbabilities.crested > 0) c.phenotype.crest = crestProbabilities.crested > 25 ? 'crested' : 'none';
    // Muffs
    if (muffsProb.present > 50) c.phenotype.muffs = 'present';
    // Eye
    const topEye = Object.entries(eyeProbabilities).sort((a, b) => b[1] - a[1])[0];
    if (topEye) c.phenotype.eyeColor = topEye[0] as EyeColor;

    // Reduced
    if (reducedProbabilities.expressed > 25) c.phenotype.reduced = 'expressed';
  }

  for (const c of combos) {
    if (c.pct < 0.1) continue;
    addResult(c.pct, c.phenotype);
  }

  // Sort by percentage descending, merge results under 2% into "Other"
  const sorted = Object.entries(resultMap)
    .map(([key, val]) => ({
      label: { ro: getPhenotypeLabel(val.phenotype, 'ro'), en: getPhenotypeLabel(val.phenotype, 'en') },
      percentage: Math.round(val.percentage * 10) / 10,
      imageKey: getPhenotypeImageKey(val.phenotype),
      description: getPhenotypeDescription(val.phenotype, lang),
      rarity: getRarity(val.phenotype),
    }))
    .filter(r => r.percentage >= 1)
    .sort((a, b) => b.percentage - a.percentage);

  // Check for lethal combinations
  const lethal = checkLethal(sire, dam, lang);

  return { results: sorted, lethal };
}

function expandCombos(
  combos: { pct: number; phenotype: Partial<PigeonPhenotype> }[],
  probabilities: Record<string, number>,
  apply: (p: Partial<PigeonPhenotype>, key: string) => void
): { pct: number; phenotype: Partial<PigeonPhenotype> }[] {
  const result: { pct: number; phenotype: Partial<PigeonPhenotype> }[] = [];
  for (const c of combos) {
    for (const [key, prob] of Object.entries(probabilities)) {
      if (prob === 0) continue;
      const newPheno = { ...c.phenotype };
      apply(newPheno, key);
      result.push({ pct: (c.pct * prob) / 100, phenotype: newPheno });
    }
  }
  return result;
}

function getPhenotypeDescription(p: Partial<PigeonPhenotype>, lang: Language): { ro: string; en: string } {
  const descRo: string[] = [];
  const descEn: string[] = [];

  if (p.recessiveRed === 'expressed') {
    descRo.push('Roșu recesiv — culoare uniformă care maschează modelul de bază.');
    descEn.push('Recessive red — uniform color that masks the base pattern.');
  }
  if (p.almond === 'de-roy') {
    descRo.push('De Roy — formă homozigotă Almond cu depigmentare progresivă. Masculii sunt adesea sterili.');
    descEn.push('De Roy — homozygous almond form with progressive depigmentation. Males are often sterile.');
  } else if (p.almond === 'almond') {
    descRo.push('Almond (Migdală) — mutație sex-link dominantă cu pete deschise pe aripi.');
    descEn.push('Almond — sex-linked dominant mutation with light flecking on wings.');
  }
  if (p.indigo !== 'none') {
    descRo.push('Indigo — modifică culoarea de bază, adăugând reflexe albăstrui-violet.');
    descEn.push('Indigo — modifies base color with blue-violet sheen.');
  }
  if (p.dilution === 'dilute') {
    descRo.push('Diluat — pigment redus, culoare mai pală (sex-link recesiv).');
    descEn.push('Dilute — reduced pigment, paler color (sex-linked recessive).');
  }
  if (p.eyeColor === 'bull') {
    descRo.push('Ochi negru (Bull eye) — asociat cu zone albe/pied, recessiv.');
    descEn.push('Bull eye — associated with white/pied areas, recessive.');
  }
  if (p.eyeColor === 'odd') {
    descRo.push('Ochi sparți (Odd eye) — fiecare ochi are culoare diferită.');
    descEn.push('Odd eye — each eye has a different color.');
  }
  if (p.crest === 'crested') {
    descRo.push('Moț — structură recesivă, creastă pe cap.');
    descEn.push('Crest — recessive structure trait, feathered crest on head.');
  }

  if (descRo.length === 0) {
    descRo.push('Fenotip comun, sălbatic sau apropiat de tipul sălbatic.');
    descEn.push('Common phenotype, wild-type or near wild-type.');
  }

  return { ro: descRo.join(' '), en: descEn.join(' ') };
}

// ============================================================
// LETHAL MUTATION CHECK
// ============================================================
function checkLethal(sire: ParentGenotype, dam: ParentGenotype, lang: Language): LethalResult {
  const detected: LethalMutation[] = [];

  // Almond x Almond = potential StSt homozygous
  if ((sire.almond === 'almond' || sire.almond === 'de-roy') &&
      (dam.almond === 'almond' || dam.almond === 'de-roy')) {
    detected.push(LETHAL_MUTATIONS[0]);
  }

  // Both recessive red carriers → 25% ee offspring (not lethal but can have issues)
  // Both slate carriers → not lethal

  // Short beak (if we had it) — skip for now

  if (detected.length > 0) {
    return {
      detected: true,
      mutations: detected,
      warning: {
        ro: 'ATENȚIE: Această împerechere poate produce pui cu mutații letale sau semi-letale! ' +
          detected.map(m => m.description.ro).join(' '),
        en: 'WARNING: This pairing may produce offspring with lethal or semi-lethal mutations! ' +
          detected.map(m => m.description.en).join(' '),
      },
    };
  }

  return { detected: false, mutations: [], warning: null };
}

// ============================================================
// INBREEDING COEFFICIENT (Wright's COI)
// ============================================================
// COI = sum of (1/2)^(n1+n2+1) * (1+F_common) for each common ancestor
// where n1 = generations from sire to common ancestor
//       n2 = generations from dam to common ancestor
// F_common = inbreeding of common ancestor (assumed 0 for simplicity)
export function calculateInbreeding(
  sireAncestry: AncestorNode | null,
  damAncestry: AncestorNode | null
): InbreedingResult {
  if (!sireAncestry || !damAncestry) {
    return {
      coefficient: 0,
      level: 'safe',
      commonAncestors: [],
      relationship: { ro: 'Fără date pedigree', en: 'No pedigree data' },
      warning: null,
      color: 'green',
    };
  }

  // Build ancestor maps: id → min generation depth
  const sireAncestors = new Map<string, { ring: string; gen: number }>();
  const damAncestors = new Map<string, { ring: string; gen: number }>();

  const traverse = (node: AncestorNode | null, gen: number, map: Map<string, { ring: string; gen: number }>) => {
    if (!node || gen > 4) return;
    const existing = map.get(node.id);
    if (!existing || gen < existing.gen) {
      map.set(node.id, { ring: node.ring, gen });
    }
    // We can't traverse children from AncestorNode since it only has IDs
    // This function works with a tree structure
  };

  // Build tree from ancestry (ancestry is a tree with sire_id/dam_id)
  const buildTree = (root: AncestorNode, allNodes: Map<string, AncestorNode>): any => {
    const visit = (node: AncestorNode | null, gen: number): any => {
      if (!node || gen > 4) return null;
      return {
        id: node.id,
        ring: node.ring,
        sire: node.sire_id ? visit(allNodes.get(node.sire_id) || null, gen + 1) : null,
        dam: node.dam_id ? visit(allNodes.get(node.dam_id) || null, gen + 1) : null,
        gen,
      };
    };
    return visit(root, 0);
  };

  // Collect all ancestor IDs from both sides
  const collectAncestors = (node: any, map: Map<string, { ring: string; gen: number }>) => {
    if (!node) return;
    const existing = map.get(node.id);
    if (!existing || node.gen < existing.gen) {
      map.set(node.id, { ring: node.ring, gen: node.gen });
    }
    collectAncestors(node.sire, map);
    collectAncestors(node.dam, map);
  };

  // We need the actual tree; for now use the ancestry objects directly
  // Since AncestorNode has sire_id/dam_id, we need to fetch them
  // This is a simplified version that works with pre-loaded trees
  const sireTree = sireAncestry as any;
  const damTree = damAncestry as any;

  collectAncestors(sireTree, sireAncestors);
  collectAncestors(damTree, damAncestors);

  // Find common ancestors
  const common: { ring: string; n1: number; n2: number }[] = [];
  for (const [id, sireInfo] of sireAncestors) {
    const damInfo = damAncestors.get(id);
    if (damInfo) {
      common.push({ ring: sireInfo.ring, n1: sireInfo.gen, n2: damInfo.gen });
    }
  }

  // Calculate COI
  let coefficient = 0;
  for (const c of common) {
    coefficient += Math.pow(0.5, c.n1 + c.n2 + 1) * (1 + 0);
  }
  coefficient = coefficient * 100;

  // Determine relationship and level
  let level: InbreedingResult['level'] = 'safe';
  let color: InbreedingResult['color'] = 'green';
  let warning: { ro: string; en: string } | null = null;
  let relationship: { ro: string; en: string };

  if (coefficient >= 25) {
    level = 'extreme';
    color = 'red';
    relationship = {
      ro: 'Consangvinitate excesivă',
      en: 'Excessive inbreeding',
    };
    warning = {
      ro: 'ATENȚIE! Consangvinitate excesivă (Risc mare de anomalii fizice, scădere a imunității sau pui neviabili). Se recomandă evitarea acestei combinații dacă nu sunteți un crescător experimentat.',
      en: 'WARNING! Excessive inbreeding (High risk of physical anomalies, reduced immunity or non-viable chicks). This combination should be avoided unless you are an experienced breeder.',
    };
  } else if (coefficient >= 12.5) {
    level = 'linebreeding';
    color = 'gold';
    relationship = {
      ro: 'Linebreeding (consangvinitate controlată)',
      en: 'Linebreeding (controlled inbreeding)',
    };
    const ancestorNames = common.map(c => c.ring).join(', ');
    warning = {
      ro: `Linebreeding detectat (Fixarea caracterelor strămoșului comun: ${ancestorNames}). Coeficient optim pentru păstrarea liniei de campioni. Monitorizați vitalitatea puilor.`,
      en: `Linebreeding detected (Fixing traits of common ancestor: ${ancestorNames}). Optimal coefficient for maintaining champion bloodlines. Monitor chick vitality.`,
    };
  } else if (coefficient > 0) {
    level = 'safe';
    color = 'green';
    relationship = {
      ro: 'Consangvinitate minimă',
      en: 'Minimal inbreeding',
    };
    warning = {
      ro: `Risc foarte scăzut. S-au găsit strămoși comuni îndepărtați (${common.map(c => c.ring).join(', ')}). Coeficient sub nivelul de risc.`,
      en: `Very low risk. Distant common ancestors found (${common.map(c => c.ring).join(', ')}). Coefficient below risk threshold.`,
    };
  } else {
    level = 'safe';
    color = 'green';
    relationship = {
      ro: 'Fără consangvinitate',
      en: 'No inbreeding',
    };
  }

  return {
    coefficient: Math.round(coefficient * 100) / 100,
    level,
    commonAncestors: common.map(c => c.ring),
    relationship,
    warning,
    color,
  };
}

// ============================================================
// GENETICS Q&A KNOWLEDGE BASE (for AI assistant)
// ============================================================
export const GENETICS_KNOWLEDGE: { keywords: string[]; answer_ro: string; answer_en: string }[] = [
  {
    keywords: ['almond', 'migdală', 'migdala', 'de roy', 'de-roy', 'deroy'],
    answer_ro: 'Almond (Migdală) este o mutație sex-link dominantă pe cromozomul Z. Masculii pot fi StSt (De Roy, homozigot — adesea sterili) sau Stst (Almond heterozigot). Femelele pot fi doar St_ (Almond) sau st_ (normal). IMPORTANT: Nu împerecheați niciodată doi părinți Almond/De Roy — fiii StSt sunt sterili și au probleme de vedere. Pentru a obține pui Almond, împerecheați un mascul Almond cu o femelă normală — 50% din pui vor fi Almond.',
    answer_en: 'Almond is a sex-linked dominant mutation on the Z chromosome. Males can be StSt (De Roy, homozygous — often sterile) or Stst (heterozygous Almond). Females can only be St_ (Almond) or st_ (normal). IMPORTANT: Never pair two Almond/De Roy parents — StSt sons are sterile and have vision problems. To produce Almond offspring, pair an Almond male with a normal female — 50% of chicks will be Almond.',
  },
  {
    keywords: ['indigo', 'andaluzian', 'andalusian'],
    answer_ro: 'Indigo este o mutație autozomală cu dominanță incompletă. Heterozigot (Inin) produce fenotipul Indigo cu reflexe albăstrui-violet. Homozigot (InIn) produce Andaluzian — o formă mai extremă cu corp albastru-închis și aripi mai deschise. Pe bază Albastru dă un aspect metalic caracteristic. Nu este letală.',
    answer_en: 'Indigo is an autosomal mutation with incomplete dominance. Heterozygous (Inin) produces the Indigo phenotype with blue-violet sheen. Homozygous (InIn) produces Andalusian — a more extreme form with dark blue body and lighter wings. On a blue base it gives a metallic appearance. Not lethal.',
  },
  {
    keywords: ['recesiv roșu', 'recessive red', 'roșu recesiv', 'rosu recesiv'],
    answer_ro: 'Roșu Recesiv este o mutație autozomală recesivă (ee). Maschează complet culoarea de bază și modelul. Pentru a obține pui roșii, ambii părinți trebuie să poarte gena "e" (fie expresați ee, fie purtători Ee). Încrucișarea a doi purtători dă 25% pui roșii, 50% purtători, 25% normali. Versiunea diluată produce Galben Recesiv.',
    answer_en: 'Recessive Red is an autosomal recessive mutation (ee). It completely masks the base color and pattern. To get red offspring, both parents must carry the \'e\' gene (either expressed ee or carriers Ee). Crossing two carriers gives 25% red, 50% carriers, 25% normal. The dilute version produces Recessive Yellow.',
  },
  {
    keywords: ['ochi ceacâr', 'ochi ceacir', 'bull eye', 'pearl eye', 'ochi negru', 'ochi sparți', 'odd eye', 'crack eye'],
    answer_ro: 'Genetica ochilor la porumbei: Ochi Portocaliu este tipul sălbatic dominant. Ochi Perlat (Pearl) este recesiv. Ochi Negru (Bull eye) este recesiv și asociat cu zone albe/pied — porumbeii cu zone albe pot avea ochi negri în acea parte. Ochi Sparți (Odd eye) = fiecare ochi are culoare diferită, apare prin combinarea genelor și mozaicism. La Jucătorii de Galați, ochiul perlat este caracteristic și se moștenește recesiv.',
    answer_en: 'Pigeon eye genetics: Orange eye is the wild-type dominant. Pearl eye is recessive. Bull eye is recessive and associated with white/pied areas — birds with white areas may have bull eyes on that side. Odd eye = each eye has a different color, occurs through gene combinations and mosaicism. In Galati Rollers, pearl eye is characteristic and inherited recessively.',
  },
  {
    keywords: ['consangvin', 'inbreeding', 'linebreeding', 'coeficient', 'coi', 'frate', 'soră', 'sora', 'tată fiică', 'mama fiu'],
    answer_ro: 'Coeficientul de consangvinitate (COI) măsoară probabilitatea ca două alele identice să fie moștenite de la un strămoș comun. Frate×Soră = 25% COI (risc extrem). Tată×Fiică sau Mamă×Fiu = 25% COI (risc extrem). Nepot×Bunică = 12.5% COI (linebreeding, controlat). Veri primari = 6.25% COI (sigur). Peste 25% = anomalii, imunitate scăzută, pui neviabili. 12.5-25% = linebreeding pentru fixarea caracterelor. Sub 6.25% = sigur.',
    answer_en: 'The inbreeding coefficient (COI) measures the probability that two identical alleles are inherited from a common ancestor. Sibling×Sibling = 25% COI (extreme risk). Parent×Offspring = 25% COI (extreme risk). Grandchild×Grandparent = 12.5% COI (linebreeding, controlled). First cousins = 6.25% COI (safe). Above 25% = anomalies, low immunity, non-viable chicks. 12.5-25% = linebreeding for fixing traits. Below 6.25% = safe.',
  },
  {
    keywords: ['toy stencil', 'stencil'],
    answer_ro: 'Toy Stencil este o mutație autozomală cu dominanță incompletă. Heterozigot (Tsts) produce aripi albe/desenate cu model. Homozigot (TsTs) produce formă extremă cu pene de zbor albe. Este apreciată la rasele ornamentale. Nu este letală.',
    answer_en: 'Toy Stencil is an autosomal mutation with incomplete dominance. Heterozygous (Tsts) produces white/patterned wings. Homozygous (TsTs) produces extreme form with white flight feathers. Prized in fancy breeds. Not lethal.',
  },
  {
    keywords: ['reduced', 'reduct', 'redus'],
    answer_ro: 'Reduced este o mutație sex-link recesivă pe cromozomul Z. Reduce pigmentul general, dând un aspect spălăcit. Masculii trebuie să fie rr (homozigot) pentru a exprima. Femelele exprimă cu un singur r (r_). Poate fi combinat cu alte mutații pentru efecte vizuale unice.',
    answer_en: 'Reduced is a sex-linked recessive mutation on the Z chromosome. It reduces overall pigment, giving a washed-out appearance. Males must be rr (homozygous) to express. Females express with a single r (r_). Can be combined with other mutations for unique visual effects.',
  },
  {
    keywords: ['slate', 'ardezie'],
    answer_ro: 'Slate (Ardezie) este o mutație autozomală recesivă (slsl). Produce un gri-albastru închis pe bază Albastru. Ambii părinți trebuie să fie purtători sau expresați pentru a obține pui Slate. Este o culoare rară și apreciată.',
    answer_en: 'Slate is an autosomal recessive mutation (slsl). It produces a dark blue-grey on a blue base. Both parents must be carriers or expressed to produce Slate offspring. It is a rare and prized color.',
  },
  {
    keywords: ['moț', 'crest', 'creastă', 'cu moț'],
    answer_ro: 'Moțul (Crest) este o structură autozomală recesivă (crcr). Ambii părinți trebuie să poarte gena pentru a obține pui cu moț. Doi părinți cu moț produc 100% pui cu moț. Un părinte cu moț + unul purtător = 50% cu moț. Nu este letală, dar la unele rase moțul poate afecta vederea dacă acoperă ochii.',
    answer_en: 'Crest is an autosomal recessive structure trait (crcr). Both parents must carry the gene to produce crested offspring. Two crested parents produce 100% crested chicks. One crested + one carrier = 50% crested. Not lethal, but in some breeds the crest may affect vision if it covers the eyes.',
  },
  {
    keywords: ['muffs', 'încălțătură', 'incaltzatura', 'picioare pline', 'foot feather'],
    answer_ro: 'Muffs (încălțătură / picioare plume) este o structură autozomală dominantă (Mu). Un singur părinte cu muffs poate produce pui cu muffs. Este apreciată la rasele ornamentale cum ar fi Pavat, Florentin etc.',
    answer_en: 'Muffs (foot feathering) is an autosomal dominant structure trait (Mu). A single muffed parent can produce muffed offspring. Prized in fancy breeds such as Pavi, Florentine, etc.',
  },
  {
    keywords: ['kite', 'tăciune', 'taciune'],
    answer_ro: 'Kite este un modificator autozomal care întunecă modelul pe T-pattern și Checker. Pe bază Albastru produce un aspect bronz-închis caracteristic. Este dominant și se transmite ușor.',
    answer_en: 'Kite is an autosomal modifier that darkens the pattern on T-pattern and Checker. On a blue base it produces a characteristic dark bronze appearance. It is dominant and easily transmitted.',
  },
  {
    keywords: ['spread', 'negru solid', 'solid black', 'lavanda'],
    answer_ro: 'Spread (S) este o mutație autozomală dominantă care extinde pigmentul întunecat pe tot corpul, mascând modelul. Pe bază Albastru (B) produce Negru Solid. Pe bază Roșu Cenușiu (BA) produce Lavanda (ash spread). Un singur părinte spread poate transmite gena.',
    answer_en: 'Spread (S) is an autosomal dominant mutation that spreads dark pigment over the whole body, masking the pattern. On a blue base (B) it produces Solid Black. On an ash-red base (BA) it produces Lavender. A single spread parent can transmit the gene.',
  },
  {
    keywords: ['diluat', 'dilute', 'dilution', 'argintiu', 'silver', 'galben', 'yellow', 'kaki', 'khaki'],
    answer_ro: 'Diluarea este o mutație sex-link recesivă pe cromozomul Z. Pe Albastru produce Argintiu. Pe Roșu Cenușiu produce Galben. Pe Maro produce Kaki. Masculii diluați sunt dd (homozigot). Femelele diluate sunt d_ (un singur Z). Pentru pui diluați, masculul trebuie să fie diluat sau femela diluată + mascul purtător.',
    answer_en: 'Dilution is a sex-linked recessive mutation on the Z chromosome. On Blue it produces Silver. On Ash Red it produces Yellow. On Brown it produces Khaki. Dilute males are dd (homozygous). Dilute females are d_ (single Z). For dilute offspring, the male must be dilute or the female dilute + male carrier.',
  },
];

export function findGeneticsAnswer(question: string, lang: Language): string | null {
  const lower = question.toLowerCase();
  for (const entry of GENETICS_KNOWLEDGE) {
    for (const kw of entry.keywords) {
      if (lower.includes(kw)) {
        return lang === 'ro' ? entry.answer_ro : entry.answer_en;
      }
    }
  }
  return null;
}

// ============================================================
// PHENOTYPE IMAGE URLS (generated AI photos)
// ============================================================
export const PHENOTYPE_IMAGES: Record<string, string> = {
  almond: '/almond.webp',
  de_roy: '/de_roy.webp',
  indigo: '/indigo.webp',
  andalusian: '/andalusian.webp',
  recessive_red: '/recessive_red.webp',
  recessive_yellow: '/recessive_yellow.webp',
  toy_stencil: '/toy_stencil.webp',
  slate: '/slate.webp',
  kite: '/kite.webp',
  spread_black: '/spread_black.webp',
  blue_bar: '/blue_bar.webp',
  blue_checker: '/blue_checker.webp',
  silver_bar: '/silver_bar.webp',
  ash_red: '/ash_red.webp',
  ash_yellow: '/ash_yellow.webp',
  brown: '/brown.webp',
  crested: '/crested.webp',
  muffed: '/muffed.webp',
  bull_eye: '/bull_eye.webp',
  odd_eye: '/odd_eye.webp',
  reduced: '/reduced.webp',
};

export function getPhenotypeImage(key: string): string | null {
  return PHENOTYPE_IMAGES[key] || null;
}
