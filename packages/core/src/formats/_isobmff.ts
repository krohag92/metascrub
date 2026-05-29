// ISOBMFF (ISO Base Media File Format) shared helpers.
//
// Used by MP4, MOV, M4A, HEIC, etc. — all share the same box-based container
// structure.
//
// Box header:
//   - 4-byte BE size (includes header). If size == 1, next 8 bytes are 64-bit
//     large size. If size == 0, box extends to end of file.
//   - 4-byte type (FOURCC).
//
// Container boxes (recursive): moov, trak, edts, mdia, minf, dinf, stbl, udta,
// meta (NB: ISOBMFF `meta` has a 4-byte version+flags after the header; Apple-
// style `meta` inside `udta` does NOT — we handle both), ilst, and Apple
// per-item boxes like `©nam`.
//
// Leaf metadata atoms inside Apple ilst: each item box (e.g. `©nam`) contains a
// `data` child box with: 4-byte type-indicator + 4-byte locale-indicator +
// value bytes (typically UTF-8 for type 1).
//
// QuickTime `©xyz` (location) is an `udta` direct child (not under ilst): its
// payload is a 2-byte length + 2-byte language + ASCII text like
// "+37.7749-122.4194/".

import { readUInt32BE, writeUInt32BE, concatBytes, latin1Decoder } from '../utils/bytes.js';

export type Box = {
  /** Total box size (including header). 0 = to-EOF; we expand to actual length. */
  size: number;
  /** ASCII 4-char box type. */
  type: string;
  /** Offset of the start of this box in the source buffer. */
  start: number;
  /** Offset just past this box. */
  end: number;
  /** Offset of the start of the payload (after size+type, including largesize if present). */
  payloadStart: number;
  /** Header length (8 or 16 with largesize). */
  headerSize: number;
};

export const CONTAINER_BOXES = new Set([
  'moov',
  'trak',
  'edts',
  'mdia',
  'minf',
  'dinf',
  'stbl',
  'udta',
  'ilst',
  'moof',
  'traf',
  'mvex',
]);

/** Read box headers at the given level (no recursion). */
export function readBoxes(bytes: Uint8Array, start: number, end: number): Box[] {
  const out: Box[] = [];
  let i = start;
  while (i + 8 <= end) {
    const rawSize = readUInt32BE(bytes, i);
    const type = latin1Decoder.decode(bytes.subarray(i + 4, i + 8));
    let size = rawSize >>> 0;
    let headerSize = 8;
    if (size === 1) {
      // 64-bit large size — we only support files within 2^53.
      if (i + 16 > end) throw new Error(`Truncated ISOBMFF largesize at offset ${i}`);
      const hi = readUInt32BE(bytes, i + 8) >>> 0;
      const lo = readUInt32BE(bytes, i + 12) >>> 0;
      if (hi > 0x1fffff) {
        throw new Error('ISOBMFF box larger than 2^53 bytes is not supported');
      }
      size = hi * 0x100000000 + lo;
      headerSize = 16;
    } else if (size === 0) {
      // extends to end
      size = end - i;
    }
    if (size < headerSize || i + size > end) {
      throw new Error(`Corrupt ISOBMFF box ${type} at offset ${i} (size=${size})`);
    }
    out.push({
      size,
      type,
      start: i,
      end: i + size,
      payloadStart: i + headerSize,
      headerSize,
    });
    i += size;
  }
  return out;
}

/** Find the first child box of a given type. */
export function findChild(bytes: Uint8Array, parent: Box, type: string): Box | undefined {
  const children = readBoxes(bytes, parent.payloadStart, parent.end);
  return children.find((c) => c.type === type);
}

/**
 * Read an Apple-style `meta` box's children. ISOBMFF spec says `meta` is a
 * FullBox (4-byte version+flags before children). Apple's QuickTime `meta`
 * inside `udta` sometimes omits that prefix. We probe both layouts.
 */
export function readMetaChildren(bytes: Uint8Array, meta: Box): Box[] {
  const known = new Set(['hdlr', 'ilst', 'keys', 'ID32', 'pitm', 'iloc', 'iinf', 'iref']);
  const tryAt = (off: number): Box[] | null => {
    try {
      const boxes = readBoxes(bytes, off, meta.end);
      if (boxes.length === 0) return null;
      // Prefer the layout that produces a known child type.
      if (boxes.some((b) => known.has(b.type))) return boxes;
      return null;
    } catch {
      return null;
    }
  };
  const iso = tryAt(meta.payloadStart + 4);
  if (iso) return iso;
  const apple = tryAt(meta.payloadStart);
  if (apple) return apple;
  // Fall back to whatever readBoxes returns (may be empty).
  try {
    return readBoxes(bytes, meta.payloadStart + 4, meta.end);
  } catch {
    return [];
  }
}

/**
 * Walk Apple ilst items. Each child box of `ilst` is an item with a 4-char
 * type (e.g. `©nam`, `©ART`, `©day`, `©cmt`, `©too`). Inside is a `data` box:
 *   [4-byte type-indicator][4-byte locale][value bytes]
 * Type-indicator 1 = UTF-8; 21/22 = BE signed/unsigned int.
 */
