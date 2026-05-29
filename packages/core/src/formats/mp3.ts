// MP3 (MPEG audio) parser.
//
// MP3 files carry metadata in two complementary tag containers:
//   - **ID3v2** at the start of the file. The first 10 bytes are the header:
//       "ID3" + major(1) + revision(1) + flags(1) + syncsafe-size(4)
//     The syncsafe size encodes (size - 10) bytes of frames as four 7-bit
//     big-endian groups (each byte's MSB is always zero). After that come the
//     frames themselves; we don't have to parse them to scrub — we just drop
//     the entire prefix.
//   - **ID3v1** in the *last* 128 bytes. If those bytes start with the ASCII
//     "TAG" they are an ID3v1 record.
//
// Parsing uses music-metadata which handles ID3v2/2.3/2.4, footers, padding,
// and APEv2. Scrubbing is byte-surgery — we don't rewrite tags, we just chop
// off the prefix/suffix and trust that the remaining MPEG frames are intact.
// This means scrub is lossless for the audio payload.

import type { FormatParser, MetadataField, ScrubOptions } from '../types.js';
import { startsWith } from '../utils/bytes.js';
import { resolveScrub } from '../presets.js';
import { commonToFields, nativeToFields, parseWithMusicMetadata } from './_audio.js';

const ID3V2_MAGIC = [0x49, 0x44, 0x33]; // "ID3"
const ID3V1_MAGIC = [0x54, 0x41, 0x47]; // "TAG"
const MPEG_FRAME_SYNCS: number[][] = [
  [0xff, 0xfb],
  [0xff, 0xfa],
  [0xff, 0xf3],
  [0xff, 0xf2],
  [0xff, 0xf1], // AAC ADTS occasionally lives in .mp3 — let it match.
  [0xff, 0xe3],
];

/** Read the ID3v2 syncsafe size (bytes 6..9 of the tag header). */
function readSyncSafe(bytes: Uint8Array, offset: number): number {
  return (
    ((bytes[offset] ?? 0) & 0x7f) * 0x200000 +
    (((bytes[offset + 1] ?? 0) & 0x7f) << 14) +
    (((bytes[offset + 2] ?? 0) & 0x7f) << 7) +
    ((bytes[offset + 3] ?? 0) & 0x7f)
  );
}

/** Compute byte length of the ID3v2 prefix (header + frames + optional footer). */
function id3v2PrefixLength(bytes: Uint8Array): number {
  if (!startsWith(bytes, ID3V2_MAGIC)) return 0;
  if (bytes.length < 10) return 0;
  const flags = bytes[5] ?? 0;
  const size = readSyncSafe(bytes, 6);
  const footer = (flags & 0x10) !== 0 ? 10 : 0;
  return 10 + size + footer;
}

/** Return the (offset, length) of an ID3v1 footer if present; else (-1, 0). */
function findId3v1(bytes: Uint8Array): { offset: number; length: number } {
  if (bytes.length < 128) return { offset: -1, length: 0 };
  const off = bytes.length - 128;
  if (
    bytes[off] === ID3V1_MAGIC[0] &&
    bytes[off + 1] === ID3V1_MAGIC[1] &&
    bytes[off + 2] === ID3V1_MAGIC[2]
  ) {
    return { offset: off, length: 128 };
  }
  return { offset: -1, length: 0 };
}

function matchesMp3(b: Uint8Array): boolean {
  if (startsWith(b, ID3V2_MAGIC)) return true;
  for (const sig of MPEG_FRAME_SYNCS) {
    if (startsWith(b, sig)) return true;
  }
  return false;
}

async function parseMp3(bytes: Uint8Array): Promise<{ groups: Record<string, MetadataField[]> }> {
  const groups: Record<string, MetadataField[]> = {};

  const parsed = await parseWithMusicMetadata(bytes, 'audio/mpeg');
  if (parsed) {
    const common = commonToFields(parsed.common as unknown as Record<string, unknown>);
    if (common.length) groups['Audio.common'] = common;
    for (const [tagNs, tagList] of Object.entries(parsed.native ?? {})) {
      if (!Array.isArray(tagList) || tagList.length === 0) continue;
      const fields = nativeToFields(tagList as Array<{ id: string; value: unknown }>);
      if (fields.length) groups[`MP3.${tagNs}`] = fields;
    }
    // Stream/format details — useful for highlights ("device" doesn't really
    // apply to audio but encoder/bitrate is interesting).
    const fmt = parsed.format as unknown as Record<string, unknown> | undefined;
    if (fmt) {
      const fmtFields: MetadataField[] = [];
      for (const [k, v] of Object.entries(fmt)) {
        if (v === undefined) continue;
        if (k === 'trackInfo' || k === 'audioMD5') continue;
        fmtFields.push({ key: k, value: stringifyFmt(v) });
      }
      if (fmtFields.length) groups['MP3.format'] = fmtFields;
    }
  }

  // Always surface raw container presence so callers can see "this file had
  // an ID3v2 prefix" even if music-metadata couldn't decode the frames.
  const v2Len = id3v2PrefixLength(bytes);
  const v1 = findId3v1(bytes);
  const containerFields: MetadataField[] = [];
  if (v2Len > 0) {
    containerFields.push({
      key: 'id3v2',
      value: `${v2Len} bytes`,
      sensitive: true,
    });
  }
  if (v1.offset >= 0) {
    containerFields.push({ key: 'id3v1', value: '128 bytes', sensitive: true });
  }
  if (containerFields.length) groups['MP3.container'] = containerFields;

  return { groups };
}

function stringifyFmt(v: unknown): string | number | boolean | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return v;
  return JSON.stringify(v);
}

async function scrubMp3(bytes: Uint8Array, options: ScrubOptions): Promise<Uint8Array> {
  const resolved = resolveScrub(options);
  // "gps-only" doesn't apply to audio. For audio the meaningful presets are
  // all/personal-only/keep-technical (= same as all here since there's no
  // technical-only sub-block in an ID3 tag) and custom.
  const dropAllTags =
    resolved.preset === 'all' ||
    resolved.preset === 'personal-only' ||
    resolved.preset === 'keep-technical';
  const dropCustom =
    resolved.preset === 'custom' &&
    resolved.remove.some(
      (p) =>
        p === 'MP3.*' ||
        p === 'Audio.*' ||
        p === 'Audio.common' ||
        p === 'Audio.common.*' ||
        p.startsWith('MP3.'),
    );

  if (!dropAllTags && !dropCustom) return bytes;

  const v2Len = id3v2PrefixLength(bytes);
  const v1 = findId3v1(bytes);
  const start = v2Len;
  const end = v1.offset >= 0 ? v1.offset : bytes.length;
  if (start === 0 && end === bytes.length) return bytes;
  return bytes.slice(start, end);
}

export const mp3Parser: FormatParser = {
  format: 'mp3',
  extensions: ['.mp3'],
  mimeTypes: ['audio/mpeg', 'audio/mp3'],
  matches: matchesMp3,
  parse: parseMp3,
  scrub: scrubMp3,
};
