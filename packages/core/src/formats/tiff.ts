/**
 * TIFF parser/scrubber.
 *
 * TIFF byte layout:
 *   - 2 bytes: byte order ("II" little-endian or "MM" big-endian)
 *   - 2 bytes: magic number 42
 *   - 4 bytes: offset to first IFD
 *
 * Each IFD: uint16 count + (count × 12-byte entries) + uint32 next-IFD offset.
 * Each entry: tag(2) + type(2) + count(4) + value/offset(4).
 *
 * Parsing is delegated to exifr (it handles TIFF natively).
 *
 * SCRUBBING NOTE — this is the riskiest format we support. A real TIFF can
 * contain multiple sub-IFDs (ExifIFD, GPSIFD, InteropIFD, Sub-IFDs for raw
 * preview frames) plus StripOffsets/TileOffsets pointing into the raster
 * data. Rewriting all of that is a deep rabbit hole.
 *
 * For v0.1 the safe behaviour: when we recognise this is a "plain" TIFF
 * image (one IFD, uncompressed/PackBits/LZW strips), we rebuild a fresh
 * IFD0 containing only the structural tags needed to render the pixels.
 * Anything more exotic (multi-IFD, sub-IFDs, JPEG-in-TIFF) falls back to
 * "parse only" — we throw a SCRUB_ERROR rather than corrupt the file.
 */
import type { FormatParser, MetadataField, ScrubOptions } from '../types.js';
import { startsWith } from '../utils/bytes.js';
import { resolveScrub } from '../presets.js';
import { MetaScrubError } from '../types.js';

const TIFF_LE = [0x49, 0x49, 0x2a, 0x00];
const TIFF_BE = [0x4d, 0x4d, 0x00, 0x2a];

type Endian = 'LE' | 'BE';

interface Reader {
  endian: Endian;
  u16: (off: number) => number;
  u32: (off: number) => number;
}

function makeReader(bytes: Uint8Array, endian: Endian): Reader {
  if (endian === 'LE') {
    return {
      endian,
      u16: (off) => ((bytes[off] ?? 0) | ((bytes[off + 1] ?? 0) << 8)) >>> 0,
      u32: (off) =>
        ((bytes[off] ?? 0) |
          ((bytes[off + 1] ?? 0) << 8) |
          ((bytes[off + 2] ?? 0) << 16) |
          ((bytes[off + 3] ?? 0) << 24)) >>>
        0,
    };
  }
  return {
    endian,
    u16: (off) => (((bytes[off] ?? 0) << 8) | (bytes[off + 1] ?? 0)) >>> 0,
    u32: (off) =>
      (((bytes[off] ?? 0) << 24) |
        ((bytes[off + 1] ?? 0) << 16) |
        ((bytes[off + 2] ?? 0) << 8) |
        (bytes[off + 3] ?? 0)) >>>
      0,
  };
}

type IfdEntry = {
  tag: number;
  type: number;
  count: number;
  /** Raw 4-byte value/offset slot, exactly as read from the IFD entry. */
  valueOff: number;
};

function readIfd(
  bytes: Uint8Array,
  reader: Reader,
  offset: number,
): { entries: IfdEntry[]; nextIfd: number } {
  const count = reader.u16(offset);
  const entries: IfdEntry[] = [];
  for (let i = 0; i < count; i += 1) {
    const eOff = offset + 2 + i * 12;
    if (eOff + 12 > bytes.length) throw new Error('Truncated TIFF IFD');
    entries.push({
      tag: reader.u16(eOff),
      type: reader.u16(eOff + 2),
      count: reader.u32(eOff + 4),
      valueOff: reader.u32(eOff + 8),
    });
  }
  const nextIfd = reader.u32(offset + 2 + count * 12);
  return { entries, nextIfd };
}

const TYPE_SIZES: Record<number, number> = {
  1: 1, // BYTE
  2: 1, // ASCII
  3: 2, // SHORT
  4: 4, // LONG
  5: 8, // RATIONAL
  7: 1, // UNDEFINED
  9: 4, // SLONG
  10: 8, // SRATIONAL
};

function entryDataSize(e: IfdEntry): number {
  const sz = TYPE_SIZES[e.type] ?? 1;
  return sz * e.count;
}

