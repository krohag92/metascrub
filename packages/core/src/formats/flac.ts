// FLAC (Free Lossless Audio Codec) parser.
//
// File layout:
//   "fLaC" (4 bytes)
//   metadata block*
//   audio frames...
//
// Each metadata block header is 4 bytes:
//   [0]   bit 7 = last-metadata-block flag; bits 0..6 = BLOCK_TYPE
//   [1-3] big-endian 24-bit length of block body (excluding the 4-byte header)
//
// BLOCK_TYPE values we care about:
//   0 STREAMINFO      keep (required for decoder)
//   1 PADDING         drop on scrub
//   2 APPLICATION     drop on personal-only/all (often carries vendor markers)
//   3 SEEKTABLE       keep (technical)
//   4 VORBIS_COMMENT  drop on scrub (the metadata block)
//   5 CUESHEET        keep
//   6 PICTURE         drop on all; keep on personal-only (cover art often EXIF)
//
// After dropping blocks we MUST set the last-block bit on whatever block
// becomes the last one, otherwise the decoder will overrun into audio frames.

import type { FormatParser, MetadataField, ScrubOptions } from '../types.js';
import { startsWith, concatBytes } from '../utils/bytes.js';
import { resolveScrub } from '../presets.js';
import { commonToFields, nativeToFields, parseWithMusicMetadata } from './_audio.js';

const FLAC_MAGIC = [0x66, 0x4c, 0x61, 0x43]; // "fLaC"

const BLOCK_PADDING = 1;
const BLOCK_APPLICATION = 2;
const BLOCK_VORBIS_COMMENT = 4;
const BLOCK_PICTURE = 6;

type FlacBlock = {
  type: number;
  isLast: boolean;
  body: Uint8Array;
  /** Full header+body bytes (used for cheap reassembly). */
  raw: Uint8Array;
};

function parseBlocks(bytes: Uint8Array): { blocks: FlacBlock[]; audioOffset: number } {
  if (!startsWith(bytes, FLAC_MAGIC)) {
    throw new Error('Not a FLAC file (missing fLaC magic)');
  }
  const blocks: FlacBlock[] = [];
  let i = 4;
  while (i + 4 <= bytes.length) {
    const header = bytes[i] ?? 0;
    const isLast = (header & 0x80) !== 0;
    const type = header & 0x7f;
    const len = ((bytes[i + 1] ?? 0) << 16) | ((bytes[i + 2] ?? 0) << 8) | (bytes[i + 3] ?? 0);
    const bodyStart = i + 4;
    const bodyEnd = bodyStart + len;
    if (bodyEnd > bytes.length) {
      throw new Error('Truncated FLAC metadata block');
    }
    const body = bytes.subarray(bodyStart, bodyEnd);
    const raw = bytes.subarray(i, bodyEnd);
    blocks.push({ type, isLast, body, raw });
    i = bodyEnd;
    if (isLast) break;
  }
  return { blocks, audioOffset: i };
}

function rebuildHeader(type: number, isLast: boolean, length: number): Uint8Array {
  const out = new Uint8Array(4);
  out[0] = (isLast ? 0x80 : 0x00) | (type & 0x7f);
  out[1] = (length >>> 16) & 0xff;
  out[2] = (length >>> 8) & 0xff;
  out[3] = length & 0xff;
  return out;
}

function parseVorbisComment(body: Uint8Array): {
  vendor: string;
  comments: Array<{ key: string; value: string }>;
} {
  // Layout (little-endian):
  //   vendor_length(u32) + vendor_string
  //   user_comment_list_length(u32)
  //   for each comment: length(u32) + "KEY=VALUE" UTF-8
  const dv = new DataView(body.buffer, body.byteOffset, body.byteLength);
  let off = 0;
  const vendorLen = dv.getUint32(off, true);
  off += 4;
  const dec = new TextDecoder('utf-8', { fatal: false });
  const vendor = dec.decode(body.subarray(off, off + vendorLen));
  off += vendorLen;
  const listLen = dv.getUint32(off, true);
  off += 4;
  const comments: Array<{ key: string; value: string }> = [];
  for (let i = 0; i < listLen; i += 1) {
    if (off + 4 > body.length) break;
    const len = dv.getUint32(off, true);
    off += 4;
    if (off + len > body.length) break;
    const entry = dec.decode(body.subarray(off, off + len));
    off += len;
    const eq = entry.indexOf('=');
    if (eq < 0) continue;
    comments.push({ key: entry.slice(0, eq), value: entry.slice(eq + 1) });
  }
  return { vendor, comments };
}

function matchesFlac(b: Uint8Array): boolean {
  return startsWith(b, FLAC_MAGIC);
}

