import type { FormatParser, FileFormat } from '../types.js';
import { jpegParser } from './jpeg.js';
import { pngParser } from './png.js';
import { pdfParser } from './pdf.js';
import { docxParser } from './docx.js';
import { xlsxParser } from './xlsx.js';
import { pptxParser } from './pptx.js';
import { epubParser } from './epub.js';
import { svgParser } from './svg.js';
import { webpParser } from './webp.js';
import { tiffParser } from './tiff.js';
import { heicParser } from './heic.js';
import { avifParser } from './avif.js';
import { rawCr2Parser, rawNefParser, rawArwParser, rawDngParser } from './raw.js';
import { mp3Parser } from './mp3.js';
import { flacParser } from './flac.js';
import { wavParser } from './wav.js';
import { oggParser } from './ogg.js';
import { m4aParser } from './m4a.js';
import { mp4Parser } from './mp4.js';
import { movParser } from './mov.js';
import { mkvParser } from './mkv.js';
import { webmParser } from './webm.js';

export const REGISTRY: ReadonlyMap<FileFormat, FormatParser> = new Map<FileFormat, FormatParser>([
  [jpegParser.format, jpegParser],
  [pngParser.format, pngParser],
  [pdfParser.format, pdfParser],
  [docxParser.format, docxParser],
  [xlsxParser.format, xlsxParser],
  [pptxParser.format, pptxParser],
  [epubParser.format, epubParser],
  [svgParser.format, svgParser],
  [webpParser.format, webpParser],
  [tiffParser.format, tiffParser],
  [heicParser.format, heicParser],
  [avifParser.format, avifParser],
  [rawCr2Parser.format, rawCr2Parser],
  [rawNefParser.format, rawNefParser],
  [rawArwParser.format, rawArwParser],
  [rawDngParser.format, rawDngParser],
  [mp3Parser.format, mp3Parser],
  [flacParser.format, flacParser],
  [wavParser.format, wavParser],
  [oggParser.format, oggParser],
  [m4aParser.format, m4aParser],
  [mp4Parser.format, mp4Parser],
  [movParser.format, movParser],
  [mkvParser.format, mkvParser],
  [webmParser.format, webmParser],
]);

export function getParser(format: FileFormat): FormatParser | undefined {
  return REGISTRY.get(format);
}

export function listFormats(): FileFormat[] {
  return Array.from(REGISTRY.keys());
}
