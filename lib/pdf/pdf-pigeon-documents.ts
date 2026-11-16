import type { jsPDF } from 'jspdf';
import { createPdfBuilder } from '@/lib/pdf/pdf-builder';
import { loadPalmares, loadPdfContext, loadPigeonRecords, type PalmaresRecord, type PigeonRecord } from '@/lib/pdf/pdf-context';
import { GAME_STYLE_LABELS } from '@/lib/types';
import { LOCUS_IDS } from '@/lib/genetics-engine/loci';
import { describeGenotype, describeLocus, LOCUS_TITLES } from '@/lib/genetics-engine/describe';
import { expressGenotype } from '@/lib/genetics-engine/punnett';
import { readStoredGenotype, sexFromRegistry } from '@/lib/genetics-engine/registry';
import {
  buildPedigreeTree,
  flattenPedigree,
  loadPedigreeData,
  type PedigreeNode,
  type PedigreeRow,
} from '@/lib/pedigree/pedigree-tree';

const PEDIGREE_LEVELS = 4;
const PEDIGREE_COLUMNS = [
  { label: 'Gen.', width: 0.6 },
  { label: 'Linie', width: 2.4 },
  { label: 'Inel', width: 1.6 },
  { label: 'Culoare', width: 2 },
  { label: 'An', width: 0.8 },
];
const UNKNOWN = '-';

function groupPalmaresByPigeon(palmares: PalmaresRecord[]) {
  const byPigeon = new Map<string, PalmaresRecord[]>();
  for (const entry of palmares) {
    if (!entry.pigeon_id) continue;
    const list = byPigeon.get(entry.pigeon_id) || [];
    list.push(entry);
    byPigeon.set(entry.pigeon_id, list);
  }
  return byPigeon;
}

export async function buildPigeonSheetsPdf(userId: string): Promise<jsPDF> {
  const [{ header, fonts }, pigeons, palmares] = await Promise.all([
    loadPdfContext(userId),
    loadPigeonRecords(),
    loadPalmares(),
  ]);
  const ringById = new Map(pigeons.map((pigeon) => [pigeon.id, pigeon.ring_series]));
  const palmaresByPigeon = groupPalmaresByPigeon(palmares);

  const builder = createPdfBuilder(header, fonts);
  builder.title('Fișele porumbeilor');

  if (pigeons.length === 0) {
    builder.paragraph('Nu există porumbei înregistrați în crescătorie.');
  }

  for (const pigeon of pigeons) {
    builder.section(`Inel ${pigeon.ring_series || 'fără inel'}`);
    builder.keyValues([
      ['An', pigeon.year],
      ['Sex', pigeon.sex],
      ['Culoare', pigeon.color],
      ['Status', pigeon.status],
      ['Stil de joc', pigeon.game_style ? GAME_STYLE_LABELS[pigeon.game_style] : null],
      ['Campion', pigeon.is_champion ? 'Da' : 'Nu'],
      ['Tată', pigeon.sire_id ? ringById.get(pigeon.sire_id) : null],
      ['Mamă', pigeon.dam_id ? ringById.get(pigeon.dam_id) : null],
      ['Observații', pigeon.notes],
    ]);

    const entries = palmaresByPigeon.get(pigeon.id) || [];
    if (entries.length > 0) {
      builder.table(
        [
          { label: 'Poz.', width: 1 },
          { label: 'Concurs', width: 4 },
          { label: 'An', width: 1.2 },
          { label: 'Distanță (km)', width: 1.8 },
        ],
        entries.map((entry) => [
          String(entry.position),
          entry.race_name,
          entry.year ? String(entry.year) : UNKNOWN,
          entry.distance_km ? String(entry.distance_km) : UNKNOWN,
        ])
      );
    }
  }

  return builder.finish();
}

export async function buildPalmaresPdf(userId: string): Promise<jsPDF> {
  const [{ header, fonts }, pigeons, palmares] = await Promise.all([
    loadPdfContext(userId),
    loadPigeonRecords(),
    loadPalmares(),
  ]);
  const ringById = new Map(pigeons.map((pigeon) => [pigeon.id, pigeon.ring_series]));

  const builder = createPdfBuilder(header, fonts);
  builder.title('Palmaresul crescătoriei');

  if (palmares.length === 0) {
    builder.paragraph('Nu există rezultate înregistrate în palmares.');
  } else {
    builder.table(
      [
        { label: 'Inel', width: 1.4 },
        { label: 'Concurs', width: 3.2 },
        { label: 'An', width: 0.8 },
        { label: 'Poz.', width: 0.6 },
        { label: 'Distanță (km)', width: 1.2 },
        { label: 'Federație', width: 1.6 },
      ],
      palmares.map((entry) => [
        (entry.pigeon_id && ringById.get(entry.pigeon_id)) || UNKNOWN,
        entry.race_name,
        entry.year ? String(entry.year) : UNKNOWN,
        String(entry.position),
        entry.distance_km ? String(entry.distance_km) : UNKNOWN,
        entry.federation || UNKNOWN,
      ])
    );
  }

  return builder.finish();
}

