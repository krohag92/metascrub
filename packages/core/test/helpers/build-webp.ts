// Synthetic WebP fixture builder.
//
// We don't need a decodable image — only a structurally valid RIFF/WebP that
// our parser can walk. So we emit:
//   - "RIFF" + uint32 LE size + "WEBP"
//   - VP8X chunk (10-byte payload with EXIF/XMP flags lit when present)
//   - VP8L chunk (placeholder image data; minimal valid 1-byte payload)
//   - EXIF chunk (optional)
//   - XMP  chunk (optional)
//   - ICCP chunk (optional)

function writeU32LE(out: Uint8Array, off: number, v: number): void {
  out[off] = v & 0xff;
  out[off + 1] = (v >>> 8) & 0xff;
  out[off + 2] = (v >>> 16) & 0xff;
  out[off + 3] = (v >>> 24) & 0xff;
}

function fourcc(s: string): Uint8Array {
  const out = new Uint8Array(4);
  for (let i = 0; i < 4; i += 1) out[i] = s.charCodeAt(i) & 0xff;
  return out;
}

function makeChunk(name: string, data: Uint8Array): Uint8Array {
  const padded = data.length % 2 === 0 ? data : new Uint8Array([...data, 0x00]);
  const out = new Uint8Array(8 + padded.length);
  out.set(fourcc(name), 0);
  writeU32LE(out, 4, data.length);
  out.set(padded, 8);
  return out;
}

/** Minimal big-endian EXIF TIFF with the requested tags. */
function buildExifTiffBE(opts: {
  artist?: string;
  software?: string;
  gps?: { lat: number; lon: number };
}): Uint8Array {
  type Entry = { tag: number; type: number; count: number; data: Uint8Array };
  const ifd0: Entry[] = [];
  const exifSub: Entry[] = [];
  const gpsEntries: Entry[] = [];
  const ascii = (s: string): Uint8Array => {
    const out = new Uint8Array(s.length + 1);
    for (let i = 0; i < s.length; i += 1) out[i] = s.charCodeAt(i) & 0xff;
    return out;
  };
  if (opts.artist !== undefined) {
    ifd0.push({ tag: 0x013b, type: 2, count: opts.artist.length + 1, data: ascii(opts.artist) });
  }
  if (opts.software !== undefined) {
    ifd0.push({
      tag: 0x0131,
      type: 2,
      count: opts.software.length + 1,
      data: ascii(opts.software),
    });
  }
  const useExif = exifSub.length > 0;
  const useGps = opts.gps !== undefined;
  if (useGps && opts.gps) {
    const ratBytes = (deg: number): Uint8Array => {
      const d = Math.floor(deg);
      const minutes = (deg - d) * 60;
      const m = Math.floor(minutes);
      const seconds = (minutes - m) * 60;
      const s = Math.round(seconds * 100);
      const buf = new Uint8Array(24);
      const w32 = (off: number, v: number): void => {
        buf[off] = (v >>> 24) & 0xff;
        buf[off + 1] = (v >>> 16) & 0xff;
        buf[off + 2] = (v >>> 8) & 0xff;
        buf[off + 3] = v & 0xff;
      };
      w32(0, d);
      w32(4, 1);
      w32(8, m);
      w32(12, 1);
      w32(16, s);
      w32(20, 100);
      return buf;
    };
    const latRef = opts.gps.lat >= 0 ? 'N' : 'S';
    const lonRef = opts.gps.lon >= 0 ? 'E' : 'W';
    gpsEntries.push({ tag: 0x0001, type: 2, count: 2, data: ascii(latRef) });
    gpsEntries.push({ tag: 0x0002, type: 5, count: 3, data: ratBytes(Math.abs(opts.gps.lat)) });
    gpsEntries.push({ tag: 0x0003, type: 2, count: 2, data: ascii(lonRef) });
    gpsEntries.push({ tag: 0x0004, type: 5, count: 3, data: ratBytes(Math.abs(opts.gps.lon)) });
  }
  ifd0.sort((a, b) => a.tag - b.tag);
  gpsEntries.sort((a, b) => a.tag - b.tag);

  const subPointerCount = (useExif ? 1 : 0) + (useGps ? 1 : 0);
  const ifd0Count = ifd0.length + subPointerCount;
  const ifd0Size = 2 + 12 * ifd0Count + 4;
  const exifSubSize = useExif ? 2 + 12 * exifSub.length + 4 : 0;
  const gpsSize = useGps ? 2 + 12 * gpsEntries.length + 4 : 0;
  const longDataStart = 8 + ifd0Size + exifSubSize + gpsSize;

  type EntryWithOff = Entry & { externalOffset?: number };
  let poolOffset = longDataStart;
  const pool: Uint8Array[] = [];
  const allGroups: EntryWithOff[][] = [
    ifd0 as EntryWithOff[],
    exifSub as EntryWithOff[],
    gpsEntries as EntryWithOff[],
  ];
  for (const g of allGroups) {
    for (const e of g) {
      if (e.data.length > 4) {
        e.externalOffset = poolOffset;
        pool.push(e.data);
        poolOffset += e.data.length;
      }
    }
  }
  const tiff = new Uint8Array(poolOffset);
  tiff[0] = 0x4d;
  tiff[1] = 0x4d;
  tiff[2] = 0x00;
  tiff[3] = 0x2a;
  tiff[4] = 0;
  tiff[5] = 0;
  tiff[6] = 0;
  tiff[7] = 8;
  const w16 = (off: number, v: number): void => {
    tiff[off] = (v >>> 8) & 0xff;
    tiff[off + 1] = v & 0xff;
  };
  const w32 = (off: number, v: number): void => {
    tiff[off] = (v >>> 24) & 0xff;
    tiff[off + 1] = (v >>> 16) & 0xff;
    tiff[off + 2] = (v >>> 8) & 0xff;
    tiff[off + 3] = v & 0xff;
  };
  function writeIfd(
    startOff: number,
    entries: EntryWithOff[],
    extras: Array<{ tag: number; target: number }>,
  ): void {
    const cnt = entries.length + extras.length;
    w16(startOff, cnt);
    let cursor = startOff + 2;
    for (const e of entries) {
      w16(cursor, e.tag);
      w16(cursor + 2, e.type);
      w32(cursor + 4, e.count);
      if (e.externalOffset !== undefined) {
        w32(cursor + 8, e.externalOffset);
      } else {
        tiff[cursor + 8] = e.data[0] ?? 0;
        tiff[cursor + 9] = e.data[1] ?? 0;
        tiff[cursor + 10] = e.data[2] ?? 0;
        tiff[cursor + 11] = e.data[3] ?? 0;
      }
      cursor += 12;
    }
    for (const p of extras) {
      w16(cursor, p.tag);
      w16(cursor + 2, 4);
      w32(cursor + 4, 1);
      w32(cursor + 8, p.target);
      cursor += 12;
    }
    w32(cursor, 0);
  }
  const ifd0Start = 8;
  const exifSubStart = ifd0Start + ifd0Size;
  const gpsStart = useExif ? exifSubStart + exifSubSize : exifSubStart;
  const extras: Array<{ tag: number; target: number }> = [];
  if (useExif) extras.push({ tag: 0x8769, target: exifSubStart });
  if (useGps) extras.push({ tag: 0x8825, target: gpsStart });
  writeIfd(ifd0Start, ifd0 as EntryWithOff[], extras);
  if (useExif) writeIfd(exifSubStart, exifSub as EntryWithOff[], []);
  if (useGps) writeIfd(gpsStart, gpsEntries as EntryWithOff[], []);
  let cursor = longDataStart;
  for (const chunk of pool) {
    tiff.set(chunk, cursor);
    cursor += chunk.length;
  }
  return tiff;
}

