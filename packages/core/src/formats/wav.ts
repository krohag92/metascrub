// WAV (RIFF/WAVE) parser.
//
// File layout:
//   "RIFF" + size(u32 LE) + "WAVE" + chunks...
// Each chunk: 4-byte id + size(u32 LE) + body, padded to even length.
//
// Metadata-bearing chunks:
//   - "LIST" with subtype "INFO": children are 4-byte ASCII tag ids
//       INAM (title), IART (artist), ICRD (date), ISFT (software),
//       ICMT (comment), ICOP (copyright), IGNR (genre), IPRD (album), ...
//   - "id3 " — embedded ID3v2 tag.
//   - "bext" — Broadcast WAV extension (recording metadata).
//   - "iXML" / "_PMX" / "axml" — production metadata.
//
// Scrubbing: drop those entire chunks and rewrite the top-level RIFF size.

import type { FormatParser, MetadataField, ScrubOptions } from '../types.js';
import { startsWith, latin1Decoder } from '../utils/bytes.js';
import { resolveScrub } from '../presets.js';
import { commonToFields, nativeToFields, parseWithMusicMetadata } from './_audio.js';

const RIFF_MAGIC = [0x52, 0x49, 0x46, 0x46]; // "RIFF"
const WAVE_MAGIC = [0x57, 0x41, 0x56, 0x45]; // "WAVE"

