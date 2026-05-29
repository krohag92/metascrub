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
  // MP3 with ID3v2 prefix
  { format: 'mp3', test: (b) => startsWith(b, [0x49, 0x44, 0x33]) },
  // MP3 raw MPEG frame syncs (no ID3 header)
  {
    format: 'mp3',
    test: (b) =>
      startsWith(b, [0xff, 0xfb]) ||
      startsWith(b, [0xff, 0xfa]) ||
      startsWith(b, [0xff, 0xf3]) ||
      startsWith(b, [0xff, 0xf2]) ||
      startsWith(b, [0xff, 0xe3]),
  },
  { format: 'flac', test: (b) => startsWith(b, [0x66, 0x4c, 0x61, 0x43]) }, // "fLaC"
  { format: 'ogg', test: (b) => startsWith(b, [0x4f, 0x67, 0x67, 0x53]) }, // "OggS"
  {
    // ZIP container — used by DOCX/XLSX/PPTX/EPUB. We disambiguate later.
    format: 'docx',
    test: (b) =>
      startsWith(b, [0x50, 0x4b, 0x03, 0x04]) ||
      startsWith(b, [0x50, 0x4b, 0x05, 0x06]) ||
      startsWith(b, [0x50, 0x4b, 0x07, 0x08]),
  },
];

/** TIFF magic: II*\0 (little-endian) or MM\0* (big-endian). */
function isTiff(b: Uint8Array): boolean {
  return startsWith(b, [0x49, 0x49, 0x2a, 0x00]) || startsWith(b, [0x4d, 0x4d, 0x00, 0x2a]);
}

/** CR2 (Canon RAW) is TIFF with "CR" marker at offsets 8..9 and version byte 2 at offset 10. */
function isCr2(b: Uint8Array): boolean {
  if (!isTiff(b)) return false;
  if (b.length < 11) return false;
  return b[8] === 0x43 && b[9] === 0x52 && b[10] === 0x02;
}

// HEIC/AVIF brand sets — overlap on `mif1`/`msf1` (generic image brands), so we
// scan the compatible-brands list to disambiguate before falling back to major.
const HEIC_BRANDS = new Set(['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'mif1', 'msf1']);
const AVIF_BRANDS = new Set(['avif', 'avis']);

// M4A / MP4 / MOV brand sets.
const M4A_BRANDS = new Set(['M4A ', 'M4B ', 'M4P ']);
const MP4_BRANDS = new Set([
  'mp41',
  'mp42',
  'isom',
  'iso2',
  'iso3',
  'iso4',
  'iso5',
  'iso6',
  'iso7',
  'iso8',
  'iso9',
  'MSNV',
  'dash',
  'avc1',
  'mp71',
  'M4V ',
  'M4VH',
  'M4VP',
  'f4v ',
  '3gp4',
  '3gp5',
  '3gp6',
  '3gp7',
  '3gp8',
  '3gp9',
  '3g2a',
]);

function fourCC(b: Uint8Array, off: number): string {
  return String.fromCharCode(b[off] ?? 0, b[off + 1] ?? 0, b[off + 2] ?? 0, b[off + 3] ?? 0);
}

/** Reads the major brand from an ISOBMFF ftyp box, if present. */
function ftypMajorBrand(b: Uint8Array): string | null {
  if (b.length < 12) return null;
  if (!byteEquals(b, 4, [0x66, 0x74, 0x79, 0x70])) return null; // 'ftyp'
  return fourCC(b, 8);
}

/** Detect ISOBMFF subtype by inspecting major + compatible brands. */
function detectIsobmff(bytes: Uint8Array): FileFormat | null {
  const major = ftypMajorBrand(bytes);
  if (!major) return null;
  // Scan compatible-brands list (offset 16..ftyp-end) first. AVIF often uses
  // major brand 'mif1' (which also matches HEIC) but declares 'avif' compat.
  const compatEnd = Math.min(bytes.length, 64);
  for (let off = 16; off + 4 <= compatEnd; off += 4) {
    const compat = fourCC(bytes, off);
    if (AVIF_BRANDS.has(compat)) return 'avif';
    if (HEIC_BRANDS.has(compat) && compat !== 'mif1' && compat !== 'msf1') return 'heic';
    if (M4A_BRANDS.has(compat)) return 'm4a';
  }
  // Fall back to major brand.
  if (AVIF_BRANDS.has(major)) return 'avif';
  if (HEIC_BRANDS.has(major)) return 'heic';
  if (M4A_BRANDS.has(major)) return 'm4a';
  if (major === 'qt  ') return 'mov';
  if (MP4_BRANDS.has(major)) return 'mp4';
  return null;
}

/** Old QuickTime files have no `ftyp` and start directly with moov/mdat/wide. */
function looksLikeQuickTimeNoFtyp(b: Uint8Array): boolean {
  if (b.length < 8) return false;
  if (b[0] !== 0 && b[1] !== 0 && b[2] !== 0) return false;
  const t = fourCC(b, 4);
  return t === 'moov' || t === 'mdat' || t === 'wide' || t === 'free' || t === 'skip';
}

export function detectByMagic(bytes: Uint8Array): FileFormat | null {
  for (const sig of SIGNATURES) {
    if (sig.test(bytes)) return sig.format;
  }
  // RIFF (WebP, WAV, AVI) — needs subtype check at offset 8.
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && bytes.length >= 12) {
    if (byteEquals(bytes, 8, [0x57, 0x45, 0x42, 0x50])) return 'webp';
    if (byteEquals(bytes, 8, [0x57, 0x41, 0x56, 0x45])) return 'wav';
  }
  // EBML magic — Matroska / WebM. detectFormat() differentiates via DocType.
  if (startsWith(bytes, [0x1a, 0x45, 0xdf, 0xa3])) return 'mkv';
  // ISOBMFF — HEIC/AVIF/M4A/MP4/MOV via ftyp brand sniffing.
  const iso = detectIsobmff(bytes);
  if (iso) return iso;
  if (looksLikeQuickTimeNoFtyp(bytes)) return 'mov';
  // CR2 (TIFF + 'CR' marker) before generic TIFF.
  if (isCr2(bytes)) return 'raw-cr2';
  // Generic TIFF (also matches NEF/ARW/DNG; disambiguate by extension).
  if (isTiff(bytes)) return 'tiff';
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
    '.m4b': 'm4a',
    '.m4p': 'm4a',
    '.ogg': 'ogg',
    '.oga': 'ogg',
    '.opus': 'ogg',
    '.wav': 'wav',
  };
  return map[ext] ?? null;
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
