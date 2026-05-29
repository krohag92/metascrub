import type { FormatParser, MetadataField, ScrubOptions } from '../types.js';
import { startsWith, readUInt16BE, writeUInt16BE, concatBytes } from '../utils/bytes.js';
import { resolveScrub, pathMatches, KEEP_TECHNICAL } from '../presets.js';

const MARKER_EOI = 0xd9;
const MARKER_SOS = 0xda;
const MARKER_APP1 = 0xe1;
const MARKER_APP2 = 0xe2;
const MARKER_APP12 = 0xec;
const MARKER_APP13 = 0xed;
const MARKER_APP14 = 0xee;
const MARKER_COM = 0xfe;

const EXIF_HEADER = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00]; // "Exif\0\0"
const XMP_HEADER = [
  0x68, 0x74, 0x74, 0x70, 0x3a, 0x2f, 0x2f, 0x6e, 0x73, 0x2e, 0x61, 0x64, 0x6f, 0x62, 0x65, 0x2e,
  0x63, 0x6f, 0x6d, 0x2f, 0x78, 0x61, 0x70, 0x2f, 0x31, 0x2e, 0x30, 0x2f, 0x00,
]; // "http://ns.adobe.com/xap/1.0/\0"

type Segment = {
  marker: number;
  /** Full segment bytes including 0xFF, marker, length, payload. */
  bytes: Uint8Array;
};

type SplitJpeg = {
  segments: Segment[];
  /** Image data from SOS marker (inclusive) through EOI marker (inclusive). */
  imageData: Uint8Array;
};

function splitJpeg(bytes: Uint8Array): SplitJpeg {
  if (!startsWith(bytes, [0xff, 0xd8])) {
    throw new Error('Not a JPEG (missing SOI marker)');
  }
  const segments: Segment[] = [];
  let i = 2; // skip SOI
  while (i < bytes.length) {
    if (bytes[i] !== 0xff) {
      throw new Error(`Expected marker at offset ${i}, got 0x${bytes[i]?.toString(16)}`);
    }
    // Skip fill bytes (0xff 0xff ...)
    while (bytes[i] === 0xff && i + 1 < bytes.length) i += 1;
    const marker = bytes[i] ?? 0;
    i -= 1; // step back to point at the 0xff
    if (marker === MARKER_SOS) {
      // Start of Scan — rest of file is entropy-coded image data + EOI.
      return { segments, imageData: bytes.subarray(i) };
    }
    if (marker === MARKER_EOI) {
      return { segments, imageData: bytes.subarray(i) };
    }
    // Standalone markers (no length): RST0-7 (0xd0-0xd7), TEM (0x01)
    if (marker >= 0xd0 && marker <= 0xd7) {
      segments.push({ marker, bytes: bytes.subarray(i, i + 2) });
      i += 2;
      continue;
    }
    const lenOff = i + 2;
    if (lenOff + 2 > bytes.length) {
      throw new Error('Truncated JPEG segment');
    }
    const segLen = readUInt16BE(bytes, lenOff);
    const segEnd = lenOff + segLen;
    if (segEnd > bytes.length) {
      throw new Error('JPEG segment length exceeds file size');
    }
    segments.push({ marker, bytes: bytes.subarray(i, segEnd) });
    i = segEnd;
  }
  throw new Error('JPEG ended without SOS or EOI marker');
}

function getPayload(segment: Segment): Uint8Array {
  // skip 0xFF + marker + 2-byte length
  return segment.bytes.subarray(4);
}

function payloadStartsWith(segment: Segment, prefix: number[]): boolean {
  const payload = getPayload(segment);
  if (payload.length < prefix.length) return false;
  for (let i = 0; i < prefix.length; i += 1) {
    if (payload[i] !== prefix[i]) return false;
  }
  return true;
}

function isExifSegment(s: Segment): boolean {
  return s.marker === MARKER_APP1 && payloadStartsWith(s, EXIF_HEADER);
}
function isXmpSegment(s: Segment): boolean {
  return s.marker === MARKER_APP1 && payloadStartsWith(s, XMP_HEADER);
}
function isIptcSegment(s: Segment): boolean {
  return s.marker === MARKER_APP13;
}
function isComSegment(s: Segment): boolean {
  return s.marker === MARKER_COM;
}
void MARKER_APP2;