async function parseFlac(bytes: Uint8Array): Promise<{ groups: Record<string, MetadataField[]> }> {
  const groups: Record<string, MetadataField[]> = {};

  // Walk the blocks ourselves for the FLAC.* group surfaces, even if
  // music-metadata also returns vorbis fields — they may carry different
  // sensitivity flags.
  let blocks: FlacBlock[] = [];
  try {
    ({ blocks } = parseBlocks(bytes));
  } catch {
    blocks = [];
  }

  const containerFields: MetadataField[] = [];
  for (const b of blocks) {
    const name = BLOCK_NAMES[b.type] ?? `block_${b.type}`;
    containerFields.push({
      key: name,
      value: `${b.body.length} bytes`,
      sensitive: b.type === BLOCK_VORBIS_COMMENT || b.type === BLOCK_PICTURE,
    });
  }
  if (containerFields.length) groups['FLAC.blocks'] = containerFields;

  const vorbis = blocks.find((b) => b.type === BLOCK_VORBIS_COMMENT);
  if (vorbis) {
    const { vendor, comments } = parseVorbisComment(vorbis.body);
    const fields: MetadataField[] = [];
    if (vendor) fields.push({ key: 'vendor', value: vendor });
    for (const c of comments) {
      fields.push({
        key: c.key,
        value: c.value,
        sensitive: isVorbisSensitive(c.key),
      });
    }
    if (fields.length) groups['FLAC.vorbis'] = fields;
  }

  const parsed = await parseWithMusicMetadata(bytes, 'audio/flac');
  if (parsed) {
    const common = commonToFields(parsed.common as unknown as Record<string, unknown>);
    if (common.length) groups['Audio.common'] = common;
    for (const [tagNs, tagList] of Object.entries(parsed.native ?? {})) {
      if (!Array.isArray(tagList) || tagList.length === 0) continue;
      // Skip vorbis — we already surfaced it above with our own walker.
      if (tagNs.toLowerCase() === 'vorbis') continue;
      const fields = nativeToFields(tagList as Array<{ id: string; value: unknown }>);
      if (fields.length) groups[`FLAC.${tagNs}`] = fields;
    }
  }

  return { groups };
}

const BLOCK_NAMES: Record<number, string> = {
  0: 'STREAMINFO',
  1: 'PADDING',
  2: 'APPLICATION',
  3: 'SEEKTABLE',
  4: 'VORBIS_COMMENT',
  5: 'CUESHEET',
  6: 'PICTURE',
};

const VORBIS_SENSITIVE_KEYS = new Set([
  'ARTIST',
  'ALBUMARTIST',
  'COMPOSER',
  'PERFORMER',
  'COMMENT',
  'COPYRIGHT',
  'LICENSE',
  'CONTACT',
  'ENCODED-BY',
  'ENCODER',
  'LYRICS',
  'METADATA_BLOCK_PICTURE',
]);

function isVorbisSensitive(key: string): boolean {
  return VORBIS_SENSITIVE_KEYS.has(key.toUpperCase());
}

async function scrubFlac(bytes: Uint8Array, options: ScrubOptions): Promise<Uint8Array> {
  const resolved = resolveScrub(options);
  const stripVorbis =
    resolved.preset === 'all' ||
    resolved.preset === 'personal-only' ||
    resolved.preset === 'keep-technical' ||
    (resolved.preset === 'custom' &&
      resolved.remove.some(
        (p) => p === 'FLAC.*' || p === 'FLAC.vorbis' || p.startsWith('FLAC.vorbis'),
      ));

  if (!stripVorbis) return bytes;

  const { blocks, audioOffset } = parseBlocks(bytes);
  const audio = bytes.subarray(audioOffset);

  const dropTypes = new Set<number>();
  dropTypes.add(BLOCK_PADDING);
  dropTypes.add(BLOCK_VORBIS_COMMENT);
  if (resolved.preset === 'all' || resolved.preset === 'keep-technical') {
    dropTypes.add(BLOCK_APPLICATION);
    dropTypes.add(BLOCK_PICTURE);
  } else if (resolved.preset === 'personal-only') {
    dropTypes.add(BLOCK_APPLICATION);
    // PICTURE kept on personal-only — covers are usually intentional artwork.
  }

  const kept = blocks.filter((b) => !dropTypes.has(b.type));
  if (kept.length === 0) {
    // Pathological — but we MUST keep STREAMINFO. Re-emit an empty PADDING.
    const pad = new Uint8Array(4);
    pad[0] = 0x80 | BLOCK_PADDING;
    return concatBytes([Uint8Array.from(FLAC_MAGIC), pad, audio]);
  }

  // Rebuild each kept block with corrected is-last bit. Use original header
  // bytes' length value but recompute the type/is-last byte.
  const out: Uint8Array[] = [Uint8Array.from(FLAC_MAGIC)];
  kept.forEach((b, idx) => {
    const isLast = idx === kept.length - 1;
    const header = rebuildHeader(b.type, isLast, b.body.length);
    out.push(header);
    out.push(b.body);
  });
  out.push(audio);
  return concatBytes(out);
}

export const flacParser: FormatParser = {
  format: 'flac',
  extensions: ['.flac'],
  mimeTypes: ['audio/flac', 'audio/x-flac'],
  matches: matchesFlac,
  parse: parseFlac,
  scrub: scrubFlac,
};