export interface WebpBuildOpts {
  artist?: string;
  software?: string;
  gps?: { lat: number; lon: number };
  xmp?: string;
  iccProfile?: Uint8Array;
}

export function makeWebp(opts: WebpBuildOpts = {}): Uint8Array {
  const chunks: Uint8Array[] = [];
  const hasExif =
    opts.artist !== undefined || opts.software !== undefined || opts.gps !== undefined;
  const hasXmp = opts.xmp !== undefined;
  const hasIcc = opts.iccProfile !== undefined;

  // VP8X: 10 bytes — flags(1) + reserved(3) + canvasW-1 (3 LE) + canvasH-1 (3 LE)
  const vp8x = new Uint8Array(10);
  let flags = 0;
  if (hasIcc) flags |= 0x20;
  if (hasExif) flags |= 0x08;
  if (hasXmp) flags |= 0x04;
  vp8x[0] = flags;
  // width-1 = 0, height-1 = 0 → represents 1×1
  chunks.push(makeChunk('VP8X', vp8x));

  if (hasIcc && opts.iccProfile) {
    chunks.push(makeChunk('ICCP', opts.iccProfile));
  }
  // VP8L data — minimal: 1 byte signature 0x2f + bits saying width=1, height=1, alpha=0, version=0
  // We don't actually decode it, but include something plausible.
  const vp8l = new Uint8Array([0x2f, 0x00, 0x00, 0x00, 0x10, 0x00, 0x00, 0x00, 0x00, 0x00]);
  chunks.push(makeChunk('VP8L', vp8l));

  if (hasExif) {
    const tiff = buildExifTiffBE({
      ...(opts.artist !== undefined ? { artist: opts.artist } : {}),
      ...(opts.software !== undefined ? { software: opts.software } : {}),
      ...(opts.gps !== undefined ? { gps: opts.gps } : {}),
    });
    chunks.push(makeChunk('EXIF', tiff));
  }
  if (hasXmp && opts.xmp !== undefined) {
    const enc = new TextEncoder();
    chunks.push(makeChunk('XMP ', enc.encode(opts.xmp)));
  }

  // Assemble.
  let inner = 4;
  for (const c of chunks) inner += c.length;
  const out = new Uint8Array(8 + inner);
  out.set(fourcc('RIFF'), 0);
  writeU32LE(out, 4, inner);
  out.set(fourcc('WEBP'), 8);
  let off = 12;
  for (const c of chunks) {
    out.set(c, off);
    off += c.length;
  }
  return out;
}