/** Read just the Orientation tag from an EXIF segment, if present. Returns 1..8 or null. */
function readOrientation(segment: Segment): number | null {
  const payload = getPayload(segment);
  // skip "Exif\0\0"
  const tiff = payload.subarray(6);
  if (tiff.length < 8) return null;
  const isLE = tiff[0] === 0x49 && tiff[1] === 0x49;
  const isBE = tiff[0] === 0x4d && tiff[1] === 0x4d;
  if (!isLE && !isBE) return null;
  const read16 = (off: number): number => {
    const b0 = tiff[off] ?? 0;
    const b1 = tiff[off + 1] ?? 0;
    return isLE ? (b1 << 8) | b0 : (b0 << 8) | b1;
  };
  const read32 = (off: number): number => {
    const b0 = tiff[off] ?? 0;
    const b1 = tiff[off + 1] ?? 0;
    const b2 = tiff[off + 2] ?? 0;
    const b3 = tiff[off + 3] ?? 0;
    return isLE
      ? ((b3 << 24) | (b2 << 16) | (b1 << 8) | b0) >>> 0
      : ((b0 << 24) | (b1 << 16) | (b2 << 8) | b3) >>> 0;
  };
  const ifd0Off = read32(4);
  if (ifd0Off + 2 > tiff.length) return null;
  const count = read16(ifd0Off);
  for (let i = 0; i < count; i += 1) {
    const entryOff = ifd0Off + 2 + i * 12;
    if (entryOff + 12 > tiff.length) break;
    const tag = read16(entryOff);
    if (tag === 0x0112) {
      // Orientation, type SHORT (3), count 1 — value stored in first 2 bytes of value field.
      const value = read16(entryOff + 8);
      if (value >= 1 && value <= 8) return value;
      return null;
    }
  }
  return null;
}

/** Build a minimal EXIF APP1 segment containing only the Orientation tag. */
function buildMinimalExifSegment(orientation: number): Uint8Array {
  // Big-endian TIFF (MM)
  const tiff = new Uint8Array(8 + 2 + 12 + 4);
  tiff[0] = 0x4d;
  tiff[1] = 0x4d;
  tiff[2] = 0x00;
  tiff[3] = 0x2a;
  // IFD0 offset = 8
  tiff[4] = 0x00;
  tiff[5] = 0x00;
  tiff[6] = 0x00;
  tiff[7] = 0x08;
  // IFD0 entry count = 1
  tiff[8] = 0x00;
  tiff[9] = 0x01;
  // Entry: tag=0x0112 type=3 count=1 value=orientation
  tiff[10] = 0x01;
  tiff[11] = 0x12;
  tiff[12] = 0x00;
  tiff[13] = 0x03;
  tiff[14] = 0x00;
  tiff[15] = 0x00;
  tiff[16] = 0x00;
  tiff[17] = 0x01;
  tiff[18] = (orientation >>> 8) & 0xff;
  tiff[19] = orientation & 0xff;
  tiff[20] = 0x00;
  tiff[21] = 0x00;
  // Next IFD offset = 0
  tiff[22] = 0x00;
  tiff[23] = 0x00;
  tiff[24] = 0x00;
  tiff[25] = 0x00;

  const payload = new Uint8Array(EXIF_HEADER.length + tiff.length);
  payload.set(EXIF_HEADER, 0);
  payload.set(tiff, EXIF_HEADER.length);

  // length field = payload + 2 (length field itself)
  const segLen = payload.length + 2;
  const out = new Uint8Array(2 + 2 + payload.length);
  out[0] = 0xff;
  out[1] = MARKER_APP1;
  writeUInt16BE(out, 2, segLen);
  out.set(payload, 4);
  return out;
}

function parseField(
  key: string,
  value: unknown,
  sensitiveKeys: ReadonlySet<string>,
): MetadataField {
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
  if (sensitiveKeys.has(key)) field.sensitive = true;
  return field;
}

