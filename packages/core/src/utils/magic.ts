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

/**
 * Disambiguate a ZIP-based container (DOCX/XLSX/PPTX/EPUB) by sniffing the
 * first few KB for telltale paths. EPUB requires `mimetype` as the very first
 * entry with content `application/epub+zip`; XLSX/PPTX/DOCX expose top-level
 * folders `xl/`, `ppt/`, `word/` in their central directory or local headers.
 *
 * Returns null if the ZIP can't be classified from this window — callers
 * should then fall back to the extension or default to docx.
 */
export function detectZipSubtype(bytes: Uint8Array): FileFormat | null {
  if (bytes.length < 30) return null;
  // Read the window as latin1 — the ZIP local file headers (filenames) and any
  // STORE-compressed content (EPUB mimetype) are plain-text in the byte stream.
  // DEFLATE-compressed file contents won't be readable, but their filenames
  // sit in the LFH right before the deflated payload.
  const text = new TextDecoder('latin1').decode(bytes.subarray(0, Math.min(bytes.length, 8192)));
  // EPUB: `mimetype` is the first entry, stored uncompressed; its content
  // `application/epub+zip` appears verbatim around byte ~38.
  if (text.includes('application/epub+zip')) return 'epub';
  // OOXML — match the top-level folder/file paths that appear in local file
  // headers. The schema MIME types live in the (DEFLATE-compressed) Content
  // Types part, so we can't rely on them.
  if (text.includes('xl/workbook.xml') || text.includes('xl/_rels')) return 'xlsx';
  if (text.includes('ppt/presentation.xml') || text.includes('ppt/slides')) return 'pptx';
  if (text.includes('word/document.xml') || text.includes('word/_rels')) return 'docx';
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
