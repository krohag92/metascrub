import type { FormatParser, MetadataField, ScrubOptions } from '../types.js';
import {
  startsWith,
  readUInt32BE,
  writeUInt32BE,
  textDecoder,
  latin1Decoder,
} from '../utils/bytes.js';
import { resolveScrub } from '../presets.js';

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

type Chunk = {
  /** ASCII chunk type (4 chars). */
  type: string;
  data: Uint8Array;
  /** CRC bytes as found in file (we recompute when needed). */
  crc: number;
};

const CRC_TABLE: Uint32Array = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    const idx = ((c ^ (bytes[i] ?? 0)) & 0xff) >>> 0;
    c = (CRC_TABLE[idx] ?? 0) ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function readChunks(bytes: Uint8Array): Chunk[] {
  if (!startsWith(bytes, PNG_SIGNATURE)) {
    throw new Error('Not a PNG file (missing 8-byte signature)');
  }
  const chunks: Chunk[] = [];
  let i = 8;
  while (i < bytes.length) {
    if (i + 8 > bytes.length) throw new Error('Truncated PNG chunk header');
    const length = readUInt32BE(bytes, i);
    const type = latin1Decoder.decode(bytes.subarray(i + 4, i + 8));
    const dataStart = i + 8;
    const dataEnd = dataStart + length;
    if (dataEnd + 4 > bytes.length) throw new Error('Truncated PNG chunk data');
    const data = bytes.subarray(dataStart, dataEnd);
    const crc = readUInt32BE(bytes, dataEnd);
    chunks.push({ type, data, crc });
    i = dataEnd + 4;
    if (type === 'IEND') break;
  }
  return chunks;
}

function writeChunks(chunks: Chunk[]): Uint8Array {
  let total = 8;
  for (const c of chunks) total += 12 + c.data.length;
  const out = new Uint8Array(total);
  out.set(PNG_SIGNATURE, 0);
  let off = 8;
  for (const c of chunks) {
    writeUInt32BE(out, off, c.data.length);
    off += 4;
    const typeBytes = new Uint8Array(4);
    for (let j = 0; j < 4; j += 1) typeBytes[j] = c.type.charCodeAt(j) & 0xff;
    out.set(typeBytes, off);
    off += 4;
    out.set(c.data, off);
    off += c.data.length;
    // Recompute CRC over type+data
    const crcInput = new Uint8Array(4 + c.data.length);
    crcInput.set(typeBytes, 0);
    crcInput.set(c.data, 4);
    writeUInt32BE(out, off, crc32(crcInput));
    off += 4;
  }
  return out;
}

const METADATA_TYPES = new Set([
  'tEXt',
  'zTXt',
  'iTXt',
  'tIME',
  'eXIf',
  'xmp ', // some encoders use this
]);

const TEXT_TYPES = new Set(['tEXt', 'zTXt', 'iTXt']);

function parseTextChunk(chunk: Chunk): { keyword: string; value: string } | null {
  if (!TEXT_TYPES.has(chunk.type)) return null;
  // Find null terminator after keyword
  let i = 0;
  while (i < chunk.data.length && chunk.data[i] !== 0) i += 1;
  const keyword = latin1Decoder.decode(chunk.data.subarray(0, i));
  let value = '';
  if (chunk.type === 'tEXt') {
    value = latin1Decoder.decode(chunk.data.subarray(i + 1));
  } else if (chunk.type === 'iTXt') {
    // keyword\0 compressionFlag(1) compressionMethod(1) langTag\0 translatedKeyword\0 text
    let j = i + 1;
    j += 2; // flag + method
    while (j < chunk.data.length && chunk.data[j] !== 0) j += 1;
    j += 1; // lang null
    while (j < chunk.data.length && chunk.data[j] !== 0) j += 1;
    j += 1; // translated null
    const compressed = chunk.data[i + 1] === 1;
    const tail = chunk.data.subarray(j);
    if (!compressed) {
      value = textDecoder.decode(tail);
    } else {
      value = '<deflate compressed>';
    }
  } else if (chunk.type === 'zTXt') {
    // keyword\0 compressionMethod(1) compressedData
    value = '<deflate compressed>';
  }
  return { keyword, value };
}

const TEXT_SENSITIVE = new Set([
  'Author',
  'Artist',
  'Copyright',
  'Creator',
  'Source',
  'Software',
  'XML:com.adobe.xmp',
]);