const EXIF_SENSITIVE = new Set([
  'Artist',
  'Copyright',
  'OwnerName',
  'SerialNumber',
  'BodySerialNumber',
  'LensSerialNumber',
  'Software',
  'HostComputer',
  'GPSLatitude',
  'GPSLongitude',
  'GPSAltitude',
]);
const GPS_SENSITIVE = new Set([
  'Latitude',
  'Longitude',
  'Altitude',
  'GPSLatitude',
  'GPSLongitude',
  'GPSAltitude',
]);

const GPS_KEYS = new Set([
  'latitude',
  'longitude',
  'GPSLatitude',
  'GPSLongitude',
  'GPSAltitude',
  'altitude',
  'GPSLatitudeRef',
  'GPSLongitudeRef',
  'GPSAltitudeRef',
  'GPSTimeStamp',
  'GPSDateStamp',
  'GPSSpeed',
  'GPSSpeedRef',
  'GPSImgDirection',
  'GPSImgDirectionRef',
  'GPSProcessingMethod',
]);

async function parseJpeg(bytes: Uint8Array): Promise<{ groups: Record<string, MetadataField[]> }> {
  const groups: Record<string, MetadataField[]> = {};

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
      jfif: true,
      interop: false,
      mergeOutput: false,
      sanitize: true,
      reviveValues: true,
      translateKeys: true,
      translateValues: false,
    })) ?? {};

  const ifd0 = (parsed.ifd0 ?? {}) as Record<string, unknown>;
  const exif = (parsed.exif ?? {}) as Record<string, unknown>;
  const gps = (parsed.gps ?? {}) as Record<string, unknown>;
  const iptc = (parsed.iptc ?? {}) as Record<string, unknown>;
  const xmp = (parsed.xmp ?? {}) as Record<string, unknown>;

  const exifGroup: MetadataField[] = [];
  for (const [k, v] of Object.entries(ifd0)) {
    if (GPS_KEYS.has(k)) continue;
    exifGroup.push(parseField(k, v, EXIF_SENSITIVE));
  }
  for (const [k, v] of Object.entries(exif)) {
    if (GPS_KEYS.has(k)) continue;
    exifGroup.push(parseField(k, v, EXIF_SENSITIVE));
  }
  if (exifGroup.length) groups.EXIF = exifGroup;

  if (Object.keys(gps).length) {
    const gpsGroup: MetadataField[] = [];
    for (const [k, v] of Object.entries(gps)) {
      gpsGroup.push(parseField(k, v, GPS_SENSITIVE));
    }
    groups.GPS = gpsGroup;
  }

  if (Object.keys(iptc).length) {
    const iptcGroup: MetadataField[] = [];
    const iptcSensitive = new Set(['By-line', 'Credit', 'Copyright']);
    for (const [k, v] of Object.entries(iptc)) {
      iptcGroup.push(parseField(k, v, iptcSensitive));
    }
    groups.IPTC = iptcGroup;
  }

  if (Object.keys(xmp).length) {
    const xmpGroup: MetadataField[] = [];
    const xmpSensitive = new Set(['creator', 'rights']);
    for (const [k, v] of Object.entries(xmp)) {
      xmpGroup.push(parseField(k, v, xmpSensitive));
    }
    groups.XMP = xmpGroup;
  }

  return { groups };
}

