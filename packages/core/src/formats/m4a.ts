// M4A (ISOBMFF / MP4-derived audio) parser.
//
// File layout: a tree of "boxes" (a.k.a. atoms). Each box header is:
//   size (u32 BE) + type (4 ASCII bytes)
//   If size == 1: an extended size (u64 BE) follows the type.
//   If size == 0: the box extends to end of file.
//
// Metadata lives in: moov > udta > meta > ilst, where ilst's children are
// iTunes-style atoms like ©nam (title), ©ART (artist), ©day (year),
// ©cmt (comment), aART (album artist), trkn (track), covr (cover art).
//
// Scrub strategy: rewrite the file with the `moov.udta` sub-box dropped. We
// then need to fix up the size of `moov` (and any boxes containing it — for
// audio M4A there typically isn't one above `moov`; the root is implicit).
//
// We *don't* touch `stco`/`co64` offsets because we're removing a box from
// `moov`, not from `mdat`. If `mdat` lives *after* `moov` (the common
// progressive-download layout for QuickTime), then yes, mdat offsets in stco
// shift. To stay correct we adjust stco/co64 entries by the delta we removed.

import type { FormatParser, MetadataField, ScrubOptions } from '../types.js';
import {
  latin1Decoder,
  readUInt32BE,
  writeUInt32BE,
  concatBytes,
  textDecoder,
} from '../utils/bytes.js';
import { resolveScrub } from '../presets.js';
import { commonToFields, nativeToFields, parseWithMusicMetadata } from './_audio.js';

type Box = {
  /** Box type as 4-char ASCII. */
  type: string;
  /** Absolute offset of the box (its size field) within the source. */
  offset: number;
  /** Total length in bytes including header. */
  size: number;
  /** Length of header (8 normally, 16 if 64-bit size). */
  headerLen: number;
  /** Raw body bytes (size minus header). */
  body: Uint8Array;
};

function readBoxes(bytes: Uint8Array, start: number, end: number): Box[] {
  const out: Box[] = [];
  let i = start;
  while (i + 8 <= end) {
    let size = readUInt32BE(bytes, i) >>> 0;
    const type = latin1Decoder.decode(bytes.subarray(i + 4, i + 8));
    let headerLen = 8;
    if (size === 1) {
      if (i + 16 > end) break;
      // 64-bit large size. We only support sizes within the safe-integer range.
      const hi = readUInt32BE(bytes, i + 8) >>> 0;
      const lo = readUInt32BE(bytes, i + 12) >>> 0;
      size = hi * 0x100000000 + lo;
      headerLen = 16;
    } else if (size === 0) {
      // Box extends to end.
      size = end - i;
    }
    if (size < headerLen || i + size > end) break;
    const body = bytes.subarray(i + headerLen, i + size);
    out.push({ type, offset: i, size, headerLen, body });
    i += size;
  }
  return out;
}

const PRINTABLE_TYPE_RE = /^[\x20-\x7e]{4}$/;

function isMatchingFtyp(b: Uint8Array): boolean {
  if (b.length < 12) return false;
  // size (4) + "ftyp" (4) at offset 0..7? No — ftyp begins at offset 4 in our
  // brand check: the file starts with size(u32) + "ftyp" + major_brand(4).
  if (
    b[4] !== 0x66 || // f
    b[5] !== 0x74 || // t
    b[6] !== 0x79 || // y
    b[7] !== 0x70 // p
  ) {
    return false;
  }
  const brand = latin1Decoder.decode(b.subarray(8, 12));
  // We accept the common audio brands as well as the generic ones — disambig
  // between mp4/m4a from extension or context happens upstream.
  return (
    brand === 'M4A ' ||
    brand === 'mp42' ||
    brand === 'mp41' ||
    brand === 'isom' ||
    brand === 'iso2' ||
    brand === 'isml' ||
    brand === 'M4B ' ||
    brand === 'M4P '
  );
}

const ILST_LABELS: Record<string, string> = {
  '©nam': 'title',
  '©ART': 'artist',
  '©alb': 'album',
  '©day': 'date',
  '©cmt': 'comment',
  '©gen': 'genre',
  '©too': 'encoder',
  '©wrt': 'composer',
  '©lyr': 'lyrics',
  aART: 'albumartist',
  cprt: 'copyright',
  trkn: 'track',
  disk: 'disc',
  gnre: 'genre',
  covr: 'cover',
};

const ILST_SENSITIVE = new Set(['©ART', '©cmt', '©too', '©wrt', '©lyr', 'aART', 'cprt', 'covr']);

