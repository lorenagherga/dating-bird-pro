import { jsPDF } from 'jspdf';

export interface PdfHeaderInfo {
  appName: string;
  breederName: string;
  contactLine: string | null;
  logoDataUrl: string | null;
}

export interface PdfFonts {
  regular: string;
  bold: string;
}

export interface PdfColumn {
  label: string;
  width: number;
}

type Rgb = [number, number, number];

const FONT_FAMILY = 'Roboto';
const MARGIN = 40;
const HEADER_HEIGHT = 96;
const FOOTER_HEIGHT = 36;
const LINE_HEIGHT = 14;
const ROW_HEIGHT = 20;
const LABEL_WIDTH = 150;
const BRAND: Rgb = [15, 42, 107];
const INK: Rgb = [13, 27, 62];
const MUTED: Rgb = [90, 107, 140];
const STRIPE: Rgb = [242, 245, 249];
const RULE: Rgb = [221, 228, 238];
const WHITE: Rgb = [255, 255, 255];

export function toPdfText(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '-';
  return String(value);
}

export function createPdfBuilder(header: PdfHeaderInfo, fonts: PdfFonts) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  doc.addFileToVFS('Roboto-Regular.ttf', fonts.regular);
  doc.addFont('Roboto-Regular.ttf', FONT_FAMILY, 'normal');
  doc.addFileToVFS('Roboto-Bold.ttf', fonts.bold);
  doc.addFont('Roboto-Bold.ttf', FONT_FAMILY, 'bold');

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - MARGIN * 2;
  const bodyTop = HEADER_HEIGHT + 16;
  const bodyBottom = pageHeight - FOOTER_HEIGHT;
  let y = bodyTop;

  const setStyle = (size: number, bold: boolean, color: Rgb) => {
    doc.setFont(FONT_FAMILY, bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    doc.setTextColor(color[0], color[1], color[2]);
  };

  const drawHeader = () => {
    const textX = MARGIN + 56;
    if (header.logoDataUrl) {
      doc.addImage(header.logoDataUrl, 'PNG', MARGIN, 24, 44, 44);
    }
    setStyle(16, true, INK);
    doc.text(toPdfText(header.appName), textX, 40);
    setStyle(11, false, MUTED);
    doc.text(toPdfText(header.breederName), textX, 58);
    if (header.contactLine) {
      setStyle(9, false, MUTED);
      doc.text(toPdfText(header.contactLine), textX, 72);
    }
    doc.setDrawColor(BRAND[0], BRAND[1], BRAND[2]);
    doc.setLineWidth(1.5);
    doc.line(MARGIN, HEADER_HEIGHT - 8, pageWidth - MARGIN, HEADER_HEIGHT - 8);
  };

  const newPage = () => {
    doc.addPage();
    drawHeader();
    y = bodyTop;
  };

  const ensureSpace = (needed: number) => {
    if (y + needed > bodyBottom) newPage();
  };

  const fit = (text: string, maxWidth: number) => {
    const full = toPdfText(text);
    if (doc.getTextWidth(full) <= maxWidth - 8) return full;
    let out = full;
    while (out.length > 0 && doc.getTextWidth(`${out}..`) > maxWidth - 8) out = out.slice(0, -1);
    return `${out}..`;
  };

  const writeLines = (lines: string[], x: number, size: number, bold: boolean, color: Rgb) => {
    setStyle(size, bold, color);
    for (const line of lines) {
      ensureSpace(LINE_HEIGHT);
      doc.text(line, x, y + 10);
      y += LINE_HEIGHT;
    }
  };

  drawHeader();

  return {
    title(text: string) {
      ensureSpace(40);
      setStyle(18, true, INK);
      doc.text(toPdfText(text), MARGIN, y + 16);
      y += 34;
    },

    section(text: string) {
      ensureSpace(40);
      y += 8;
      setStyle(12, true, BRAND);
      doc.text(toPdfText(text), MARGIN, y + 12);
      doc.setDrawColor(RULE[0], RULE[1], RULE[2]);
      doc.setLineWidth(0.8);
      doc.line(MARGIN, y + 18, MARGIN + contentWidth, y + 18);
      y += 28;
    },

    paragraph(text: string) {
      const lines = doc.splitTextToSize(toPdfText(text), contentWidth) as string[];
      writeLines(lines, MARGIN, 10, false, INK);
      y += 6;
    },

    keyValues(rows: [string, string | number | null | undefined][]) {
      const valueWidth = contentWidth - LABEL_WIDTH;
      for (const [label, value] of rows) {
        setStyle(9, false, MUTED);
        const valueLines = doc.splitTextToSize(toPdfText(value), valueWidth) as string[];
        ensureSpace(LINE_HEIGHT * valueLines.length);
        doc.text(toPdfText(label), MARGIN, y + 10);
        writeLines(valueLines, MARGIN + LABEL_WIDTH, 10, true, INK);
      }
      y += 6;
    },

    table(columns: PdfColumn[], rows: string[][]) {
      const total = columns.reduce((sum, column) => sum + column.width, 0);
      const widths = columns.map((column) => (column.width / total) * contentWidth);

      const drawHeaderRow = () => {
        doc.setFillColor(BRAND[0], BRAND[1], BRAND[2]);
        doc.rect(MARGIN, y, contentWidth, ROW_HEIGHT, 'F');
        setStyle(8.5, true, WHITE);
        let x = MARGIN + 6;
        columns.forEach((column, index) => {
          doc.text(fit(column.label, widths[index]), x, y + 13);
          x += widths[index];
        });
        y += ROW_HEIGHT;
      };

      ensureSpace(ROW_HEIGHT * 2);
      drawHeaderRow();
      rows.forEach((row, rowIndex) => {
        if (y + ROW_HEIGHT > bodyBottom) {
          newPage();
          drawHeaderRow();
        }
        if (rowIndex % 2 === 1) {
          doc.setFillColor(STRIPE[0], STRIPE[1], STRIPE[2]);
          doc.rect(MARGIN, y, contentWidth, ROW_HEIGHT, 'F');
        }
        setStyle(9, false, INK);
        let x = MARGIN + 6;
        row.forEach((cell, index) => {
          doc.text(fit(cell, widths[index]), x, y + 13);
          x += widths[index];
        });
        y += ROW_HEIGHT;
      });
      y += 10;
    },

    finish(): jsPDF {
      const pageCount = doc.getNumberOfPages();
      for (let page = 1; page <= pageCount; page++) {
        doc.setPage(page);
        setStyle(8, false, MUTED);
        doc.text(`${page} / ${pageCount}`, pageWidth - MARGIN, pageHeight - 20, { align: 'right' });
      }
      return doc;
    },
  };
}

export type PdfBuilder = ReturnType<typeof createPdfBuilder>;
