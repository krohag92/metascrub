import { writeUInt32BE } from '../../src/utils/bytes.js';

const PNG_SIGNATURE = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

// Minimal 1x1 grayscale PNG IHDR + IDAT + IEND
// IHDR: width=1, height=1, depth=8, colorType=0 (gray), filter=0, interlace=0
// IDAT: deflate-compressed scanline "00 00" (filter byte + 1 sample) = 78 9C 62 60 00 00 00 02 00 01
// IEND: empty

const CRC_TABLE: Uint32Array = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    c = (CRC_TABLE[((c ^ (bytes[i] ?? 0)) & 0xff) >>> 0] ?? 0) ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function asciiBytes(s: string): Uint8Array {
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i += 1) out[i] = s.charCodeAt(i) & 0xff;
  return out;
}

function makeChunk(type: string, data: Uint8Array): Uint8Array {
  const typeBytes = asciiBytes(type);
  const crcInput = new Uint8Array(4 + data.length);
  crcInput.set(typeBytes, 0);
  crcInput.set(data, 4);
  const crc = crc32(crcInput);
  const out = new Uint8Array(12 + data.length);
  writeUInt32BE(out, 0, data.length);
  out.set(typeBytes, 4);
  out.set(data, 8);
  writeUInt32BE(out, 8 + data.length, crc);
  return out;
}

function makeTextChunk(keyword: string, value: string): Uint8Array {
  const k = asciiBytes(keyword);
  const v = asciiBytes(value);
  const data = new Uint8Array(k.length + 1 + v.length);
  data.set(k, 0);
  data[k.length] = 0;
  data.set(v, k.length + 1);
  return makeChunk('tEXt', data);
}

const IHDR = makeChunk(
  'IHDR',
  Uint8Array.from([
    0x00,
    0x00,
    0x00,
    0x01, // width
    0x00,
    0x00,
    0x00,
    0x01, // height
    0x08, // depth
    0x00, // color type (gray)
    0x00, // compression
    0x00, // filter
    0x00, // interlace
  ]),
);

const IDAT = makeChunk(
  'IDAT',
  Uint8Array.from([0x78, 0x9c, 0x62, 0x60, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01]),
);

const IEND = makeChunk('IEND', new Uint8Array(0));

export interface PngBuildOpts {
  texts?: Array<{ keyword: string; value: string }>;
  /** ISO 8601 instant or undefined. Becomes a tIME chunk. */
  modificationTime?: Date;
}

export function makePng(opts: PngBuildOpts = {}): Uint8Array {
  const parts: Uint8Array[] = [PNG_SIGNATURE, IHDR];
  if (opts.texts) {
    for (const t of opts.texts) {
      parts.push(makeTextChunk(t.keyword, t.value));
    }
  }
  if (opts.modificationTime) {
    const d = opts.modificationTime;
    const data = new Uint8Array(7);
    data[0] = (d.getUTCFullYear() >>> 8) & 0xff;
    data[1] = d.getUTCFullYear() & 0xff;
    data[2] = d.getUTCMonth() + 1;
    data[3] = d.getUTCDate();
    data[4] = d.getUTCHours();
    data[5] = d.getUTCMinutes();
    data[6] = d.getUTCSeconds();
    parts.push(makeChunk('tIME', data));
  }
  parts.push(IDAT, IEND);
  let total = 0;
  for (const p of parts) total += p.length;
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out;
}