async function parsePng(
  bytes: Uint8Array,
): Promise<{ groups: Record<string, MetadataField[]> }> {
  const chunks = readChunks(bytes);
  const textFields: MetadataField[] = [];
  let exifGroup: MetadataField[] | undefined;
  let tIME: string | undefined;

  for (const c of chunks) {
    if (TEXT_TYPES.has(c.type)) {
      const kv = parseTextChunk(c);
      if (!kv) continue;
      textFields.push({
        key: kv.keyword,
        value: kv.value,
        sensitive: TEXT_SENSITIVE.has(kv.keyword),
      });
    } else if (c.type === 'tIME') {
      if (c.data.length === 7) {
        const year = (c.data[0]! << 8) | c.data[1]!;
        const fmt = (n: number): string =>
          n.toString().padStart(2, '0');
        tIME = `${year}-${fmt(c.data[2]!)}-${fmt(c.data[3]!)}T${fmt(c.data[4]!)}:${fmt(c.data[5]!)}:${fmt(c.data[6]!)}Z`;
      }
    } else if (c.type === 'eXIf') {
      // Try to parse via exifr
      try {
        const exifrMod = await import('exifr');
        const exifr = (exifrMod as { default?: unknown }).default ?? exifrMod;
        const parsed = (await (
          exifr as {
            parse: (
              data: Uint8Array,
              opts: unknown,
            ) => Promise<Record<string, unknown> | undefined>;
          }
        ).parse(c.data, {
          tiff: true,
          ifd0: true,
          exif: true,
          gps: true,
          mergeOutput: false,
          translateKeys: true,
          translateValues: true,
        })) ?? {};
        const fields: MetadataField[] = [];
        const ifd0 = (parsed.ifd0 ?? {}) as Record<string, unknown>;
        const ex = (parsed.exif ?? {}) as Record<string, unknown>;
        for (const [k, v] of Object.entries(ifd0)) {
          fields.push({ key: k, value: stringifyValue(v) });
        }
        for (const [k, v] of Object.entries(ex)) {
          fields.push({ key: k, value: stringifyValue(v) });
        }
        if (fields.length) exifGroup = fields;
      } catch {
        // ignore
      }
    }
  }

  const groups: Record<string, MetadataField[]> = {};
  if (textFields.length) groups['PNG.text'] = textFields;
  if (tIME) groups['PNG.tIME'] = [{ key: 'LastModified', value: tIME }];
  if (exifGroup) groups.EXIF = exifGroup;
  return { groups };
}

function stringifyValue(v: unknown): string | number | boolean | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean')
    return v;
  if (v instanceof Date) return v.toISOString();
  if (Array.isArray(v)) return v.map((x) => String(x ?? '')).join(', ');
  return String(v);
}

async function scrubPng(
  bytes: Uint8Array,
  options: ScrubOptions,
): Promise<Uint8Array> {
  const resolved = resolveScrub(options);
  const chunks = readChunks(bytes);

  const dropAll = resolved.preset === 'all' || resolved.preset === 'personal-only';
  const dropGpsOnly = resolved.preset === 'gps-only';
  const dropKeepTech = resolved.preset === 'keep-technical';

  const out: Chunk[] = [];
  for (const c of chunks) {
    if (!METADATA_TYPES.has(c.type)) {
      out.push(c);
      continue;
    }
    if (dropAll) continue;
    if (dropKeepTech) continue;
    if (dropGpsOnly) {
      // strip eXIf (contains GPS); keep text chunks
      if (c.type === 'eXIf') continue;
      out.push(c);
      continue;
    }
    if (resolved.preset === 'custom') {
      // Heuristic — drop if any remove pattern matches PNG.* or matches keyword
      const kv = parseTextChunk(c);
      const keyword = kv?.keyword;
      const drop =
        resolved.remove.some((p) => p === 'PNG.*' || p === 'PNG') ||
        (keyword !== undefined &&
          resolved.remove.some((p) => p === `PNG.text.${keyword}`));
      if (drop) continue;
      out.push(c);
      continue;
    }
    out.push(c);
  }
  return writeChunks(out);
}

export const pngParser: FormatParser = {
  format: 'png',
  extensions: ['.png'],
  mimeTypes: ['image/png'],
  matches: (b) => startsWith(b, PNG_SIGNATURE),
  parse: parsePng,
  scrub: scrubPng,
};