function pedigreeRowCells(rows: PedigreeRow[]): string[][] {
  return rows.map((row) => [
    String(row.generation),
    row.lineage.map((slot) => (slot === 'sire' ? 'Tată' : 'Mamă')).join(' > '),
    row.node?.ring_series || UNKNOWN,
    row.node?.color || UNKNOWN,
    row.node?.year ? String(row.node.year) : UNKNOWN,
  ]);
}

function safeFilePart(value: string): string {
  return value.replace(/[^A-Za-z0-9_-]+/g, '_') || 'porumbel';
}

export async function buildPedigreePdf(userId: string): Promise<jsPDF> {
  const [{ header, fonts }, data] = await Promise.all([loadPdfContext(userId), loadPedigreeData()]);

  const builder = createPdfBuilder(header, fonts);
  builder.title('Pedigree-ul porumbeilor');
  builder.paragraph(`Afișat pe ${PEDIGREE_LEVELS - 1} generații de strămoși.`);

  if (data.pigeonById.size === 0) {
    builder.paragraph('Nu există porumbei înregistrați în crescătorie.');
  }

  for (const pigeon of data.pigeonById.values()) {
    const root = buildPedigreeTree(data, pigeon.id, PEDIGREE_LEVELS);
    if (!root) continue;
    builder.section(`Inel ${pigeon.ring_series || 'fără inel'}`);
    builder.keyValues([
      ['Culoare', pigeon.color],
      ['An', pigeon.year],
    ]);
    builder.table(PEDIGREE_COLUMNS, pedigreeRowCells(flattenPedigree(root, PEDIGREE_LEVELS)));
  }

  return builder.finish();
}

export async function buildPigeonPedigreePdf(
  userId: string,
  pigeonId: string,
  generations: number
): Promise<{ doc: jsPDF; fileName: string }> {
  const [{ header, fonts }, data] = await Promise.all([loadPdfContext(userId), loadPedigreeData()]);
  const root: PedigreeNode | null = buildPedigreeTree(data, pigeonId, generations);
  if (!root) throw new Error('Porumbelul nu a fost găsit.');

  const builder = createPdfBuilder(header, fonts);
  builder.title(`Pedigree ${root.ring_series || ''}`.trim());
  builder.paragraph(`Afișat pe ${generations} generații, inclusiv porumbelul principal.`);
  builder.section(`Inel ${root.ring_series || 'fără inel'}`);
  builder.keyValues([
    ['Culoare', root.color],
    ['An', root.year],
  ]);
  builder.table(PEDIGREE_COLUMNS, pedigreeRowCells(flattenPedigree(root, generations)));

  return {
    doc: builder.finish(),
    fileName: `pedigree-${safeFilePart(root.ring_series)}-${generations}-generatii.pdf`,
  };
}

export async function buildGeneticsPdf(userId: string): Promise<jsPDF> {
  const [{ header, fonts }, pigeons] = await Promise.all([loadPdfContext(userId), loadPigeonRecords()]);

  const builder = createPdfBuilder(header, fonts);
  builder.title('Genetica porumbeilor');

  if (pigeons.length === 0) {
    builder.paragraph('Nu există porumbei înregistrați în crescătorie.');
  }

  for (const pigeon of pigeons) {
    builder.section(`Inel ${pigeon.ring_series || 'fără inel'}`);
    const sex = sexFromRegistry(pigeon.sex);
    const stored = sex ? readStoredGenotype(pigeon.genotype, sex) : null;

    if (!stored || !stored.ok) {
      builder.keyValues([
        ['Sex', pigeon.sex],
        ['Genotip', 'Nedefinit'],
      ]);
      continue;
    }

    const { loci } = stored.parent;
    const expressed = expressGenotype(loci);
    builder.keyValues([
      ['Sex', pigeon.sex],
      ['Fenotip', describeGenotype(loci, 'ro')],
    ]);
    builder.table(
      [
        { label: 'Locus', width: 2.6 },
        { label: 'Alele', width: 1.6 },
        { label: 'Fenotip', width: 3 },
      ],
      LOCUS_IDS.map((id) => {
        const expression = expressed[id];
        return [
          LOCUS_TITLES[id].ro,
          (loci[id] ?? []).join(' / ') || UNKNOWN,
          expression ? describeLocus(expression, 'ro') : UNKNOWN,
        ];
      })
    );
  }

  return builder.finish();
}
