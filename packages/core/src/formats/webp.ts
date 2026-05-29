/**
 * WebP parser/scrubber.
 *
 * WebP is a RIFF container:
 *   "RIFF" + uint32 LE size + "WEBP" + chunks
 *
 * Each chunk is: 4-byte FourCC + uint32 LE size + payload + 0 or 1 padding
 * byte (chunks are padded to even length).
 *
 * Metadata-bearing chunks:
 *   - "EXIF" — TIFF-format EXIF block
 *   - "XMP " — XMP packet (note the trailing space — FourCC is always 4 chars)
 *   - "ICCP" — ICC color profile
 *
 * VP8X (extended file) chunk: 10-byte payload, first byte is a flags field.
 *   bit 5 (0x20) = ICC, bit 4 (0x10) = Alpha, bit 3 (0x08) = EXIF,
 *   bit 2 (0x04) = XMP, bit 1 (0x02) = Animation.
 * When we drop EXIF/XMP/ICCP, we must clear the matching flag bits so the
 * file does not lie about what chunks it contains.
 *
 * Lossy (VP8 ) and lossless (VP8L) image data chunks are preserved.
 */
import type { FormatParser, MetadataField, ScrubOptions } from '../types.js';
import { startsWith, latin1Decoder } from '../utils/bytes.js';
import { resolveScrub } from '../presets.js';

const RIFF_SIG = [0x52, 0x49, 0x46, 0x46]; // "RIFF"
const WEBP_FOURCC = [0x57, 0x45, 0x42, 0x50]; // "WEBP"

type Chunk = {
  /** 4-character ASCII identifier (e.g. "EXIF", "XMP ", "VP8X"). */
  fourcc: string;
  /** Payload bytes (no fourcc, no size, no padding). */
  data: Uint8Array;
};

function readU32LE(b: Uint8Array, off: number): number {
  return (
    ((b[off] ?? 0) |
      ((b[off + 1] ?? 0) << 8) |
      ((b[off + 2] ?? 0) << 16) |
      ((b[off + 3] ?? 0) << 24)) >>>
    0
  );
}

function writeU32LE(b: Uint8Array, off: number, value: number): void {
  b[off] = value & 0xff;
  b[off + 1] = (value >>> 8) & 0xff;
  b[off + 2] = (value >>> 16) & 0xff;
  b[off + 3] = (value >>> 24) & 0xff;
}

function readChunks(bytes: Uint8Array): Chunk[] {
  if (!startsWith(bytes, RIFF_SIG)) {
    throw new Error('Not a RIFF container');
  }
  if (bytes.length < 12) throw new Error('Truncated RIFF/WebP header');
  if (
    bytes[8] !== WEBP_FOURCC[0] ||
    bytes[9] !== WEBP_FOURCC[1] ||
    bytes[10] !== WEBP_FOURCC[2] ||
    bytes[11] !== WEBP_FOURCC[3]
  ) {
    throw new Error('Not a WebP file (missing "WEBP" FourCC)');
  }
  const chunks: Chunk[] = [];
  let off = 12;
  while (off + 8 <= bytes.length) {
    const fourcc = latin1Decoder.decode(bytes.subarray(off, off + 4));
    const size = readU32LE(bytes, off + 4);
    const payloadStart = off + 8;
    const payloadEnd = payloadStart + size;
    if (payloadEnd > bytes.length) {
      throw new Error(`Truncated WebP chunk "${fourcc}"`);
    }
    chunks.push({ fourcc, data: bytes.subarray(payloadStart, payloadEnd) });
    // Chunks are padded to even length.
    off = payloadEnd + (size % 2);
  }
  return chunks;
}