async function scrubJpeg(bytes: Uint8Array, options: ScrubOptions): Promise<Uint8Array> {
  const resolved = resolveScrub(options);
  const { segments, imageData } = splitJpeg(bytes);

  // Find orientation in source EXIF (for preservation).
  let orientation: number | null = null;
  for (const s of segments) {
    if (isExifSegment(s)) {
      orientation = readOrientation(s);
      break;
    }
  }

  const dropExif = shouldDropExif(resolved.preset, resolved.remove, resolved.keep);
  const dropXmp = shouldDropXmp(resolved.preset, resolved.remove, resolved.keep);
  const dropIptc = shouldDropIptc(resolved.preset, resolved.remove);
  const dropCom = resolved.preset === 'all';

  const out: Uint8Array[] = [Uint8Array.from([0xff, 0xd8])]; // SOI

  let exifInserted = false;

  for (const s of segments) {
    if (isExifSegment(s)) {
      if (!dropExif) {
        out.push(s.bytes);
      } else if (
        // For keep-technical: keep orientation + Make/Model/Lens/Exposure etc.
        // For now we collapse to "orientation-only" since rewriting a partial
        // EXIF IFD safely is complex. This is the v0.1 behavior.
        // For preset='all' we still preserve orientation (per spec).
        orientation !== null &&
        keepOrientation(resolved.preset, resolved.keep, resolved.remove)
      ) {
        out.push(buildMinimalExifSegment(orientation));
        exifInserted = true;
      }
      continue;
    }
    if (isXmpSegment(s)) {
      if (dropXmp) continue;
      out.push(s.bytes);
      continue;
    }
    if (isIptcSegment(s)) {
      if (dropIptc) continue;
      out.push(s.bytes);
      continue;
    }
    if (isComSegment(s)) {
      if (dropCom) continue;
      out.push(s.bytes);
      continue;
    }
    if (s.marker === MARKER_APP12 || s.marker === MARKER_APP14) {
      if (resolved.preset === 'all' || resolved.preset === 'personal-only') {
        continue;
      }
      out.push(s.bytes);
      continue;
    }
    // Keep everything else: APP0 (JFIF), APP2 (ICC), DQT, DHT, SOFx, ...
    out.push(s.bytes);
  }

  // If we never saw an EXIF segment but image had no orientation tag, we're done.
  void exifInserted;

  out.push(imageData);
  return concatBytes(out);
}

function shouldDropExif(preset: string, remove: string[], keep: string[]): boolean {
  void keep;
  if (preset === 'all' || preset === 'personal-only') return true;
  if (preset === 'keep-technical') {
    // We strip EXIF but reinsert orientation-only (limitation noted above).
    // Note: this is a known v0.1 limitation; v0.2 will preserve the full
    // KEEP_TECHNICAL field set.
    return true;
  }
  if (preset === 'gps-only') return false; // EXIF kept; GPS sub-block handled by exifr-aware paths in future
  if (preset === 'custom') {
    // remove only if EXIF.* is in remove and not keep
    return (
      remove.some((p) => p === 'EXIF.*' || p === 'EXIF') && !keep.some((p) => p.startsWith('EXIF'))
    );
  }
  return false;
}

function shouldDropXmp(preset: string, remove: string[], keep: string[]): boolean {
  if (preset === 'all' || preset === 'personal-only') return true;
  if (preset === 'keep-technical') return true;
  // gps-only: keep XMP segment intact (we'd need an RDF parser to strip
  // just geo-related fields; v0.1 keeps the whole segment).
  if (preset === 'gps-only') return false;
  if (preset === 'custom') {
    return (
      remove.some((p) => p === 'XMP.*' || p === 'XMP') && !keep.some((p) => p.startsWith('XMP'))
    );
  }
  return false;
}

function shouldDropIptc(preset: string, remove: string[]): boolean {
  if (preset === 'all' || preset === 'personal-only') return true;
  if (preset === 'keep-technical') return true;
  if (preset === 'custom') {
    return remove.some((p) => p === 'IPTC.*' || p === 'IPTC' || p.startsWith('IPTC.'));
  }
  return false;
}

function keepOrientation(preset: string, keep: string[], remove: string[]): boolean {
  void keep;
  // Spec: always preserve orientation by default.
  if (remove.includes('EXIF.Orientation')) return false;
  if (preset === 'keep-technical') return KEEP_TECHNICAL.includes('EXIF.Orientation');
  // For preset='all' and 'personal-only', preserve orientation.
  return true;
}

void pathMatches; // reserved for future per-field filtering

export const jpegParser: FormatParser = {
  format: 'jpeg',
  extensions: ['.jpg', '.jpeg'],
  mimeTypes: ['image/jpeg'],
  matches: (b) => startsWith(b, [0xff, 0xd8, 0xff]),
  parse: parseJpeg,
  scrub: scrubJpeg,
};
