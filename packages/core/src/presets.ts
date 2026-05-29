import type { ScrubOptions, ScrubPreset } from './types.js';

export type ResolvedScrub = {
  preset: ScrubPreset;
  keep: string[];
  remove: string[];
};

export const PRESET_DESCRIPTIONS: Record<ScrubPreset, string> = {
  all: 'Remove every metadata field that is safe to strip.',
  'gps-only': 'Remove GPS coordinates only; keep everything else.',
  'personal-only': 'Remove author/owner/software/serial/edit-history fields.',
  'keep-technical': 'Keep camera/exposure/dimensions; drop everything else.',
  custom: 'Use the keep/remove lists provided in ScrubOptions.',
};

export const PRESET_REMOVALS: Record<
  Exclude<ScrubPreset, 'all' | 'custom' | 'keep-technical'>,
  string[]
> = {
  'gps-only': [
    'GPS.*',
    'EXIF.GPS*',
    'EXIF.GPSLatitude',
    'EXIF.GPSLongitude',
    'EXIF.GPSAltitude',
    'EXIF.GPSLatitudeRef',
    'EXIF.GPSLongitudeRef',
    'EXIF.GPSAltitudeRef',
    'EXIF.GPSTimeStamp',
    'EXIF.GPSDateStamp',
    'XMP.geo*',
  ],
  'personal-only': [
    'EXIF.Artist',
    'EXIF.Copyright',
    'EXIF.OwnerName',
    'EXIF.SerialNumber',
    'EXIF.BodySerialNumber',
    'EXIF.LensSerialNumber',
    'EXIF.Software',
    'EXIF.HostComputer',
    'IPTC.By-line',
    'IPTC.Credit',
    'XMP.creator',
    'XMP.rights',
    'PDF.Info.Author',
    'PDF.Info.Producer',
    'PDF.Info.Creator',
    'DOCX.core.creator',
    'DOCX.core.lastModifiedBy',
    'DOCX.app.Company',
    'DOCX.app.Manager',
  ],
};

export const KEEP_TECHNICAL: string[] = [
  'EXIF.Make',
  'EXIF.Model',
  'EXIF.LensModel',
  'EXIF.ExposureTime',
  'EXIF.FNumber',
  'EXIF.ISO',
  'EXIF.ISOSpeedRatings',
  'EXIF.FocalLength',
  'EXIF.FocalLengthIn35mmFormat',
  'EXIF.ColorSpace',
  'EXIF.PixelXDimension',
  'EXIF.PixelYDimension',
  'EXIF.Orientation',
  'EXIF.ExifImageWidth',
  'EXIF.ExifImageHeight',
];

export function resolveScrub(options: ScrubOptions = {}): ResolvedScrub {
  const preset = options.preset ?? 'all';
  const keep = options.keep ? [...options.keep] : [];
  const remove = options.remove ? [...options.remove] : [];

  if (preset === 'gps-only' || preset === 'personal-only') {
    remove.push(...PRESET_REMOVALS[preset]);
  } else if (preset === 'keep-technical') {
    keep.push(...KEEP_TECHNICAL);
  }
  // 'all' and 'custom' are handled inside each parser's scrub() — 'all' means
  // strip the entire metadata segment, 'custom' uses keep/remove only.

  return { preset, keep, remove };
}

/** Returns true if `path` matches any pattern. Supports trailing-* glob and exact match. */
export function pathMatches(path: string, patterns: string[]): boolean {
  for (const pattern of patterns) {
    if (pattern === path) return true;
    if (pattern.endsWith('*')) {
      const prefix = pattern.slice(0, -1);
      if (path.startsWith(prefix)) return true;
    }
    if (pattern.endsWith('.*')) {
      const prefix = pattern.slice(0, -1);
      if (path.startsWith(prefix)) return true;
    }
  }
  return false;
}
