// EBML / Matroska shared helpers.
//
// EBML elements:
//   - element ID: variable-length integer (VINT). The first byte's leading
//     zeros + the marker bit indicate the length-of-length (1..8). The full
//     bytes including the marker bit are the ID.
//   - element size: VINT. Unlike the ID, the marker bit is stripped from the
//     value. All-ones value = "unknown size" (extends to next sibling).
//
// Matroska element IDs we care about (from the spec):
//   EBML header        0x1A45DFA3 (segment of the file header)
//   DocType            0x4282
//   Segment            0x18538067
//   Info               0x1549A966
//   Title              0x7BA9
//   MuxingApp          0x4D80
//   WritingApp         0x5741
//   DateUTC            0x4461
//   Tags               0x1254C367
//   Tag                0x7373
//   SimpleTag          0x67C8
//   TagName            0x45A3
//   TagString          0x4487
//
// We use a small byte-level walker rather than `ebml-iterator` because the
// library doesn't support writing, and our scrub needs to splice elements
// out of the stream. A custom walker also keeps the bundle small.

import { concatBytes, latin1Decoder } from '../utils/bytes.js';

export const ID = {
  EBML: 0x1a45dfa3,
  DocType: 0x4282,
  Segment: 0x18538067,
  SeekHead: 0x114d9b74,
  Info: 0x1549a966,
  Title: 0x7ba9,
  MuxingApp: 0x4d80,
  WritingApp: 0x5741,
  DateUTC: 0x4461,
  Tags: 0x1254c367,
  Tag: 0x7373,
  SimpleTag: 0x67c8,
  TagName: 0x45a3,
  TagString: 0x4487,
  Targets: 0x63c0,
  Cluster: 0x1f43b675,
  Tracks: 0x1654ae6b,
} as const;

/** Decode a variable-length integer at offset. Returns { value, length, includesMarker }.
 *  `includesMarker = true` returns the value with the length-marker bit kept (used for IDs).
 *  When `includesMarker = false` (used for sizes), the marker bit is stripped.
 *  Returns null if the VINT is malformed or extends past `end`.
 */
export function readVint(
  bytes: Uint8Array,
  offset: number,
  end: number,
  includesMarker: boolean,
): { value: number; length: number } | null {
  if (offset >= end) return null;
  const first = bytes[offset]!;
  if (first === 0) return null; // 9-byte VINT not supported (>2^49)
  let length = 0;
  for (let i = 7; i >= 0; i -= 1) {
    if ((first & (1 << i)) !== 0) {
      length = 8 - i;
      break;
    }
  }
  if (length < 1 || length > 8) return null;
  if (offset + length > end) return null;
  let value: number;
  if (includesMarker) {
    value = first;
  } else {
    value = first & ((1 << (8 - length)) - 1);
  }
  for (let i = 1; i < length; i += 1) {
    if (value > Number.MAX_SAFE_INTEGER / 256) return null;
    value = value * 256 + bytes[offset + i]!;
  }
  return { value, length };
}

/** Encode a VINT for sizes (data length). Picks the smallest valid encoding. */
export function encodeVintSize(value: number): Uint8Array {
  if (value < 0) throw new Error('Negative VINT size');
  // Reserved "unknown size" value per length: all ones in the data bits.
  // We must not accidentally emit that, so check against (2^(7L) - 1) - 1.
  for (let length = 1; length <= 8; length += 1) {
    const max = Math.pow(2, 7 * length) - 1; // max representable value (== "unknown")
    if (value < max) {
      const out = new Uint8Array(length);
      out[0] = (1 << (8 - length)) | ((value / Math.pow(2, 8 * (length - 1))) & 0xff);
      let remaining = value;
      // Set marker bit on the first byte; we already did that. Now overwrite
      // the low 7 - (length-1)*8 bits of the first byte with the high bits of
      // value, but actually we already set them via the OR above. Recompute
      // cleanly:
      const headerByte = 1 << (8 - length);
      const highBits = Math.floor(value / Math.pow(2, 8 * (length - 1)));
      out[0] = (headerByte | highBits) & 0xff;
      remaining = value - highBits * Math.pow(2, 8 * (length - 1));
      for (let i = length - 1; i >= 1; i -= 1) {
        const div = Math.pow(2, 8 * (i - 1));
        const byte = Math.floor(remaining / div);
        out[length - i] = byte & 0xff;
        remaining -= byte * div;
      }
      return out;
    }
  }
  throw new Error(`VINT size ${value} too large to encode`);
}