function readEntryBytes(bytes: Uint8Array, e: IfdEntry, reader: Reader): Uint8Array {
  const size = entryDataSize(e);
  if (size <= 4) {
    // Value is stored inline in valueOff slot — extract the bytes back in their
    // original byte order. The valueOff was decoded as a 32-bit integer, so we
    // recompose the 4 raw bytes by re-encoding it in the file's endianness.
    const raw = new Uint8Array(4);
    if (reader.endian === 'LE') {
      raw[0] = e.valueOff & 0xff;
      raw[1] = (e.valueOff >>> 8) & 0xff;
      raw[2] = (e.valueOff >>> 16) & 0xff;
      raw[3] = (e.valueOff >>> 24) & 0xff;
    } else {
      raw[0] = (e.valueOff >>> 24) & 0xff;
      raw[1] = (e.valueOff >>> 16) & 0xff;
      raw[2] = (e.valueOff >>> 8) & 0xff;
      raw[3] = e.valueOff & 0xff;
    }
    return raw.subarray(0, size);
  }
  if (e.valueOff + size > bytes.length) {
    throw new Error('TIFF entry data offset out of bounds');
  }
  return bytes.subarray(e.valueOff, e.valueOff + size);
}

/** Required structural tags for a baseline TIFF image. */
const STRUCTURAL_TAGS = new Set<number>([
  0x0100, // ImageWidth
  0x0101, // ImageLength
  0x0102, // BitsPerSample
  0x0103, // Compression
  0x0106, // PhotometricInterpretation
  0x0111, // StripOffsets
  0x0112, // Orientation (preserved)
  0x0115, // SamplesPerPixel
  0x0116, // RowsPerStrip
  0x0117, // StripByteCounts
  0x011a, // XResolution
  0x011b, // YResolution
  0x011c, // PlanarConfiguration
  0x0128, // ResolutionUnit
  0x013e, // WhitePoint
  0x013f, // PrimaryChromaticities
  0x0142, // TileWidth (we'll refuse if tiled — see below)
  0x0143, // TileLength
  0x0144, // TileOffsets
  0x0145, // TileByteCounts
  0x0152, // ExtraSamples
  0x0153, // SampleFormat
]);

/** Tags that point to sub-IFDs which would require deep rewriting. */
const SUB_IFD_TAGS = new Set<number>([
  0x014a, // SubIFDs
  0x8769, // ExifIFD
  0x8825, // GPSIFD
  0xa005, // InteropIFD
]);

