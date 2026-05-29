/**
 * AVIF parser/scrubber.
 *
 * AVIF is ISOBMFF + AV1-encoded image items. Same structure as HEIC, so we
 * delegate parsing to exifr and scrubbing to the shared ISOBMFF helper.
 *
 * See heic.ts for limitations.
 */
import type { FormatParser, MetadataField, ScrubOptions } from '../types.js';
import { byteEquals } from '../utils/bytes.js';
import { scrubIsobmffImage } from './heic.js';

async function parseAvif(bytes: Uint8Array): Promise<{ groups: Record<string, MetadataField[]> }> {
  const groups: Record<string, MetadataField[]> = {};
  try {
    const exifrMod = await import('exifr');
    const exifr = (exifrMod as { default?: unknown }).default ?? exifrMod;
    const parsed: Record<string, unknown> =
      (await (
        exifr as {
          parse: (data: Uint8Array, opts: unknown) => Promise<Record<string, unknown> | undefined>;
        }
      ).parse(bytes, {
        tiff: true,
        ifd0: true,
        exif: true,
        gps: true,
        iptc: true,
        xmp: true,
        icc: false,
        mergeOutput: false,
        sanitize: true,
        reviveValues: true,
        translateKeys: true,
        translateValues: false,
      })) ?? {};
    populate(groups, parsed);
  } catch (e) {
    void e;
  }
  return { groups };
}

function populate(groups: Record<string, MetadataField[]>, parsed: Record<string, unknown>): void {
  const ifd0 = (parsed.ifd0 ?? {}) as Record<string, unknown>;
  const exif = (parsed.exif ?? {}) as Record<string, unknown>;
  const gps = (parsed.gps ?? {}) as Record<string, unknown>;
  const xmp = (parsed.xmp ?? {}) as Record<string, unknown>;
  const exifSensitive = new Set([
    'Artist',
    'Copyright',
    'OwnerName',
    'SerialNumber',
    'BodySerialNumber',
    'LensSerialNumber',
    'Software',
    'HostComputer',
  ]);
  const arr: MetadataField[] = [];
  for (const [k, v] of Object.entries(ifd0)) {
    if (k.startsWith('GPS')) continue;
    arr.push(makeField(k, v, exifSensitive));
  }
  for (const [k, v] of Object.entries(exif)) {
    if (k.startsWith('GPS')) continue;
    arr.push(makeField(k, v, exifSensitive));
  }
  if (arr.length) groups.EXIF = arr;
  if (Object.keys(gps).length) {
    const gpsArr: MetadataField[] = [];
    for (const [k, v] of Object.entries(gps)) {
      gpsArr.push(
        makeField(
          k,
          v,
          new Set([
            'Latitude',
            'Longitude',
            'Altitude',
            'GPSLatitude',
            'GPSLongitude',
            'GPSAltitude',
          ]),
        ),
      );
    }
    groups.GPS = gpsArr;
  }
  if (Object.keys(xmp).length) {
    const xmpArr: MetadataField[] = [];
    for (const [k, v] of Object.entries(xmp)) {
      xmpArr.push(makeField(k, v, new Set(['creator', 'rights'])));
    }
    groups.XMP = xmpArr;
  }
}

function makeField(key: string, value: unknown, sensitive: Set<string>): MetadataField {
  let normalized: string | number | boolean | null;
  if (value === null || value === undefined) normalized = null;
  else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    normalized = value;
  } else if (value instanceof Date) normalized = value.toISOString();
  else if (Array.isArray(value))
    normalized = value.map((v) => (v === null || v === undefined ? '' : String(v))).join(', ');
  else if (value instanceof Uint8Array) normalized = `<${value.length} bytes>`;
  else if (typeof value === 'object') normalized = JSON.stringify(value);
  else normalized = String(value);
  const field: MetadataField = { key, value: normalized, raw: value };
  if (sensitive.has(key)) field.sensitive = true;
  return field;
}

async function scrubAvif(bytes: Uint8Array, options: ScrubOptions): Promise<Uint8Array> {
  return scrubIsobmffImage(bytes, options, 'avif');
}

const FTYP = [0x66, 0x74, 0x79, 0x70];
const AVIF_BRANDS = new Set(['avif', 'avis']);

function matchesAvif(b: Uint8Array): boolean {
  if (b.length < 12) return false;
  if (!byteEquals(b, 4, FTYP)) return false;
  const major = String.fromCharCode(b[8] ?? 0, b[9] ?? 0, b[10] ?? 0, b[11] ?? 0);
  if (AVIF_BRANDS.has(major)) return true;
  const end = Math.min(b.length, 64);
  for (let off = 16; off + 4 <= end; off += 4) {
    const compat = String.fromCharCode(
      b[off] ?? 0,
      b[off + 1] ?? 0,
      b[off + 2] ?? 0,
      b[off + 3] ?? 0,
    );
    if (AVIF_BRANDS.has(compat)) return true;
  }
  return false;
}

export const avifParser: FormatParser = {
  format: 'avif',
  extensions: ['.avif'],
  mimeTypes: ['image/avif'],
  matches: matchesAvif,
  parse: parseAvif,
  scrub: scrubAvif,
};