type Chunk = {
  id: string;
  body: Uint8Array;
  /** Body length without padding byte. */
  size: number;
  /** Byte offset of the chunk *id* within the file. */
  offset: number;
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

function writeU32LE(b: Uint8Array, off: number, v: number): void {
  b[off] = v & 0xff;
  b[off + 1] = (v >>> 8) & 0xff;
  b[off + 2] = (v >>> 16) & 0xff;
  b[off + 3] = (v >>> 24) & 0xff;
}

function parseChunks(bytes: Uint8Array): { chunks: Chunk[] } {
  if (!startsWith(bytes, RIFF_MAGIC)) throw new Error('Not a RIFF file');
  if (bytes.length < 12 || !arraysEqual(bytes, 8, WAVE_MAGIC)) {
    throw new Error('Not a WAVE container');
  }
  const chunks: Chunk[] = [];
  let i = 12;
  while (i + 8 <= bytes.length) {
    const id = latin1Decoder.decode(bytes.subarray(i, i + 4));
    const size = readU32LE(bytes, i + 4);
    const bodyStart = i + 8;
    const bodyEnd = bodyStart + size;
    if (bodyEnd > bytes.length) break;
    chunks.push({
      id,
      size,
      body: bytes.subarray(bodyStart, bodyEnd),
      offset: i,
    });
    // RIFF chunks are word-aligned: pad to even length.
    const pad = size & 1;
    i = bodyEnd + pad;
  }
  return { chunks };
}

function arraysEqual(bytes: Uint8Array, off: number, sig: number[]): boolean {
  for (let i = 0; i < sig.length; i += 1) {
    if (bytes[off + i] !== sig[i]) return false;
  }
  return true;
}

function matchesWav(b: Uint8Array): boolean {
  return startsWith(b, RIFF_MAGIC) && b.length >= 12 && arraysEqual(b, 8, WAVE_MAGIC);
}

const INFO_LABELS: Record<string, string> = {
  INAM: 'title',
  IART: 'artist',
  ICRD: 'date',
  ISFT: 'software',
  ICMT: 'comment',
  ICOP: 'copyright',
  IPRD: 'album',
  ITRK: 'track',
  IGNR: 'genre',
  IENG: 'engineer',
  IKEY: 'keywords',
  ISBJ: 'subject',
  ITCH: 'technician',
  IARL: 'archival_location',
  ICMS: 'commissioned',
  ISRC: 'source',
  ISRF: 'source_form',
};

const INFO_SENSITIVE = new Set(['IART', 'ICMT', 'ICOP', 'ISFT', 'IENG', 'ITCH', 'IARL', 'ICMS']);

function parseInfoList(body: Uint8Array): MetadataField[] {
  // First 4 bytes are subtype (e.g. "INFO"). Children follow.
  if (body.length < 4) return [];
  const subtype = latin1Decoder.decode(body.subarray(0, 4));
  if (subtype !== 'INFO') return [];
  const fields: MetadataField[] = [];
  let i = 4;
  while (i + 8 <= body.length) {
    const id = latin1Decoder.decode(body.subarray(i, i + 4));
    const size = readU32LE(body, i + 4);
    const valStart = i + 8;
    const valEnd = valStart + size;
    if (valEnd > body.length) break;
    let raw = latin1Decoder.decode(body.subarray(valStart, valEnd));
    // Strip trailing nulls
    raw = raw.replace(/\0+$/g, '');
    fields.push({
      key: id,
      label: INFO_LABELS[id],
      value: raw,
      sensitive: INFO_SENSITIVE.has(id),
    });
    i = valEnd + (size & 1);
  }
  return fields;
}

async function parseWav(bytes: Uint8Array): Promise<{ groups: Record<string, MetadataField[]> }> {
  const groups: Record<string, MetadataField[]> = {};
  let chunks: Chunk[] = [];
  try {
    ({ chunks } = parseChunks(bytes));
  } catch {
    chunks = [];
  }

  for (const c of chunks) {
    if (c.id === 'LIST') {
      const subtype = latin1Decoder.decode(c.body.subarray(0, 4));
      if (subtype === 'INFO') {
        const fields = parseInfoList(c.body);
        if (fields.length) groups['WAV.INFO'] = fields;
      }
    } else if (c.id === 'bext') {
      // Broadcast extension — first 256 bytes "Description", 32 "Originator",
      // 32 "OriginatorReference", 10 "OriginationDate" (YYYY-MM-DD), 8 time,
      // 8 TimeReferenceLow+High, 2 Version, then UMID etc.
      const dec = (off: number, len: number): string =>
        latin1Decoder.decode(c.body.subarray(off, off + len)).replace(/\0+$/g, '');
      const fields: MetadataField[] = [];
      if (c.body.length >= 256) fields.push({ key: 'Description', value: dec(0, 256) });
      if (c.body.length >= 288)
        fields.push({ key: 'Originator', value: dec(256, 32), sensitive: true });
      if (c.body.length >= 320)
        fields.push({
          key: 'OriginatorReference',
          value: dec(288, 32),
          sensitive: true,
        });
      if (c.body.length >= 330) fields.push({ key: 'OriginationDate', value: dec(320, 10) });
      if (c.body.length >= 338) fields.push({ key: 'OriginationTime', value: dec(330, 8) });
      if (fields.length) groups['WAV.bext'] = fields;
    } else if (c.id === 'id3 ' || c.id === 'ID3 ') {
      groups['WAV.id3'] = [{ key: 'present', value: `${c.size} bytes`, sensitive: true }];
    } else if (c.id === 'iXML' || c.id === 'axml' || c.id === '_PMX') {
      groups[`WAV.${c.id.trim()}`] = [
        { key: 'present', value: `${c.size} bytes`, sensitive: true },
      ];
    }
  }

  // Augment with music-metadata if available.
  const parsed = await parseWithMusicMetadata(bytes, 'audio/wav');
  if (parsed) {
    const common = commonToFields(parsed.common as unknown as Record<string, unknown>);
    if (common.length && !groups['Audio.common']) groups['Audio.common'] = common;
    for (const [tagNs, tagList] of Object.entries(parsed.native ?? {})) {
      if (!Array.isArray(tagList) || tagList.length === 0) continue;
      // Skip RIFF/INFO and ID3 — we already exposed them above with finer
      // sensitivity tags than music-metadata gives us.
      const lower = tagNs.toLowerCase();
      if (lower.includes('exif') || lower.includes('riff') || lower.includes('id3')) continue;
      const fields = nativeToFields(tagList as Array<{ id: string; value: unknown }>);
      if (fields.length) groups[`WAV.${tagNs}`] = fields;
    }
  }

  return { groups };
}

const METADATA_CHUNK_IDS = new Set(['id3 ', 'ID3 ', 'bext', 'iXML', 'axml', '_PMX', 'MD5 ']);

async function scrubWav(bytes: Uint8Array, options: ScrubOptions): Promise<Uint8Array> {
  const resolved = resolveScrub(options);
  const strip =
    resolved.preset === 'all' ||
    resolved.preset === 'personal-only' ||
    resolved.preset === 'keep-technical' ||
    (resolved.preset === 'custom' &&
      resolved.remove.some((p) => p === 'WAV.*' || p.startsWith('WAV.') || p === 'Audio.common'));
  if (!strip) return bytes;

  const { chunks } = parseChunks(bytes);
  // Rebuild the RIFF body from kept chunks.
  const kept: Chunk[] = [];
  for (const c of chunks) {
    if (METADATA_CHUNK_IDS.has(c.id)) continue;
    if (c.id === 'LIST') {
      const subtype = latin1Decoder.decode(c.body.subarray(0, 4));
      if (subtype === 'INFO') continue;
    }
    kept.push(c);
  }

  // RIFF body size = "WAVE" + sum(chunk header + body + pad).
  let bodySize = 4; // "WAVE"
  for (const c of kept) {
    bodySize += 8 + c.size + (c.size & 1);
  }
  const out = new Uint8Array(8 + bodySize);
  out.set(RIFF_MAGIC, 0);
  writeU32LE(out, 4, bodySize);
  out.set(WAVE_MAGIC, 8);
  let off = 12;
  for (const c of kept) {
    for (let j = 0; j < 4; j += 1) out[off + j] = c.id.charCodeAt(j) & 0xff;
    writeU32LE(out, off + 4, c.size);
    out.set(c.body, off + 8);
    off += 8 + c.size;
    if ((c.size & 1) === 1) {
      out[off] = 0;
      off += 1;
    }
  }
  return out;
}

export const wavParser: FormatParser = {
  format: 'wav',
  extensions: ['.wav', '.wave'],
  mimeTypes: ['audio/wav', 'audio/x-wav', 'audio/wave'],
  matches: matchesWav,
  parse: parseWav,
  scrub: scrubWav,
};