function parseIlst(body: Uint8Array): MetadataField[] {
  // Each child is a box whose body contains a "data" sub-box.
  const fields: MetadataField[] = [];
  const items = readBoxes(body, 0, body.length);
  for (const item of items) {
    if (!PRINTABLE_TYPE_RE.test(item.type) && !/^[©][a-zA-Z0-9]{3}$/.test(item.type)) {
      continue;
    }
    const children = readBoxes(item.body, 0, item.body.length);
    let value: string | number | null = null;
    for (const child of children) {
      if (child.type === 'data') {
        // data box body: 4-byte type indicator + 4-byte locale + payload.
        if (child.body.length < 8) continue;
        const dataType = readUInt32BE(child.body, 0) & 0x00ffffff; // low 24 bits
        const payload = child.body.subarray(8);
        if (dataType === 1) {
          value = textDecoder.decode(payload);
        } else if (dataType === 0 || dataType === 21 || dataType === 22) {
          // Binary number — for trkn/disk it's 0x00 0x00 + track + total + ...
          if (payload.length >= 4) {
            value = payload.length >= 6 ? readUInt32BE(payload, 2) : (payload[1] ?? 0);
          }
        } else if (dataType === 13 || dataType === 14) {
          // covr (JPEG/PNG bytes) — surface presence only
          value = `<${payload.length} bytes>`;
        } else {
          value = `<type ${dataType}>`;
        }
        break;
      }
    }
    if (value === null) continue;
    fields.push({
      key: item.type,
      label: ILST_LABELS[item.type],
      value,
      sensitive: ILST_SENSITIVE.has(item.type),
    });
  }
  return fields;
}

function findChild(parent: Box[], type: string): Box | undefined {
  return parent.find((b) => b.type === type);
}

function matchesM4a(b: Uint8Array): boolean {
  return isMatchingFtyp(b);
}

async function parseM4a(bytes: Uint8Array): Promise<{ groups: Record<string, MetadataField[]> }> {
  const groups: Record<string, MetadataField[]> = {};
  let topBoxes: Box[] = [];
  try {
    topBoxes = readBoxes(bytes, 0, bytes.length);
  } catch {
    topBoxes = [];
  }
  const moov = findChild(topBoxes, 'moov');
  if (moov) {
    const moovChildren = readBoxes(moov.body, 0, moov.body.length);
    const udta = findChild(moovChildren, 'udta');
    if (udta) {
      const udtaChildren = readBoxes(udta.body, 0, udta.body.length);
      const meta = findChild(udtaChildren, 'meta');
      if (meta) {
        // meta has a 4-byte version/flags header before its child boxes.
        const metaBody = meta.body.length >= 4 ? meta.body.subarray(4) : meta.body;
        const metaChildren = readBoxes(metaBody, 0, metaBody.length);
        const ilst = findChild(metaChildren, 'ilst');
        if (ilst) {
          const fields = parseIlst(ilst.body);
          if (fields.length) groups['M4A.ilst'] = fields;
        }
      }
    }
  }

  const parsed = await parseWithMusicMetadata(bytes, 'audio/mp4');
  if (parsed) {
    const common = commonToFields(parsed.common as unknown as Record<string, unknown>);
    if (common.length) groups['Audio.common'] = common;
    for (const [tagNs, tagList] of Object.entries(parsed.native ?? {})) {
      if (!Array.isArray(tagList) || tagList.length === 0) continue;
      // Skip iTunes — we already exposed it above.
      if (tagNs.toLowerCase().includes('itunes') || tagNs.toLowerCase().includes('mp4')) continue;
      const fields = nativeToFields(tagList as Array<{ id: string; value: unknown }>);
      if (fields.length) groups[`M4A.${tagNs}`] = fields;
    }
  }

  return { groups };
}

/**
 * Drop the `moov.udta` sub-box and rewrite parent sizes.
 *
 * If the file uses a 64-bit largesize header for any ancestor box we still
 * write back a 32-bit header when the new size fits, but we preserve the
 * existing header length to avoid shifting downstream offsets. Net effect on
 * mdat-offset-bearing tables: every byte removed from inside `moov` reduces
 * the start of `mdat` (if mdat is after moov) by the same amount, so we walk
 * `stco`/`co64` and adjust each entry.
 */
