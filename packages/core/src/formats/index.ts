import type { FormatParser, FileFormat } from '../types.js';
import { jpegParser } from './jpeg.js';
import { pngParser } from './png.js';
import { pdfParser } from './pdf.js';
import { docxParser } from './docx.js';

export const REGISTRY: ReadonlyMap<FileFormat, FormatParser> = new Map<FileFormat, FormatParser>([
  [jpegParser.format, jpegParser],
  [pngParser.format, pngParser],
  [pdfParser.format, pdfParser],
  [docxParser.format, docxParser],
]);

export function getParser(format: FileFormat): FormatParser | undefined {
  return REGISTRY.get(format);
}

export function listFormats(): FileFormat[] {
  return Array.from(REGISTRY.keys());
}
