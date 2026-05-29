import type { FormatParser, FileFormat } from '../types.js';
import { jpegParser } from './jpeg.js';
import { pngParser } from './png.js';
import { pdfParser } from './pdf.js';
import { docxParser } from './docx.js';
import { xlsxParser } from './xlsx.js';
import { pptxParser } from './pptx.js';
import { epubParser } from './epub.js';
import { svgParser } from './svg.js';

export const REGISTRY: ReadonlyMap<FileFormat, FormatParser> = new Map<FileFormat, FormatParser>([
  [jpegParser.format, jpegParser],
  [pngParser.format, pngParser],
  [pdfParser.format, pdfParser],
  [docxParser.format, docxParser],
  [xlsxParser.format, xlsxParser],
  [pptxParser.format, pptxParser],
  [epubParser.format, epubParser],
  [svgParser.format, svgParser],
]);

export function getParser(format: FileFormat): FormatParser | undefined {
  return REGISTRY.get(format);
}

export function listFormats(): FileFormat[] {
  return Array.from(REGISTRY.keys());
}