function writeChunks(chunks: Chunk[]): Uint8Array {
  // Compute total inner size (after "WEBP" fourcc).
  let inner = 4; // "WEBP"
  for (const c of chunks) {
    inner += 8 + c.data.length + (c.data.length % 2);
  }
  const out = new Uint8Array(8 + inner);
  out.set(RIFF_SIG, 0);
  writeU32LE(out, 4, inner);
  out.set(WEBP_FOURCC, 8);
  let off = 12;
  for (const c of chunks) {
    for (let i = 0; i < 4; i += 1) out[off + i] = c.fourcc.charCodeAt(i) & 0xff;
    writeU32LE(out, off + 4, c.data.length);
    out.set(c.data, off + 8);
    off += 8 + c.data.length;
    if (c.data.length % 2 === 1) {
      out[off] = 0;
      off += 1;
    }
  }
  return out;
}

function valueToField(key: string, value: unknown, sensitive: Set<string>): MetadataField {
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
const XMP_SENSITIVE = new Set(['creator', 'rights']);

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

async function parseExifBlock(bytes: Uint8Array): Promise<{
  ifd0: Record<string, unknown>;
  exif: Record<string, unknown>;
  gps: Record<string, unknown>;
}> {
  const exifrMod = await import('exifr');
  const exifr = (exifrMod as { default?: unknown }).default ?? exifrMod;
  // exifr's parse() will sniff for various containers; passing a raw TIFF works.
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
      iptc: false,
      xmp: false,
      icc: false,
      mergeOutput: false,
      sanitize: true,
      reviveValues: true,
      translateKeys: true,
      translateValues: false,
    })) ?? {};
  return {
    ifd0: (parsed.ifd0 ?? {}) as Record<string, unknown>,
    exif: (parsed.exif ?? {}) as Record<string, unknown>,
    gps: (parsed.gps ?? {}) as Record<string, unknown>,
  };
}

function parseXmpKeys(xmp: string): Record<string, string> {
  // Lightweight RDF tag-grab — same approach used by SVG.
  const out: Record<string, string> = {};
  const fields = ['title', 'creator', 'description', 'rights', 'subject', 'date', 'CreatorTool'];
  for (const f of fields) {
    const re = new RegExp(`<(?:\\w+:)?${f}\\b[^>]*>([\\s\\S]*?)<\\/(?:\\w+:)?${f}>`, 'i');
    const m = re.exec(xmp);
    if (m && m[1] !== undefined) {
      const clean = m[1]
        .replace(/<[^>]+>/g, '')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&amp;/g, '&')
        .trim();
      if (clean) out[f] = clean;
    }
  }
  return out;
}

async function parseWebp(bytes: Uint8Array): Promise<{ groups: Record<string, MetadataField[]> }> {
  const chunks = readChunks(bytes);
  const groups: Record<string, MetadataField[]> = {};

  for (const c of chunks) {
    if (c.fourcc === 'EXIF') {
      const { ifd0, exif, gps } = await parseExifBlock(c.data);
      const exifGroup: MetadataField[] = [];
      for (const [k, v] of Object.entries(ifd0)) {
        if (GPS_KEYS.has(k)) continue;
        exifGroup.push(valueToField(k, v, EXIF_SENSITIVE));
      }
      for (const [k, v] of Object.entries(exif)) {
        if (GPS_KEYS.has(k)) continue;
        exifGroup.push(valueToField(k, v, EXIF_SENSITIVE));
      }
      if (exifGroup.length) groups.EXIF = exifGroup;
      if (Object.keys(gps).length) {
        const gpsGroup: MetadataField[] = [];
        for (const [k, v] of Object.entries(gps)) {
          gpsGroup.push(valueToField(k, v, GPS_SENSITIVE));
        }
        groups.GPS = gpsGroup;
      }
    } else if (c.fourcc === 'XMP ') {
      const xmpText = new TextDecoder('utf-8', { fatal: false }).decode(c.data);
      const parsed = parseXmpKeys(xmpText);
      const xmpGroup: MetadataField[] = [];
      for (const [k, v] of Object.entries(parsed)) {
        xmpGroup.push({ key: k, value: v, sensitive: XMP_SENSITIVE.has(k) });
      }
      if (xmpGroup.length) groups.XMP = xmpGroup;
    } else if (c.fourcc === 'ICCP') {
      groups.ICC = [{ key: 'profileBytes', value: c.data.length }];
    }
  }
  return { groups };
}

