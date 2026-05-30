import type { FileFormat, MetadataField } from '@metascrub/core';

// ---------------------------------------------------------------------------
// File-size formatter
// ---------------------------------------------------------------------------

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(2)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

// ---------------------------------------------------------------------------
// Format → icon emoji mapping (used in the file list)
// ---------------------------------------------------------------------------

const FORMAT_ICONS: Record<FileFormat, string> = {
  jpeg: 'JPG',
  png: 'PNG',
  heic: 'HEIC',
  webp: 'WEBP',
  avif: 'AVIF',
  tiff: 'TIFF',
  'raw-cr2': 'CR2',
  'raw-nef': 'NEF',
  'raw-arw': 'ARW',
  'raw-dng': 'DNG',
  mp4: 'MP4',
  mov: 'MOV',
  mkv: 'MKV',
  webm: 'WEBM',
  mp3: 'MP3',
  flac: 'FLAC',
  m4a: 'M4A',
  ogg: 'OGG',
  wav: 'WAV',
  pdf: 'PDF',
  docx: 'DOCX',
  xlsx: 'XLSX',
  pptx: 'PPTX',
  epub: 'EPUB',
  svg: 'SVG',
};

export function formatIcon(format: FileFormat): string {
  return FORMAT_ICONS[format] ?? '???';
}

// ---------------------------------------------------------------------------
// "What was removed" diff helper
// Returns a human-readable list of removed/changed field labels.
// ---------------------------------------------------------------------------

export interface RemovedDiff {
  removedCount: number;
  removedLabels: string[];
}

export function buildRemovedDiff(
  before: Record<string, MetadataField[]>,
  after: Record<string, MetadataField[]>,
): RemovedDiff {
  const beforeKeys = new Map<string, MetadataField>();
  for (const fields of Object.values(before)) {
    for (const f of fields) {
      beforeKeys.set(f.key, f);
    }
  }

  const afterKeys = new Set<string>();
  for (const fields of Object.values(after)) {
    for (const f of fields) {
      afterKeys.add(f.key);
    }
  }

  const removedLabels: string[] = [];
  for (const [key, field] of beforeKeys) {
    if (!afterKeys.has(key)) {
      removedLabels.push(field.label ?? key);
    }
  }

  return { removedCount: removedLabels.length, removedLabels };
}

// ---------------------------------------------------------------------------
// Extension → MIME type helper
// ---------------------------------------------------------------------------

export function extToMime(ext: string): string {
  const map: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    heic: 'image/heic',
    webp: 'image/webp',
    avif: 'image/avif',
    tiff: 'image/tiff',
    tif: 'image/tiff',
    mp4: 'video/mp4',
    mov: 'video/quicktime',
    mkv: 'video/x-matroska',
    webm: 'video/webm',
    mp3: 'audio/mpeg',
    flac: 'audio/flac',
    m4a: 'audio/mp4',
    ogg: 'audio/ogg',
    wav: 'audio/wav',
    pdf: 'application/pdf',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    epub: 'application/epub+zip',
    svg: 'image/svg+xml',
  };
  return map[ext.toLowerCase()] ?? 'application/octet-stream';
}
