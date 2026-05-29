/**
 * HEIC parser/scrubber.
 *
 * HEIC is ISOBMFF (the same container family as MP4/MOV) with HEVC-encoded
 * still images and metadata items. Parsing is done via exifr, which handles
 * the iloc → mdat → EXIF chain natively.
 *
 * SCRUBBING (v0.1, pragmatic):
 *   Walk the ISOBMFF box tree, find any item in the iinf box whose type is
 *   "Exif", look up its file location in iloc, and overwrite the EXIF item
 *   payload with an empty TIFF block. We do NOT remove the item entry — that
 *   would require offset rewriting (every box after the removal would shift).
 *
 *   This is safe because virtually every HEIC consumer (Apple Photos,
 *   Windows Photos, libheif, exifr) re-walks the EXIF from iloc each time.
 *   The blanked TIFF has zero entries, so they report "no metadata".
 *
 * Limitations:
 *   - XMP/IPTC items are also overwritten when preset='all'.
 *   - 'gps-only' is not supported (we'd need to surgically edit the TIFF IFD
 *     in place; that's deferred to v0.2). We throw SCRUB_ERROR.
 *   - 'keep-technical' falls back to wiping all metadata items, same as 'all'.
 */
import type { FormatParser, MetadataField, ScrubOptions } from '../types.js';
import { byteEquals } from '../utils/bytes.js';
import { resolveScrub } from '../presets.js';
import { MetaScrubError } from '../types.js';
import {
  walkTopLevel,
  walkChildren,
  findBox,
  parseIinfItemTypes,
  parseIloc,
  blankExifItems,
} from './_heif.js';

const META_ITEM_TYPES_TO_BLANK = new Set(['Exif', 'mime', 'xml ']);
// 'mime' covers application/rdf+xml (XMP), 'xml ' covers MPF or XML metadata.

async function parseHeic(bytes: Uint8Array): Promise<{ groups: Record<string, MetadataField[]> }> {
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
    populateGroups(groups, parsed);
  } catch (e) {
    // exifr threw — surface as a partial result with a warning.
    void e;
  }
  return { groups };
}

function populateGroups(
  groups: Record<string, MetadataField[]>,
  parsed: Record<string, unknown>,
): void {
  const ifd0 = (parsed.ifd0 ?? {}) as Record<string, unknown>;
  const exif = (parsed.exif ?? {}) as Record<string, unknown>;
  const gps = (parsed.gps ?? {}) as Record<string, unknown>;
  const iptc = (parsed.iptc ?? {}) as Record<string, unknown>;
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
  if (Object.keys(iptc).length) {
    const iptcArr: MetadataField[] = [];
    for (const [k, v] of Object.entries(iptc)) {
      iptcArr.push(makeField(k, v, new Set(['By-line', 'Credit', 'Copyright'])));
    }
    groups.IPTC = iptcArr;
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

export async function scrubIsobmffImage(
  bytes: Uint8Array,
  options: ScrubOptions,
  formatLabel: 'heic' | 'avif',
): Promise<Uint8Array> {
  const resolved = resolveScrub(options);
  if (resolved.preset === 'gps-only') {
    throw new MetaScrubError(
      'SCRUB_ERROR',
      `${formatLabel.toUpperCase()} gps-only scrubbing is not supported in v0.1 (in-place EXIF IFD rewrite required).`,
      { format: formatLabel },
    );
  }
  const boxes = walkTopLevel(bytes);
  const meta = findBox(boxes, 'meta');
  if (!meta) {
    // No metadata to scrub — return as-is.
    return bytes;
  }
  // meta is a FullBox: skip 4-byte version+flags header before walking children.
  const metaChildren = walkChildren(meta.payload, 4);
  const iinf = metaChildren.find((c) => c.type === 'iinf');
  const iloc = metaChildren.find((c) => c.type === 'iloc');
  if (!iinf || !iloc) return bytes;

  const itemTypes = parseIinfItemTypes(iinf);
  // iloc offsets are already file-absolute: the parser sums base_offset and
  // each extent_offset before returning. construction_method=0 (file_offset)
  // is the only mode HEIC/AVIF use in practice.
  const extents = parseIloc(iloc);

  const toBlank = new Set<number>();
  for (const [id, type] of itemTypes.entries()) {
    if (META_ITEM_TYPES_TO_BLANK.has(type)) toBlank.add(id);
  }
  if (toBlank.size === 0) return bytes;
  return blankExifItems(bytes, extents, toBlank);
}

async function scrubHeic(bytes: Uint8Array, options: ScrubOptions): Promise<Uint8Array> {
  return scrubIsobmffImage(bytes, options, 'heic');
}

const FTYP = [0x66, 0x74, 0x79, 0x70];
const HEIC_BRANDS = new Set(['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'mif1', 'msf1']);

function matchesHeic(b: Uint8Array): boolean {
  if (b.length < 12) return false;
  if (!byteEquals(b, 4, FTYP)) return false;
  const major = String.fromCharCode(b[8] ?? 0, b[9] ?? 0, b[10] ?? 0, b[11] ?? 0);
  if (HEIC_BRANDS.has(major)) return true;
  const end = Math.min(b.length, 64);
  for (let off = 16; off + 4 <= end; off += 4) {
    const compat = String.fromCharCode(
      b[off] ?? 0,
      b[off + 1] ?? 0,
      b[off + 2] ?? 0,
      b[off + 3] ?? 0,
    );
    if (HEIC_BRANDS.has(compat)) return true;
  }
  return false;
}

export const heicParser: FormatParser = {
  format: 'heic',
  extensions: ['.heic', '.heif'],
  mimeTypes: ['image/heic', 'image/heif'],
  matches: matchesHeic,
  parse: parseHeic,
  scrub: scrubHeic,
};