function clearVp8xFlags(
  chunks: Chunk[],
  flags: { dropExif: boolean; dropXmp: boolean; dropIcc: boolean },
): void {
  const vp8x = chunks.find((c) => c.fourcc === 'VP8X');
  if (!vp8x || vp8x.data.length < 1) return;
  // VP8X payload first byte = flags
  // bit 5 (0x20) ICC | bit 4 (0x10) Alpha | bit 3 (0x08) EXIF |
  // bit 2 (0x04) XMP | bit 1 (0x02) Animation
  let cur = vp8x.data[0] ?? 0;
  if (flags.dropExif) cur &= ~0x08;
  if (flags.dropXmp) cur &= ~0x04;
  if (flags.dropIcc) cur &= ~0x20;
  // VP8X chunk payloads share data slices with the source buffer. Clone before
  // mutating so we don't accidentally write back into the caller's array.
  const copy = new Uint8Array(vp8x.data.length);
  copy.set(vp8x.data, 0);
  copy[0] = cur & 0xff;
  vp8x.data = copy;
}

async function scrubWebp(bytes: Uint8Array, options: ScrubOptions): Promise<Uint8Array> {
  const resolved = resolveScrub(options);
  const chunks = readChunks(bytes);

  const dropAll = resolved.preset === 'all' || resolved.preset === 'personal-only';
  const dropKeepTech = resolved.preset === 'keep-technical';
  const dropGpsOnly = resolved.preset === 'gps-only';

  // For v0.1 we drop EXIF/XMP wholesale on 'all', 'personal-only', 'keep-technical'.
  // 'gps-only' drops EXIF (it contains GPS coordinates) but keeps XMP intact.
  // ICC profile is preserved by default (per spec) — only removed if the user
  // explicitly asks via custom remove pattern.
  const dropExif = dropAll || dropKeepTech || dropGpsOnly;
  const dropXmp = dropAll || dropKeepTech;
  let dropIcc = false;
  if (resolved.preset === 'custom') {
    if (resolved.remove.some((p) => p === 'EXIF.*' || p === 'EXIF')) {
      // mirror custom EXIF removal
    }
    if (resolved.remove.some((p) => p === 'ICC.*' || p === 'ICC')) dropIcc = true;
  }

  const customDropExif =
    resolved.preset === 'custom' && resolved.remove.some((p) => p === 'EXIF.*' || p === 'EXIF');
  const customDropXmp =
    resolved.preset === 'custom' && resolved.remove.some((p) => p === 'XMP.*' || p === 'XMP');

  const finalDropExif = dropExif || customDropExif;
  const finalDropXmp = dropXmp || customDropXmp;

  const kept: Chunk[] = [];
  for (const c of chunks) {
    if (c.fourcc === 'EXIF' && finalDropExif) continue;
    if (c.fourcc === 'XMP ' && finalDropXmp) continue;
    if (c.fourcc === 'ICCP' && dropIcc) continue;
    kept.push(c);
  }

  clearVp8xFlags(kept, {
    dropExif: finalDropExif,
    dropXmp: finalDropXmp,
    dropIcc,
  });

  return writeChunks(kept);
}

export const webpParser: FormatParser = {
  format: 'webp',
  extensions: ['.webp'],
  mimeTypes: ['image/webp'],
  matches: (b) =>
    startsWith(b, RIFF_SIG) &&
    b.length >= 12 &&
    b[8] === WEBP_FOURCC[0] &&
    b[9] === WEBP_FOURCC[1] &&
    b[10] === WEBP_FOURCC[2] &&
    b[11] === WEBP_FOURCC[3],
  parse: parseWebp,
  scrub: scrubWebp,
};
