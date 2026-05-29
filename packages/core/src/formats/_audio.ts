// Shared helpers for audio format parsers.
//
// All five audio formats (MP3, FLAC, WAV, OGG, M4A) lean on the `music-metadata`
// library for parsing — it surfaces a unified `common` view (title/artist/album
// etc.) plus per-format `native` tag dictionaries (ID3v2.X, vorbis, RIFF INFO,
// iTunes ilst). This file centralizes the boilerplate that turns those into
// MetaScrub `groups` + sensitivity flagging.

import type { MetadataField } from '../types.js';

type MusicMetadataModule = typeof import('music-metadata');

let cached: MusicMetadataModule | null = null;

/**
 * Lazily load `music-metadata`. Cached after first call so repeated parses on
 * the same Node process pay the import cost once.
 */
export async function loadMusicMetadata(): Promise<MusicMetadataModule> {
  if (cached) return cached;
  const mod = (await import('music-metadata')) as unknown as {
    default?: MusicMetadataModule;
  } & MusicMetadataModule;
  cached = (mod.default ?? mod) as MusicMetadataModule;
  return cached;
}

/** Stringify a music-metadata value into our MetadataValue domain. */
export function audioStringify(v: unknown): string | number | boolean | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return v;
  if (v instanceof Date) return v.toISOString();
  if (v instanceof Uint8Array) return `<${v.length} bytes>`;
  if (Array.isArray(v)) {
    return v.map((x) => (x === null || x === undefined ? '' : String(x))).join(', ');
  }
  if (typeof v === 'object') {
    try {
      return JSON.stringify(v);
    } catch {
      return String(v);
    }
  }
  return String(v);
}

/**
 * Convert the `common` tag bag into MetadataField[]. Common is music-metadata's
 * normalized cross-format view (title/artist/album/year/genre/track/...).
 *
 * Personal-info keys are marked sensitive — they are the ones the
 * "personal-only" preset is expected to drop.
 */
const COMMON_SENSITIVE = new Set([
  'artist',
  'artists',
  'albumartist',
  'composer',
  'lyricist',
  'writer',
  'conductor',
  'producer',
  'copyright',
  'comment',
  'lyrics',
  'encoder',
  'encodedby',
  'encoded_by',
]);

export function commonToFields(common: Record<string, unknown>): MetadataField[] {
  const out: MetadataField[] = [];
  for (const [key, value] of Object.entries(common)) {
    if (value === undefined) continue;
    // Skip embedded picture binaries — they show up in common.picture; we surface
    // a presence flag instead of dumping bytes.
    if (key === 'picture') {
      if (Array.isArray(value) && value.length > 0) {
        out.push({
          key: 'picture',
          value: `${value.length} embedded image(s)`,
          sensitive: true,
        });
      }
      continue;
    }
    out.push({
      key,
      value: audioStringify(value),
      raw: value,
      sensitive: COMMON_SENSITIVE.has(key.toLowerCase()),
    });
  }
  return out;
}

/**
 * Sensitivity detection for raw native tag ids (ID3v2 frame ids, vorbis
 * comment keys, RIFF INFO chunk ids, iTunes atom names, ...).
 */
const NATIVE_SENSITIVE_PATTERNS = [
  /^TPE/i, // ID3 artist roles
  /^TCOM/i, // ID3 composer
  /^TENC/i, // ID3 encoded-by
  /^TCOP/i, // ID3 copyright
  /^COMM/i, // ID3 comment
  /^USLT/i, // ID3 lyrics
  /^TOPE/i, // ID3 original artist
  /^TXXX/i, // ID3 user-defined text
  /^WXXX/i, // ID3 user-defined URL
  /^PRIV/i, // ID3 private frame
  /^GEOB/i, // ID3 general encapsulated object
  /^APIC/i, // ID3 attached picture
  /^ARTIST$/i, // vorbis
  /^ALBUMARTIST$/i,
  /^COMPOSER$/i,
  /^COMMENT$/i,
  /^COPYRIGHT$/i,
  /^ENCODER$/i,
  /^ENCODED_BY$/i,
  /^LYRICS$/i,
  /^METADATA_BLOCK_PICTURE$/i, // vorbis cover art
  /^IART$/i, // RIFF artist
  /^ICRD$/i, // RIFF date
  /^ICMT$/i, // RIFF comment
  /^ICOP$/i, // RIFF copyright
  /^ISFT$/i, // RIFF software
];

export function isNativeSensitive(id: string): boolean {
  return NATIVE_SENSITIVE_PATTERNS.some((re) => re.test(id));
}

export function nativeToFields(tags: Array<{ id: string; value: unknown }>): MetadataField[] {
  const out: MetadataField[] = [];
  for (const tag of tags) {
    if (!tag || typeof tag.id !== 'string') continue;
    out.push({
      key: tag.id,
      value: audioStringify(tag.value),
      raw: tag.value,
      sensitive: isNativeSensitive(tag.id),
    });
  }
  return out;
}

/**
 * Best-effort parse via music-metadata. Returns an empty result on any
 * exception so the format parsers can still surface format-specific groups
 * (e.g. RIFF INFO chunks we extract manually).
 */
export async function parseWithMusicMetadata(bytes: Uint8Array, mimeType?: string) {
  try {
    const mm = await loadMusicMetadata();
    return await mm.parseBuffer(bytes, mimeType ? { mimeType } : undefined, {
      duration: false,
      skipCovers: true,
    });
  } catch {
    return null;
  }
}