async function scrubM4a(bytes: Uint8Array, options: ScrubOptions): Promise<Uint8Array> {
  const resolved = resolveScrub(options);
  const strip =
    resolved.preset === 'all' ||
    resolved.preset === 'personal-only' ||
    resolved.preset === 'keep-technical' ||
    (resolved.preset === 'custom' &&
      resolved.remove.some((p) => p === 'M4A.*' || p.startsWith('M4A.')));
  if (!strip) return bytes;

  const topBoxes = readBoxes(bytes, 0, bytes.length);
  const moov = findChild(topBoxes, 'moov');
  if (!moov) return bytes;

  const moovChildren = readBoxes(moov.body, 0, moov.body.length);
  const udta = findChild(moovChildren, 'udta');
  if (!udta) return bytes; // nothing to do

  const removedBytes = udta.size;

  // Decide whether to shift mdat offsets: only when mdat comes *after* moov
  // in the file *and* udta is inside moov (which it is). The udta byte range
  // is [udta.offset, udta.offset + udta.size). Anything currently at or after
  // udta.offset + udta.size will move down by `removedBytes`.
  const udtaAbsStart = moov.offset + moov.headerLen + (udta.offset - 0);
  // udta.offset above is *relative to moov.body* (we passed moov.body slice
  // into readBoxes). The absolute offset of udta within the source buffer is:
  //   moov.offset + moov.headerLen + udta.offset
  const udtaAbsEnd = udtaAbsStart + udta.size;

  // Build new moov body by splicing out udta.
  const newMoovBody = concatBytes([
    moov.body.subarray(0, udta.offset),
    moov.body.subarray(udta.offset + udta.size),
  ]);

  // Update stco/co64 entries inside the new moov body. We need to do this on
  // newMoovBody since udta has just been removed. For every chunk-offset entry
  // pointing at >= udtaAbsEnd, subtract removedBytes.
  adjustChunkOffsetsInMoov(newMoovBody, removedBytes, udtaAbsEnd);

  // Rewrite moov size (header).
  const newMoovSize = moov.headerLen + newMoovBody.length;
  const newMoovHeader = new Uint8Array(moov.headerLen);
  // Always rewrite a 32-bit header if it fits; otherwise preserve 64-bit.
  if (moov.headerLen === 8 && newMoovSize <= 0xffffffff) {
    writeUInt32BE(newMoovHeader, 0, newMoovSize);
    newMoovHeader[4] = 0x6d; // 'm'
    newMoovHeader[5] = 0x6f;
    newMoovHeader[6] = 0x6f;
    newMoovHeader[7] = 0x76;
  } else if (moov.headerLen === 16) {
    writeUInt32BE(newMoovHeader, 0, 1);
    newMoovHeader[4] = 0x6d;
    newMoovHeader[5] = 0x6f;
    newMoovHeader[6] = 0x6f;
    newMoovHeader[7] = 0x76;
    const hi = Math.floor(newMoovSize / 0x100000000);
    const lo = newMoovSize >>> 0;
    writeUInt32BE(newMoovHeader, 8, hi);
    writeUInt32BE(newMoovHeader, 12, lo);
  } else {
    // size > 4GB but originally 32-bit — would need to upgrade header. Bail.
    return bytes;
  }

  // Build the final byte stream by replacing the moov box in place.
  const before = bytes.subarray(0, moov.offset);
  const after = bytes.subarray(moov.offset + moov.size);
  return concatBytes([before, newMoovHeader, newMoovBody, after]);
}

/**
 * Walk into stco/co64 boxes inside `moovBody` and shift every chunk-offset
 * that points at >= `threshold` down by `delta`.
 */
function adjustChunkOffsetsInMoov(moovBody: Uint8Array, delta: number, threshold: number): void {
  // moov > trak > mdia > minf > stbl > stco|co64
  function walk(body: Uint8Array): void {
    const boxes = readBoxes(body, 0, body.length);
    for (const box of boxes) {
      if (box.type === 'stco') {
        if (box.body.length < 8) continue;
        const count = readUInt32BE(box.body, 4);
        // The body is a *view* into the parent buffer; mutating it mutates the
        // underlying ArrayBuffer too. But our `body` here is a subarray view
        // into moovBody — and moovBody was built via concatBytes, so it owns
        // its own buffer. Mutations to `box.body` therefore affect moovBody.
        for (let n = 0; n < count; n += 1) {
          const off = 8 + n * 4;
          if (off + 4 > box.body.length) break;
          const cur = readUInt32BE(box.body, off);
          if (cur >= threshold) {
            writeUInt32BE(box.body, off, (cur - delta) >>> 0);
          }
        }
      } else if (box.type === 'co64') {
        if (box.body.length < 8) continue;
        const count = readUInt32BE(box.body, 4);
        for (let n = 0; n < count; n += 1) {
          const off = 8 + n * 8;
          if (off + 8 > box.body.length) break;
          const hi = readUInt32BE(box.body, off);
          const lo = readUInt32BE(box.body, off + 4);
          const cur = hi * 0x100000000 + lo;
          if (cur >= threshold) {
            const next = cur - delta;
            writeUInt32BE(box.body, off, Math.floor(next / 0x100000000));
            writeUInt32BE(box.body, off + 4, next >>> 0);
          }
        }
      } else if (
        box.type === 'trak' ||
        box.type === 'mdia' ||
        box.type === 'minf' ||
        box.type === 'stbl' ||
        box.type === 'edts'
      ) {
        walk(box.body);
      }
    }
  }
  walk(moovBody);
}

export const m4aParser: FormatParser = {
  format: 'm4a',
  extensions: ['.m4a', '.m4b', '.m4p'],
  mimeTypes: ['audio/mp4', 'audio/x-m4a'],
  matches: matchesM4a,
  parse: parseM4a,
  scrub: scrubM4a,
};