export function readIlstItems(bytes: Uint8Array, ilst: Box): Array<{ key: string; value: string }> {
  const out: Array<{ key: string; value: string }> = [];
  const items = readBoxes(bytes, ilst.payloadStart, ilst.end);
  for (const item of items) {
    const data = findChild(bytes, item, 'data');
    if (!data) continue;
    const valueStart = data.payloadStart + 8;
    if (valueStart > data.end) continue;
    const typeIndicator = readUInt32BE(bytes, data.payloadStart);
    const raw = bytes.subarray(valueStart, data.end);
    let value: string;
    if (typeIndicator === 1) {
      value = new TextDecoder('utf-8', { fatal: false }).decode(raw);
    } else if (typeIndicator === 21 || typeIndicator === 22) {
      let n = 0;
      for (let i = 0; i < raw.length; i += 1) n = (n << 8) | (raw[i] ?? 0);
      value = String(n);
    } else {
      value = `<${raw.length} bytes>`;
    }
    out.push({ key: item.type, value });
  }
  return out;
}

/** Decode an Apple `©xyz` direct-udta child (location string).
 *  Layout: [2-byte text-length BE][2-byte language code][ASCII chars]. */
export function decodeUdtaText(bytes: Uint8Array, box: Box): string | null {
  if (box.end - box.payloadStart < 4) return null;
  const len = (bytes[box.payloadStart]! << 8) | bytes[box.payloadStart + 1]!;
  const textStart = box.payloadStart + 4;
  if (textStart + len > box.end) return null;
  return new TextDecoder('utf-8', { fatal: false }).decode(
    bytes.subarray(textStart, textStart + len),
  );
}

/**
 * Build a 32-bit-sized box from type + payload. Throws if total exceeds 32-bit.
 */
export function rebuildBox(type: string, payload: Uint8Array): Uint8Array {
  const total = 8 + payload.length;
  if (total > 0xffffffff) {
    throw new Error(`Cannot rebuild box ${type}: size exceeds 32-bit limit`);
  }
  const out = new Uint8Array(total);
  writeUInt32BE(out, 0, total);
  for (let i = 0; i < 4; i += 1) out[4 + i] = type.charCodeAt(i) & 0xff;
  out.set(payload, 8);
  return out;
}

/**
 * Walk top-level boxes and rebuild without the `udta` child of `moov` (and
 * also drop any top-level `udta`). Returns a fresh Uint8Array.
 *
 * NB: `mdat` is referenced by absolute file offsets from `stco`/`co64` entries
 * inside `stbl`. If we shrink `moov` (which usually sits before `mdat`), those
 * offsets become wrong. To avoid that, we replace the removed `udta` with a
 * `free` box of identical size, preserving `moov`'s byte layout. This is the
 * standard ISOBMFF technique used by editors like AtomicParsley.
 */
export function scrubMoovUdta(bytes: Uint8Array): Uint8Array {
  const top = readBoxes(bytes, 0, bytes.length);
  const out: Uint8Array[] = [];
  for (const box of top) {
    if (box.type === 'moov') {
      out.push(rebuildMoovWithoutUdta(bytes, box));
    } else if (box.type === 'udta') {
      // Top-level udta (rare) — drop.
      continue;
    } else {
      out.push(bytes.subarray(box.start, box.end));
    }
  }
  return concatBytes(out);
}

function rebuildMoovWithoutUdta(bytes: Uint8Array, moov: Box): Uint8Array {
  const children = readBoxes(bytes, moov.payloadStart, moov.end);
  const newChildren: Uint8Array[] = [];
  let freeSpace = 0;
  for (const c of children) {
    if (c.type === 'udta') {
      freeSpace += c.size;
      continue;
    }
    newChildren.push(bytes.subarray(c.start, c.end));
  }
  if (freeSpace > 0) {
    if (freeSpace < 8) {
      throw new Error('udta box smaller than 8 bytes is impossible');
    }
    // Replace removed udta with a `free` box of identical total size.
    const freeBox = new Uint8Array(freeSpace);
    writeUInt32BE(freeBox, 0, freeSpace);
    freeBox[4] = 0x66; // 'f'
    freeBox[5] = 0x72; // 'r'
    freeBox[6] = 0x65; // 'e'
    freeBox[7] = 0x65; // 'e'
    newChildren.push(freeBox);
  }
  let payloadLen = 0;
  for (const c of newChildren) payloadLen += c.length;
  const payload = new Uint8Array(payloadLen);
  let off = 0;
  for (const c of newChildren) {
    payload.set(c, off);
    off += c.length;
  }
  const expectedSize = moov.size;
  const actualSize = 8 + payload.length;
  if (actualSize !== expectedSize) {
    throw new Error(
      `Internal error: moov rebuild size mismatch (expected ${expectedSize}, got ${actualSize})`,
    );
  }
  return rebuildBox('moov', payload);
}

/** Detect ftyp brand. Returns null if no ftyp at offset 0. */
export function readFtypBrand(bytes: Uint8Array): string | null {
  if (bytes.length < 12) return null;
  const type = latin1Decoder.decode(bytes.subarray(4, 8));
  if (type !== 'ftyp') return null;
  return latin1Decoder.decode(bytes.subarray(8, 12));
}
