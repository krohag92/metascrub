import { startsWith, byteEquals } from './bytes.js';
import type { FileFormat } from '../types.js';

type MagicTest = {
  format: FileFormat;
  test: (b: Uint8Array) => boolean;
};

const SIGNATURES: MagicTest[] = [
  { format: 'jpeg', test: (b) => startsWith(b, [0xff, 0xd8, 0xff]) },
  {
    format: 'png',
    test: (b) => startsWith(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  },
  { format: 'pdf', test: (b) => startsWith(b, [0x25, 0x50, 0x44, 0x46]) }, // %PDF
  {
    // ZIP container — used by DOCX/XLSX/PPTX/EPUB. We disambiguate later.
    format: 'docx',
    test: (b) =>
      startsWith(b, [0x50, 0x4b, 0x03, 0x04]) ||
      startsWith(b, [0x50, 0x4b, 0x05, 0x06]) ||
      startsWith(b, [0x50, 0x4b, 0x07, 0x08]),
  },
];

export function detectByMagic(bytes: Uint8Array): FileFormat | null {
  for (const sig of SIGNATURES) {
    if (sig.test(bytes)) return sig.format;
  }
  // RIFF (WebP, WAV, AVI) — needs subtype check at offset 8.
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && bytes.length >= 12) {
    if (byteEquals(bytes, 8, [0x57, 0x45, 0x42, 0x50])) return 'webp';
    if (byteEquals(bytes, 8, [0x57, 0x41, 0x56, 0x45])) return 'wav';
  }
  return null;
}

export function detectByExtension(filename?: string): FileFormat | null {
  if (!filename) return null;
  const lower = filename.toLowerCase();
  const dot = lower.lastIndexOf('.');
  if (dot < 0) return null;
  const ext = lower.slice(dot);
  const map: Record<string, FileFormat> = {
    '.jpg': 'jpeg',
    '.jpeg': 'jpeg',
    '.png': 'png',
    '.pdf': 'pdf',
    '.docx': 'docx',
    '.xlsx': 'xlsx',
    '.pptx': 'pptx',
    '.epub': 'epub',
    '.svg': 'svg',
    '.heic': 'heic',
    '.heif': 'heic',
    '.webp': 'webp',
    '.avif': 'avif',
    '.tif': 'tiff',
    '.tiff': 'tiff',
    '.cr2': 'raw-cr2',
    '.nef': 'raw-nef',
    '.arw': 'raw-arw',
    '.dng': 'raw-dng',
    '.mp4': 'mp4',
    '.m4v': 'mp4',
    '.mov': 'mov',
    '.mkv': 'mkv',
    '.webm': 'webm',
    '.mp3': 'mp3',
    '.flac': 'flac',
    '.m4a': 'm4a',
    '.ogg': 'ogg',
    '.oga': 'ogg',
    '.wav': 'wav',
  };
  return map[ext] ?? null;
}
