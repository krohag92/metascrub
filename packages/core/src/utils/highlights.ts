import type { MetadataField, MetadataHighlights, MetadataResult } from '../types.js';

type Groups = Record<string, MetadataField[]>;

function findField(groups: Groups, group: string, key: string): MetadataField | undefined {
  const fields = groups[group];
  if (!fields) return undefined;
  return fields.find((f) => f.key === key);
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const n = Number.parseFloat(value);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function toString(value: unknown): string | undefined {
  if (typeof value === 'string') return value.trim() || undefined;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return undefined;
}

const EDITOR_SOFTWARE = [
  /adobe/i,
  /photoshop/i,
  /lightroom/i,
  /illustrator/i,
  /acrobat/i,
  /microsoft word/i,
  /libreoffice/i,
  /openoffice/i,
  /word/i,
  /pages/i,
  /quartzpdfcontext/i,
];

export function buildHighlights(groups: Groups): {
  highlights: MetadataHighlights;
  warnings: string[];
} {
  const highlights: MetadataHighlights = {};
  const warnings: string[] = [];

  // GPS
  const lat =
    toNumber(findField(groups, 'GPS', 'latitude')?.value) ??
    toNumber(findField(groups, 'GPS', 'Latitude')?.value) ??
    toNumber(findField(groups, 'EXIF', 'GPSLatitude')?.value);
  const lon =
    toNumber(findField(groups, 'GPS', 'longitude')?.value) ??
    toNumber(findField(groups, 'GPS', 'Longitude')?.value) ??
    toNumber(findField(groups, 'EXIF', 'GPSLongitude')?.value);
  const alt =
    toNumber(findField(groups, 'GPS', 'altitude')?.value) ??
    toNumber(findField(groups, 'GPS', 'Altitude')?.value) ??
    toNumber(findField(groups, 'EXIF', 'GPSAltitude')?.value);
  if (lat !== undefined && lon !== undefined) {
    highlights.gps = { lat, lon, ...(alt !== undefined ? { alt } : {}) };
    warnings.push(`GPS coordinates found (${lat.toFixed(4)}, ${lon.toFixed(4)})`);
  }

  // Captured timestamp
  const captured =
    toString(findField(groups, 'EXIF', 'DateTimeOriginal')?.value) ??
    toString(findField(groups, 'EXIF', 'CreateDate')?.value) ??
    toString(findField(groups, 'EXIF', 'DateTime')?.value);
  if (captured) highlights.capturedAt = captured;

  // Device
  const make = toString(findField(groups, 'EXIF', 'Make')?.value);
  const model = toString(findField(groups, 'EXIF', 'Model')?.value);
  const serial =
    toString(findField(groups, 'EXIF', 'SerialNumber')?.value) ??
    toString(findField(groups, 'EXIF', 'BodySerialNumber')?.value);
  if (make || model || serial) {
    highlights.device = {
      ...(make ? { make } : {}),
      ...(model ? { model } : {}),
      ...(serial ? { serial } : {}),
    };
    if (serial) warnings.push(`Camera serial number found (${serial})`);
  }

  // Software
  const software =
    toString(findField(groups, 'EXIF', 'Software')?.value) ??
    toString(findField(groups, 'PDF.Info', 'Producer')?.value) ??
    toString(findField(groups, 'PDF.Info', 'Creator')?.value) ??
    toString(findField(groups, 'DOCX.app', 'Application')?.value) ??
    toString(findField(groups, 'XLSX.app', 'Application')?.value) ??
    toString(findField(groups, 'PPTX.app', 'Application')?.value) ??
    toString(findField(groups, 'SVG.metadata', 'editor')?.value) ??
    toString(findField(groups, 'PNG.text', 'Software')?.value);
  if (software) {
    highlights.software = software;
    if (EDITOR_SOFTWARE.some((re) => re.test(software))) {
      warnings.push(`Edited in ${software}`);
    }
  }

  // Author / creator
  const author =
    toString(findField(groups, 'EXIF', 'Artist')?.value) ??
    toString(findField(groups, 'XMP', 'creator')?.value) ??
    toString(findField(groups, 'PDF.Info', 'Author')?.value) ??
    toString(findField(groups, 'DOCX.core', 'creator')?.value) ??
    toString(findField(groups, 'XLSX.core', 'creator')?.value) ??
    toString(findField(groups, 'PPTX.core', 'creator')?.value) ??
    toString(findField(groups, 'EPUB.meta', 'creator')?.value) ??
    toString(findField(groups, 'SVG.metadata', 'creator')?.value) ??
    toString(findField(groups, 'IPTC', 'By-line')?.value) ??
    toString(findField(groups, 'PNG.text', 'Author')?.value) ??
    toString(findField(groups, 'PNG.text', 'Artist')?.value);
  if (author) {
    highlights.author = author;
    warnings.push(`Author/creator found (${author})`);
  }

  // Last modified by
  const lastModifiedBy =
    toString(findField(groups, 'DOCX.core', 'lastModifiedBy')?.value) ??
    toString(findField(groups, 'XLSX.core', 'lastModifiedBy')?.value) ??
    toString(findField(groups, 'PPTX.core', 'lastModifiedBy')?.value);
  if (lastModifiedBy) {
    highlights.lastModifiedBy = lastModifiedBy;
    if (highlights.author && lastModifiedBy.toLowerCase() !== highlights.author.toLowerCase()) {
      warnings.push(`File was edited by another user (${lastModifiedBy})`);
    }
  }

  // Revision history (DOCX revision count)
  const revisions = toNumber(findField(groups, 'DOCX.app', 'Revision')?.value);
  if (revisions !== undefined && revisions > 0) {
    highlights.revisionHistory = revisions;
    if (revisions > 1) {
      warnings.push(`Revision count ${revisions} (file edited multiple times)`);
    }
  }

  return { highlights, warnings };
}

export function finalizeResult(
  partial: Omit<MetadataResult, 'highlights' | 'warnings'>,
): MetadataResult {
  const { highlights, warnings } = buildHighlights(partial.groups);
  return { ...partial, highlights, warnings };
}
