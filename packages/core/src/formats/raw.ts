/**
 * RAW image formats — CR2, NEF, ARW, DNG.
 *
 * All four are TIFF-based: a public-facing IFD0 (often with a JPEG preview)
 * plus camera-private sub-IFDs that hold the actual sensor data.
 *
 * v0.1 strategy: PARSE-ONLY. exifr handles all four for reading. Scrubbing
 * a RAW file safely is its own multi-month project — vendor-private IFDs use
 * undocumented tag layouts, file readers re-walk those private IFDs even
 * after the public IFD is rewritten, and breaking a RAW means losing image
 * data (not just metadata).
 *
 * `scrub()` therefore throws SCRUB_ERROR with a clear message. We expose
 * one parser instance per RAW dialect so format detection routes correctly.
 */
import type { FormatParser, MetadataField, ScrubOptions, FileFormat } from '../types.js';
import { startsWith } from '../utils/bytes.js';
import { MetaScrubError } from '../types.js';

const TIFF_LE = [0x49, 0x49, 0x2a, 0x00];
const TIFF_BE = [0x4d, 0x4d, 0x00, 0x2a];

async function parseRaw(bytes: Uint8Array): Promise<{ groups: Record<string, MetadataField[]> }> {
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

    const ifd0 = (parsed.ifd0 ?? {}) as Record<string, unknown>;
    const exif = (parsed.exif ?? {}) as Record<string, unknown>;
    const gps = (parsed.gps ?? {}) as Record<string, unknown>;

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
      const sens = new Set([
        'Latitude',
        'Longitude',
        'Altitude',
        'GPSLatitude',
        'GPSLongitude',
        'GPSAltitude',
      ]);
      for (const [k, v] of Object.entries(gps)) {
        gpsArr.push(makeField(k, v, sens));
      }
      groups.GPS = gpsArr;
    }
  } catch (e) {
    void e;
  }
  return { groups };
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

function makeRawParser(
  format: FileFormat,
  extensions: string[],
  mimeTypes: string[],
  matches: (b: Uint8Array) => boolean,
): FormatParser {
  return {
    format,
    extensions,
    mimeTypes,
    matches,
    parse: parseRaw,
    scrub: async (_bytes: Uint8Array, _options: ScrubOptions) => {
      throw new MetaScrubError(
        'SCRUB_ERROR',
        `RAW formats are read-only in v0.1 (${format} scrubbing requires private IFD rewriting).`,
        { format },
      );
    },
  };
}

// CR2 is uniquely identified by the "CR\x02" marker at offset 8.
function matchesCr2(b: Uint8Array): boolean {
  if (!(startsWith(b, TIFF_LE) || startsWith(b, TIFF_BE))) return false;
  return b.length >= 11 && b[8] === 0x43 && b[9] === 0x52 && b[10] === 0x02;
}

// NEF/ARW/DNG share the bare TIFF magic with no distinguishing on-disk marker
// reachable in the first 16 bytes (the Make/Model live in the IFD). We rely on
// the extension-based detector here and accept the file as RAW once the
// dispatcher hands it to us.
function matchesAnyTiff(b: Uint8Array): boolean {
  return startsWith(b, TIFF_LE) || startsWith(b, TIFF_BE);
}

export const rawCr2Parser: FormatParser = makeRawParser(
  'raw-cr2',
  ['.cr2'],
  ['image/x-canon-cr2'],
  matchesCr2,
);
export const rawNefParser: FormatParser = makeRawParser(
  'raw-nef',
  ['.nef'],
  ['image/x-nikon-nef'],
  matchesAnyTiff,
);
export const rawArwParser: FormatParser = makeRawParser(
  'raw-arw',
  ['.arw'],
  ['image/x-sony-arw'],
  matchesAnyTiff,
);
export const rawDngParser: FormatParser = makeRawParser(
  'raw-dng',
  ['.dng'],
  ['image/x-adobe-dng'],
  matchesAnyTiff,
);