async function parseTiff(bytes: Uint8Array): Promise<{ groups: Record<string, MetadataField[]> }> {
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

  const groups: Record<string, MetadataField[]> = {};
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
  const exifGroup: MetadataField[] = [];
  for (const [k, v] of Object.entries(ifd0)) {
    if (k.startsWith('GPS')) continue;
    exifGroup.push(makeField(k, v, exifSensitive));
  }
  for (const [k, v] of Object.entries(exif)) {
    if (k.startsWith('GPS')) continue;
    exifGroup.push(makeField(k, v, exifSensitive));
  }
  if (exifGroup.length) groups.EXIF = exifGroup;

  if (Object.keys(gps).length) {
    const gpsSens = new Set([
      'Latitude',
      'Longitude',
      'Altitude',
      'GPSLatitude',
      'GPSLongitude',
      'GPSAltitude',
    ]);
    const arr: MetadataField[] = [];
    for (const [k, v] of Object.entries(gps)) arr.push(makeField(k, v, gpsSens));
    groups.GPS = arr;
  }
  if (Object.keys(iptc).length) {
    const arr: MetadataField[] = [];
    for (const [k, v] of Object.entries(iptc)) {
      arr.push(makeField(k, v, new Set(['By-line', 'Credit', 'Copyright'])));
    }
    groups.IPTC = arr;
  }
  if (Object.keys(xmp).length) {
    const arr: MetadataField[] = [];
    for (const [k, v] of Object.entries(xmp)) {
      arr.push(makeField(k, v, new Set(['creator', 'rights'])));
    }
    groups.XMP = arr;
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

/**
 * Rewrite a TIFF keeping only structural tags so the raster still renders.
 * Returns null if the file is too complex for the safe v0.1 rewrite path
 * (e.g. multi-IFD, tiled, JPEG-compressed, sub-IFD pointers) — caller should
 * surface a SCRUB_ERROR.
 */
function rebuildBaselineTiff(
  bytes: Uint8Array,
  opts: { keepOrientation: boolean },
): Uint8Array | null {
  let endian: Endian | null = null;
  if (startsWith(bytes, TIFF_LE)) endian = 'LE';
  else if (startsWith(bytes, TIFF_BE)) endian = 'BE';
  if (!endian) return null;
  const reader = makeReader(bytes, endian);
  const ifd0Off = reader.u32(4);
  if (ifd0Off < 8 || ifd0Off + 2 > bytes.length) return null;
  const { entries, nextIfd } = readIfd(bytes, reader, ifd0Off);
  // Reject multi-IFD images for the safe path.
  if (nextIfd !== 0) return null;

  let hasStripOffsets = false;
  let stripOffsetsEntry: IfdEntry | null = null;
  let stripByteCountsEntry: IfdEntry | null = null;
  let compression: number | null = null;

  for (const e of entries) {
    if (SUB_IFD_TAGS.has(e.tag)) return null; // refuse sub-IFD pointers
    if (e.tag === 0x0142 || e.tag === 0x0143 || e.tag === 0x0144 || e.tag === 0x0145) {
      return null; // tiled image — too risky to copy strip-by-strip
    }
    if (e.tag === 0x0103) {
      compression = readShort(e, reader, bytes);
    }
    if (e.tag === 0x0111) {
      hasStripOffsets = true;
      stripOffsetsEntry = e;
    }
    if (e.tag === 0x0117) stripByteCountsEntry = e;
  }
  if (!hasStripOffsets || !stripOffsetsEntry || !stripByteCountsEntry) return null;
  // Accept only uncompressed (1), CCITT (2-4), PackBits (32773), LZW (5),
  // Deflate (8, 32946). Refuse JPEG-in-TIFF (6/7) — strip offsets there
  // point at SOI markers and the layout is different.
  const SAFE_COMPRESSION = new Set([1, 2, 3, 4, 5, 8, 32773, 32946]);
  if (compression !== null && !SAFE_COMPRESSION.has(compression)) return null;

  // Extract strip data so we can re-pack it after the new IFD.
  const stripOffsets = readArray(stripOffsetsEntry, reader, bytes);
  const stripByteCounts = readArray(stripByteCountsEntry, reader, bytes);
  if (stripOffsets.length !== stripByteCounts.length || stripOffsets.length === 0) return null;
  const strips: Uint8Array[] = [];
  for (let i = 0; i < stripOffsets.length; i += 1) {
    const o = stripOffsets[i] ?? 0;
    const n = stripByteCounts[i] ?? 0;
    if (o + n > bytes.length) return null;
    strips.push(bytes.subarray(o, o + n));
  }

  // Filter entries to keep only structural ones (and Orientation if requested).
  const keep: IfdEntry[] = [];
  for (const e of entries) {
    if (e.tag === 0x0112) {
      if (opts.keepOrientation) keep.push(e);
      continue;
    }
    if (STRUCTURAL_TAGS.has(e.tag)) keep.push(e);
  }

  // Now rebuild. We need to:
  //   1) write TIFF header (8 bytes)
  //   2) reserve IFD (2 + N×12 + 4 bytes)
  //   3) write any oversized entry payloads (StripOffsets/ByteCounts may need a pool)
  //   4) write strips
  //   5) patch StripOffsets to point at the new strip locations
  //
  // Easier approach: write strips first at known offsets, then write the IFD.

  // Compute layout.
  const headerSize = 8;
  const newIfdEntryCount = keep.length;
  const ifdSize = 2 + 12 * newIfdEntryCount + 4;

  // Each entry whose data > 4 bytes lives in an "extra pool" after the IFD.
  // We'll patch StripOffsets values to point at the new strip data, so the
  // StripOffsets array contents are also part of that extra pool when it
  // doesn't fit inline.

  type Plan = {
    entry: IfdEntry;
    inlineBytes?: Uint8Array; // bytes used inline (≤4)
    poolBytes?: Uint8Array; // bytes written to extra pool
    isStripOffsets?: boolean;
    isStripByteCounts?: boolean;
  };
  const plans: Plan[] = [];
  // First pass: build plans for non-strip entries by carrying through the
  // original bytes (so we don't have to decode rationals etc).
  for (const e of keep) {
    if (e.tag === 0x0111) {
      // StripOffsets — values get patched after we know new strip positions.
      // Reserve a pool slot of the same size (count × 4 for LONG, count × 2 for SHORT).
      const size = entryDataSize(e);
      const plan: Plan = { entry: e, isStripOffsets: true };
      if (size <= 4) plan.inlineBytes = new Uint8Array(4);
      else plan.poolBytes = new Uint8Array(size);
      plans.push(plan);
    } else if (e.tag === 0x0117) {
      plans.push({ entry: e, isStripByteCounts: true });
    } else {
      const data = readEntryBytes(bytes, e, reader);
      if (data.length <= 4) {
        const inline = new Uint8Array(4);
        inline.set(data, 0);
        plans.push({ entry: e, inlineBytes: inline });
      } else {
        plans.push({ entry: e, poolBytes: data });
      }
    }
  }

  // Compute pool layout. Pool starts at headerSize + ifdSize. Strip data goes
  // after the pool.
  let poolOffset = headerSize + ifdSize;
  const poolChunks: Array<{ offset: number; data: Uint8Array; plan: Plan }> = [];
  for (const plan of plans) {
    if (plan.poolBytes) {
      poolChunks.push({ offset: poolOffset, data: plan.poolBytes, plan });
      poolOffset += plan.poolBytes.length;
      // 2-byte align
      if (poolOffset % 2 === 1) poolOffset += 1;
    } else if (plan.isStripByteCounts) {
      // We'll regenerate this inline-or-pool depending on size after we know strip layout.
    }
  }

  // Strip data is appended after the pool, 2-byte aligned.
  if (poolOffset % 2 === 1) poolOffset += 1;
  const stripStartOffsets: number[] = [];
  let stripCursor = poolOffset;
  for (const s of strips) {
    stripStartOffsets.push(stripCursor);
    stripCursor += s.length;
    if (stripCursor % 2 === 1) stripCursor += 1;
  }

  // Now patch the StripOffsets data with the new offsets, and (re)build
  // StripByteCounts data (it stays the same as the input strip sizes).
  const stripOffsetsPlan = plans.find((p) => p.isStripOffsets);
  const stripByteCountsPlan = plans.find((p) => p.isStripByteCounts);
  if (!stripOffsetsPlan || !stripByteCountsPlan) return null;

  const stripOffsetsType = stripOffsetsPlan.entry.type; // 3 or 4
  const stripByteCountsType = stripByteCountsPlan.entry.type;
  function encodeArray(values: number[], type: number, e: Endian): Uint8Array {
    const sz = type === 3 ? 2 : 4;
    const out = new Uint8Array(values.length * sz);
    if (e === 'LE') {
      for (let i = 0; i < values.length; i += 1) {
        const v = values[i] ?? 0;
        if (sz === 2) {
          out[i * 2] = v & 0xff;
          out[i * 2 + 1] = (v >>> 8) & 0xff;
        } else {
          out[i * 4] = v & 0xff;
          out[i * 4 + 1] = (v >>> 8) & 0xff;
          out[i * 4 + 2] = (v >>> 16) & 0xff;
          out[i * 4 + 3] = (v >>> 24) & 0xff;
        }
      }
    } else {
      for (let i = 0; i < values.length; i += 1) {
        const v = values[i] ?? 0;
        if (sz === 2) {
          out[i * 2] = (v >>> 8) & 0xff;
          out[i * 2 + 1] = v & 0xff;
        } else {
          out[i * 4] = (v >>> 24) & 0xff;
          out[i * 4 + 1] = (v >>> 16) & 0xff;
          out[i * 4 + 2] = (v >>> 8) & 0xff;
          out[i * 4 + 3] = v & 0xff;
        }
      }
    }
    return out;
  }
  const newStripOffsetBytes = encodeArray(stripStartOffsets, stripOffsetsType, endian);
  if (stripOffsetsPlan.poolBytes) {
    // Replace pool slot — find it and substitute. Since we reserved bytes of the
    // same length, length matches.
    const slot = poolChunks.find((c) => c.plan === stripOffsetsPlan);
    if (!slot) return null;
    if (slot.data.length !== newStripOffsetBytes.length) return null;
    slot.data = newStripOffsetBytes;
    stripOffsetsPlan.poolBytes = newStripOffsetBytes;
  } else if (stripOffsetsPlan.inlineBytes) {
    // Single strip — fits inline in 4 bytes (uint32) when stripOffsetsType=4.
    if (newStripOffsetBytes.length > 4) return null;
    const inline = new Uint8Array(4);
    inline.set(newStripOffsetBytes, 0);
    stripOffsetsPlan.inlineBytes = inline;
  }

  // StripByteCounts: just re-encode from the strips array (which is the
  // original sizes).
  const newStripByteCountsBytes = encodeArray(
    strips.map((s) => s.length),
    stripByteCountsType,
    endian,
  );
  if (newStripByteCountsBytes.length <= 4) {
    const inline = new Uint8Array(4);
    inline.set(newStripByteCountsBytes, 0);
    stripByteCountsPlan.inlineBytes = inline;
  } else {
    stripByteCountsPlan.poolBytes = newStripByteCountsBytes;
    poolChunks.push({
      offset: poolOffset,
      data: newStripByteCountsBytes,
      plan: stripByteCountsPlan,
    });
    poolOffset += newStripByteCountsBytes.length;
    if (poolOffset % 2 === 1) poolOffset += 1;
    // Recompute strip start offsets — they shift because the pool grew.
    stripStartOffsets.length = 0;
    let cur = poolOffset;
    for (const s of strips) {
      stripStartOffsets.push(cur);
      cur += s.length;
      if (cur % 2 === 1) cur += 1;
    }
    const repatched = encodeArray(stripStartOffsets, stripOffsetsType, endian);
    if (stripOffsetsPlan.poolBytes) {
      const slot = poolChunks.find((c) => c.plan === stripOffsetsPlan);
      if (!slot) return null;
      if (slot.data.length !== repatched.length) return null;
      slot.data = repatched;
      stripOffsetsPlan.poolBytes = repatched;
    } else if (stripOffsetsPlan.inlineBytes) {
      if (repatched.length > 4) return null;
      const inline = new Uint8Array(4);
      inline.set(repatched, 0);
      stripOffsetsPlan.inlineBytes = inline;
    }
    stripCursor = poolOffset + strips.reduce((acc, s) => acc + s.length + (s.length % 2), 0);
  }

  // Total file size = stripCursor (which is now the end of last strip + padding).
  // Recompute it cleanly.
  const finalEnd = (() => {
    let cur = poolOffset;
    for (const s of strips) {
      cur += s.length;
      if (cur % 2 === 1) cur += 1;
    }
    return cur;
  })();

  const out = new Uint8Array(finalEnd);
  // Write header.
  if (endian === 'LE') out.set(TIFF_LE, 0);
  else out.set(TIFF_BE, 0);
  const writeU16 = (off: number, v: number): void => {
    if (endian === 'LE') {
      out[off] = v & 0xff;
      out[off + 1] = (v >>> 8) & 0xff;
    } else {
      out[off] = (v >>> 8) & 0xff;
      out[off + 1] = v & 0xff;
    }
  };
  const writeU32 = (off: number, v: number): void => {
    if (endian === 'LE') {
      out[off] = v & 0xff;
      out[off + 1] = (v >>> 8) & 0xff;
      out[off + 2] = (v >>> 16) & 0xff;
      out[off + 3] = (v >>> 24) & 0xff;
    } else {
      out[off] = (v >>> 24) & 0xff;
      out[off + 1] = (v >>> 16) & 0xff;
      out[off + 2] = (v >>> 8) & 0xff;
      out[off + 3] = v & 0xff;
    }
  };
  writeU32(4, headerSize);

  // Sort plans by tag — IFD entries MUST be sorted ascending.
  plans.sort((a, b) => a.entry.tag - b.entry.tag);

  // Write IFD entries.
  writeU16(headerSize, plans.length);
  let cursor = headerSize + 2;
  for (const plan of plans) {
    writeU16(cursor, plan.entry.tag);
    writeU16(cursor + 2, plan.entry.type);
    writeU32(cursor + 4, plan.entry.count);
    if (plan.inlineBytes) {
      out.set(plan.inlineBytes, cursor + 8);
    } else {
      const slot = poolChunks.find((c) => c.plan === plan);
      if (!slot) return null;
      writeU32(cursor + 8, slot.offset);
    }
    cursor += 12;
  }
  // Next-IFD offset = 0.
  writeU32(cursor, 0);

  // Write pool.
  for (const slot of poolChunks) {
    out.set(slot.data, slot.offset);
  }
  // Write strips.
  let stripWrite = poolOffset;
  for (const s of strips) {
    out.set(s, stripWrite);
    stripWrite += s.length;
    if (stripWrite % 2 === 1) {
      out[stripWrite] = 0;
      stripWrite += 1;
    }
  }
  return out;
}

function readShort(e: IfdEntry, reader: Reader, bytes: Uint8Array): number {
  // SHORT type (3): first 2 bytes of the value slot.
  if (e.type === 3) {
    if (entryDataSize(e) <= 4) {
      // first short
      const slotBytes = readEntryBytes(bytes, e, reader);
      return ((slotBytes[0] ?? 0) | ((slotBytes[1] ?? 0) << 8)) >>> 0;
    }
    const data = readEntryBytes(bytes, e, reader);
    if (reader.endian === 'LE') return ((data[0] ?? 0) | ((data[1] ?? 0) << 8)) >>> 0;
    return (((data[0] ?? 0) << 8) | (data[1] ?? 0)) >>> 0;
  }
  // LONG fallback
  if (e.type === 4) {
    const slotBytes = readEntryBytes(bytes, e, reader);
    if (reader.endian === 'LE') {
      return (
        ((slotBytes[0] ?? 0) |
          ((slotBytes[1] ?? 0) << 8) |
          ((slotBytes[2] ?? 0) << 16) |
          ((slotBytes[3] ?? 0) << 24)) >>>
        0
      );
    }
    return (
      (((slotBytes[0] ?? 0) << 24) |
        ((slotBytes[1] ?? 0) << 16) |
        ((slotBytes[2] ?? 0) << 8) |
        (slotBytes[3] ?? 0)) >>>
      0
    );
  }
  return 0;
}

function readArray(e: IfdEntry, reader: Reader, bytes: Uint8Array): number[] {
  const data = readEntryBytes(bytes, e, reader);
  const result: number[] = [];
  const sz = TYPE_SIZES[e.type] ?? 1;
  for (let i = 0; i < e.count; i += 1) {
    const off = i * sz;
    if (e.type === 3) {
      result.push(
        reader.endian === 'LE'
          ? ((data[off] ?? 0) | ((data[off + 1] ?? 0) << 8)) >>> 0
          : (((data[off] ?? 0) << 8) | (data[off + 1] ?? 0)) >>> 0,
      );
    } else if (e.type === 4) {
      result.push(
        reader.endian === 'LE'
          ? ((data[off] ?? 0) |
              ((data[off + 1] ?? 0) << 8) |
              ((data[off + 2] ?? 0) << 16) |
              ((data[off + 3] ?? 0) << 24)) >>>
              0
          : (((data[off] ?? 0) << 24) |
              ((data[off + 1] ?? 0) << 16) |
              ((data[off + 2] ?? 0) << 8) |
              (data[off + 3] ?? 0)) >>>
              0,
      );
    }
  }
  return result;
}

async function scrubTiff(bytes: Uint8Array, options: ScrubOptions): Promise<Uint8Array> {
  const resolved = resolveScrub(options);
  // 'gps-only' on TIFF would require touching the GPS IFD pointer — out of
  // scope for the v0.1 safe rewrite path. Fall back to a parse-only error so
  // we never silently corrupt the file.
  if (resolved.preset === 'gps-only') {
    throw new MetaScrubError(
      'SCRUB_ERROR',
      'TIFF gps-only scrubbing is not supported in v0.1 (GPS IFD rewriting required).',
      { format: 'tiff' },
    );
  }
  const rebuilt = rebuildBaselineTiff(bytes, { keepOrientation: true });
  if (!rebuilt) {
    throw new MetaScrubError(
      'SCRUB_ERROR',
      'TIFF too complex to scrub safely in v0.1 (multi-IFD, tiled, or unsupported compression).',
      { format: 'tiff' },
    );
  }
  return rebuilt;
}

export const tiffParser: FormatParser = {
  format: 'tiff',
  extensions: ['.tif', '.tiff'],
  mimeTypes: ['image/tiff'],
  matches: (b) => startsWith(b, TIFF_LE) || startsWith(b, TIFF_BE),
  parse: parseTiff,
  scrub: scrubTiff,
};