/** Encode an element ID — must be emitted verbatim (it's already a VINT). */
export function encodeId(id: number): Uint8Array {
  // Determine byte length by the topmost set bit.
  let length = 1;
  if (id >= 0x100000000) length = 8;
  else if (id >= 0x1000000) length = 4;
  else if (id >= 0x10000) length = 3;
  else if (id >= 0x100) length = 2;
  // For IDs we need to emit the canonical byte sequence (the marker bit is
  // already included in the value). E.g. 0x1A45DFA3 = 4 bytes.
  const out = new Uint8Array(length);
  let v = id;
  for (let i = length - 1; i >= 0; i -= 1) {
    out[i] = v & 0xff;
    v = Math.floor(v / 256);
  }
  return out;
}

export type EbmlElement = {
  id: number;
  /** Offset of the start of the element header (ID byte). */
  start: number;
  /** Offset just past the element. */
  end: number;
  /** Offset of the payload (after ID + size). */
  payloadStart: number;
  /** Payload length in bytes. */
  payloadLength: number;
  /** True if the element has "unknown size" (extends until next sibling or EOF). */
  unknownSize: boolean;
};

/**
 * Walk EBML elements at one level. Reads from `start` until either `end`,
 * EOF, or an unknown-size parent boundary.
 */
export function readElements(bytes: Uint8Array, start: number, end: number): EbmlElement[] {
  const out: EbmlElement[] = [];
  let i = start;
  while (i < end) {
    const idRead = readVint(bytes, i, end, true);
    if (!idRead) break;
    const sizeRead = readVint(bytes, i + idRead.length, end, false);
    if (!sizeRead) break;
    const headerLen = idRead.length + sizeRead.length;
    const payloadStart = i + headerLen;
    // Detect unknown-size: VINT with all data bits set.
    const maxForLen = Math.pow(2, 7 * sizeRead.length) - 1;
    const unknownSize = sizeRead.value === maxForLen;
    let elementEnd: number;
    if (unknownSize) {
      // For our purposes (top-level Segment), unknown size = to EOF.
      elementEnd = end;
    } else {
      elementEnd = payloadStart + sizeRead.value;
      if (elementEnd > end) break;
    }
    out.push({
      id: idRead.value,
      start: i,
      end: elementEnd,
      payloadStart,
      payloadLength: elementEnd - payloadStart,
      unknownSize,
    });
    i = elementEnd;
    if (unknownSize) break;
  }
  return out;
}

/** Find first child element matching `id` at one level. */
export function findChildElement(
  bytes: Uint8Array,
  parent: EbmlElement,
  id: number,
): EbmlElement | undefined {
  return readElements(bytes, parent.payloadStart, parent.end).find((e) => e.id === id);
}

/** Find all child elements matching `id` at one level. */
export function findAllChildElements(
  bytes: Uint8Array,
  parent: EbmlElement,
  id: number,
): EbmlElement[] {
  return readElements(bytes, parent.payloadStart, parent.end).filter((e) => e.id === id);
}

/** Read an EBML UTF-8 string payload, trimming trailing null bytes. */
export function readString(bytes: Uint8Array, elem: EbmlElement): string {
  let len = elem.payloadLength;
  while (len > 0 && bytes[elem.payloadStart + len - 1] === 0) len -= 1;
  return new TextDecoder('utf-8', { fatal: false }).decode(
    bytes.subarray(elem.payloadStart, elem.payloadStart + len),
  );
}

/**
 * Build an EBML element from id + payload, choosing the minimal VINT size.
 */
export function buildElement(id: number, payload: Uint8Array): Uint8Array {
  const idBytes = encodeId(id);
  const sizeBytes = encodeVintSize(payload.length);
  return concatBytes([idBytes, sizeBytes, payload]);
}

void latin1Decoder;
