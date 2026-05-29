// Synthetic baseline TIFF fixture builder.
//
// Produces a single-IFD, little-endian TIFF with one uncompressed grayscale
// strip. Optionally embeds Artist/Software/Orientation IFD0 tags so we can
// verify our scrubber strips them.
//
// The strip is just `width*height` bytes of zeroed gray (PhotometricInterpretation=1).

function writeU16LE(buf: Uint8Array, off: number, v: number): void {
  buf[off] = v & 0xff;
  buf[off + 1] = (v >>> 8) & 0xff;
}
function writeU32LE(buf: Uint8Array, off: number, v: number): void {
  buf[off] = v & 0xff;
  buf[off + 1] = (v >>> 8) & 0xff;
  buf[off + 2] = (v >>> 16) & 0xff;
  buf[off + 3] = (v >>> 24) & 0xff;
}

function ascii(s: string): Uint8Array {
  const out = new Uint8Array(s.length + 1);
  for (let i = 0; i < s.length; i += 1) out[i] = s.charCodeAt(i) & 0xff;
  return out;
}

export interface TiffBuildOpts {
  width?: number;
  height?: number;
  artist?: string;
  software?: string;
  orientation?: number;
}

type Entry = { tag: number; type: number; count: number; data: Uint8Array };

export function makeTiff(opts: TiffBuildOpts = {}): Uint8Array {
  const width = opts.width ?? 2;
  const height = opts.height ?? 2;
  const strip = new Uint8Array(width * height); // all zeros = black grayscale
  const entries: Entry[] = [];
  // ImageWidth
  entries.push({ tag: 0x0100, type: 4, count: 1, data: u32leBytes(width) });
  // ImageLength
  entries.push({ tag: 0x0101, type: 4, count: 1, data: u32leBytes(height) });
  // BitsPerSample
  entries.push({ tag: 0x0102, type: 3, count: 1, data: u16leBytes(8) });
  // Compression = 1 (none)
  entries.push({ tag: 0x0103, type: 3, count: 1, data: u16leBytes(1) });
  // PhotometricInterpretation = 1 (BlackIsZero)
  entries.push({ tag: 0x0106, type: 3, count: 1, data: u16leBytes(1) });
  // StripOffsets — value patched later
  entries.push({ tag: 0x0111, type: 4, count: 1, data: u32leBytes(0) });
  // SamplesPerPixel = 1
  entries.push({ tag: 0x0115, type: 3, count: 1, data: u16leBytes(1) });
  // RowsPerStrip = height
  entries.push({ tag: 0x0116, type: 4, count: 1, data: u32leBytes(height) });
  // StripByteCounts = strip.length
  entries.push({ tag: 0x0117, type: 4, count: 1, data: u32leBytes(strip.length) });

  if (opts.artist !== undefined) {
    entries.push({ tag: 0x013b, type: 2, count: opts.artist.length + 1, data: ascii(opts.artist) });
  }
  if (opts.software !== undefined) {
    entries.push({
      tag: 0x0131,
      type: 2,
      count: opts.software.length + 1,
      data: ascii(opts.software),
    });
  }
  if (opts.orientation !== undefined) {
    entries.push({ tag: 0x0112, type: 3, count: 1, data: u16leBytes(opts.orientation) });
  }

  entries.sort((a, b) => a.tag - b.tag);
  const headerSize = 8;
  const ifdSize = 2 + 12 * entries.length + 4;
  type Plan = Entry & { externalOffset?: number };
  let poolOffset = headerSize + ifdSize;
  const pool: Array<{ offset: number; data: Uint8Array; entry: Plan }> = [];
  for (const e of entries as Plan[]) {
    if (e.data.length > 4) {
      e.externalOffset = poolOffset;
      pool.push({ offset: poolOffset, data: e.data, entry: e });
      poolOffset += e.data.length;
      if (poolOffset % 2 === 1) poolOffset += 1;
    }
  }
  const stripOffset = poolOffset;
  const total = stripOffset + strip.length + (strip.length % 2);
  const out = new Uint8Array(total);
  // Header
  out[0] = 0x49;
  out[1] = 0x49;
  out[2] = 0x2a;
  out[3] = 0x00;
  writeU32LE(out, 4, headerSize);
  // IFD
  writeU16LE(out, headerSize, entries.length);
  let cursor = headerSize + 2;
  for (const e of entries as Plan[]) {
    writeU16LE(out, cursor, e.tag);
    writeU16LE(out, cursor + 2, e.type);
    writeU32LE(out, cursor + 4, e.count);
    if (e.tag === 0x0111) {
      // StripOffsets value = stripOffset, inline (single strip, fits in 4 bytes)
      writeU32LE(out, cursor + 8, stripOffset);
    } else if (e.externalOffset !== undefined) {
      writeU32LE(out, cursor + 8, e.externalOffset);
    } else {
      out[cursor + 8] = e.data[0] ?? 0;
      out[cursor + 9] = e.data[1] ?? 0;
      out[cursor + 10] = e.data[2] ?? 0;
      out[cursor + 11] = e.data[3] ?? 0;
    }
    cursor += 12;
  }
  // next-IFD = 0
  writeU32LE(out, cursor, 0);
  // Pool
  for (const slot of pool) {
    out.set(slot.data, slot.offset);
  }
  // Strip
  out.set(strip, stripOffset);
  return out;
}

function u16leBytes(v: number): Uint8Array {
  const b = new Uint8Array(2);
  b[0] = v & 0xff;
  b[1] = (v >>> 8) & 0xff;
  return b;
}
function u32leBytes(v: number): Uint8Array {
  const b = new Uint8Array(4);
  b[0] = v & 0xff;
  b[1] = (v >>> 8) & 0xff;
  b[2] = (v >>> 16) & 0xff;
  b[3] = (v >>> 24) & 0xff;
  return b;
}
