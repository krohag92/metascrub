// MP4 (ISOBMFF) metadata parser + scrubber.
//
// Apple-style metadata path: moov > udta > meta > ilst > <©nam|©ART|©day|...>
// QuickTime location: moov > udta > ©xyz (text payload like "+37.77-122.41/").
//
// Parse: walk boxes with the small ISOBMFF helper in `_isobmff.ts`. We don't
// pull in mp4box's full demuxer — we only need the metadata atoms.
//
// Scrub: rebuild `moov` with the `udta` child replaced by a `free` box of
// identical size, so `stco`/`co64` mdat offsets remain valid. See
// `scrubMoovUdta` in `_isobmff.ts` for the rationale.

import type { FormatParser, MetadataField, ScrubOptions } from '../types.js';
import { latin1Decoder } from '../utils/bytes.js';
import {
  readBoxes,
  findChild,
  readMetaChildren,
  readIlstItems,
  decodeUdtaText,
  scrubMoovUdta,
  readFtypBrand,
  type Box,
} from './_isobmff.js';

// Map Apple FOURCC item types to friendly keys.
const ILST_KEYS: Record<string, string> = {
  '©nam': 'Title',
  '©ART': 'Artist',
  '©alb': 'Album',
  '©day': 'Year',
  '©cmt': 'Comment',
  '©gen': 'Genre',
  '©too': 'EncodingTool',
  '©wrt': 'Composer',
  '©enc': 'EncodedBy',
  '©des': 'Description',
  '©aut': 'Author',
  '©swr': 'Software',
  '©mak': 'Make',
  '©mod': 'Model',
  '©xyz': 'Location',
  desc: 'Description',
  cprt: 'Copyright',
  aART: 'AlbumArtist',
  trkn: 'TrackNumber',
};

const SENSITIVE_KEYS = new Set([
  'Artist',
  'Author',
  'Copyright',
  'EncodingTool',
  'Software',
  'Location',
  'Make',
  'Model',
]);

function friendlyKey(rawKey: string): string {
  return ILST_KEYS[rawKey] ?? rawKey;
}

/** Parse "+37.7749-122.4194/" or "+37.7749-122.4194+10.5/" into lat/lon/alt. */
function parseIso6709(text: string): { lat: number; lon: number; alt?: number } | null {
  // Strip trailing slash.
  const t = text.replace(/\/$/, '');
  // Match groups: sign+digits for lat, lon, optional alt.
  const m = /^([+-]\d+(?:\.\d+)?)([+-]\d+(?:\.\d+)?)(?:([+-]\d+(?:\.\d+)?))?$/.exec(t);
  if (!m) return null;
  const lat = Number.parseFloat(m[1]!);
  const lon = Number.parseFloat(m[2]!);
  const result: { lat: number; lon: number; alt?: number } = { lat, lon };
  if (m[3] !== undefined) result.alt = Number.parseFloat(m[3]);
  return result;
}

function findMoov(bytes: Uint8Array): Box | undefined {
  const top = readBoxes(bytes, 0, bytes.length);
  return top.find((b) => b.type === 'moov');
}

function findUdta(bytes: Uint8Array, moov: Box): Box | undefined {
  return findChild(bytes, moov, 'udta');
}

export async function parseMp4Bytes(
  bytes: Uint8Array,
): Promise<{ groups: Record<string, MetadataField[]> }> {
  const groups: Record<string, MetadataField[]> = {};
  const moov = findMoov(bytes);
  if (!moov) return { groups };
  const udta = findUdta(bytes, moov);
  if (!udta) return { groups };

  const ilstItems: MetadataField[] = [];
  // Check for Apple-style meta > ilst first.
  const meta = findChild(bytes, udta, 'meta');
  if (meta) {
    const metaChildren = readMetaChildren(bytes, meta);
    const ilst = metaChildren.find((b) => b.type === 'ilst');
    if (ilst) {
      const items = readIlstItems(bytes, ilst);
      for (const { key, value } of items) {
        const label = friendlyKey(key);
        ilstItems.push({
          key: label,
          value,
          sensitive: SENSITIVE_KEYS.has(label),
        });
      }
    }
  }

  // Direct udta children: ©xyz (location), ©nam/©ART (QT older layout), etc.
  const udtaChildren = readBoxes(bytes, udta.payloadStart, udta.end);
  for (const child of udtaChildren) {
    if (child.type === 'meta') continue;
    if (child.type.charCodeAt(0) === 0xa9 || child.type === 'cprt') {
      const text = decodeUdtaText(bytes, child);
      if (text === null) continue;
      const label = friendlyKey(child.type);
      // Avoid double-add if ilst already produced this.
      if (ilstItems.some((f) => f.key === label)) continue;
      ilstItems.push({
        key: label,
        value: text,
        sensitive: SENSITIVE_KEYS.has(label),
      });
    }
  }

  if (ilstItems.length) groups['MP4.tags'] = ilstItems;

  // Surface GPS if ©xyz parses cleanly.
  const locField = ilstItems.find((f) => f.key === 'Location');
  if (locField && typeof locField.value === 'string') {
    const coord = parseIso6709(locField.value);
    if (coord) {
      const gpsFields: MetadataField[] = [
        { key: 'Latitude', value: coord.lat, sensitive: true },
        { key: 'Longitude', value: coord.lon, sensitive: true },
      ];
      if (coord.alt !== undefined) {
        gpsFields.push({ key: 'Altitude', value: coord.alt, sensitive: true });
      }
      groups.GPS = gpsFields;
    }
  }

  return { groups };
}

async function scrubMp4Bytes(bytes: Uint8Array, _options: ScrubOptions): Promise<Uint8Array> {
  // For v0.1 we scrub the entire udta unconditionally on `all` / `personal-only`
  // / `keep-technical`. `gps-only` could in theory keep ilst items other than
  // ©xyz, but rewriting individual ilst entries in-place is non-trivial: doing
  // so would require updating both ilst and the parent meta sizes, then
  // padding moov with `free` to preserve mdat offsets. v0.1 drops everything.
  void _options;
  return scrubMoovUdta(bytes);
}

/** ISOBMFF brands that we consider "MP4-family" (excludes QuickTime). */
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
  '3gp4',
  '3gp5',
  '3gp6',
  '3gp7',
  '3gp8',
  '3gp9',
  '3g2a',
  'f4v ',
]);

function matchesMp4(bytes: Uint8Array): boolean {
  const brand = readFtypBrand(bytes);
  if (!brand) return false;
  if (MP4_BRANDS.has(brand)) return true;
  // Some files have brand `qt  ` in ftyp — those are MOV, not MP4.
  return false;
}

/** Lower-level export so MOV can reuse the same parse/scrub functions. */
export const mp4Internals = {
  parse: parseMp4Bytes,
  scrub: scrubMp4Bytes,
  matchesMp4,
};

export const mp4Parser: FormatParser = {
  format: 'mp4',
  extensions: ['.mp4', '.m4v'],
  mimeTypes: ['video/mp4', 'audio/mp4'],
  matches: matchesMp4,
  parse: parseMp4Bytes,
  scrub: scrubMp4Bytes,
};

void latin1Decoder;
