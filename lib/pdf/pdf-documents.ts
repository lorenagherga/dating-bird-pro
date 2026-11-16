import type { jsPDF } from 'jspdf';
import {
  buildFlightsPdf,
  buildPairingsPdf,
  buildReportsPdf,
  buildResultsPdf,
  buildTreatmentsPdf,
} from '@/lib/pdf/pdf-activity-documents';
import { buildGeneticsPdf, buildPalmaresPdf, buildPedigreePdf, buildPigeonSheetsPdf } from '@/lib/pdf/pdf-pigeon-documents';

export type PdfDocumentKind =
  | 'pigeonSheets'
  | 'palmares'
  | 'pedigree'
  | 'genetics'
  | 'results'
  | 'flights'
  | 'treatments'
  | 'pairings'
  | 'reports';

const PDF_DOCUMENTS: Record<PdfDocumentKind, { fileName: string; build: (userId: string) => Promise<jsPDF> }> = {
  pigeonSheets: { fileName: 'fise-porumbei.pdf', build: buildPigeonSheetsPdf },
  palmares: { fileName: 'palmares.pdf', build: buildPalmaresPdf },
  pedigree: { fileName: 'pedigree.pdf', build: buildPedigreePdf },
  genetics: { fileName: 'genetica.pdf', build: buildGeneticsPdf },
  results: { fileName: 'rezultate.pdf', build: buildResultsPdf },
  flights: { fileName: 'zboruri.pdf', build: buildFlightsPdf },
  treatments: { fileName: 'tratamente.pdf', build: buildTreatmentsPdf },
  pairings: { fileName: 'imperecheri.pdf', build: buildPairingsPdf },
  reports: { fileName: 'rapoarte.pdf', build: buildReportsPdf },
};

export async function buildPdfDocument(kind: PdfDocumentKind, userId: string): Promise<{ doc: jsPDF; fileName: string }> {
  const { fileName, build } = PDF_DOCUMENTS[kind];
  return { doc: await build(userId), fileName };
}
