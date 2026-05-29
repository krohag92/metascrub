// Helpers to build synthetic JPEG/PNG fixtures with controlled metadata.
// We construct everything from scratch so we don't need to ship binary fixtures.

import { writeUInt16BE } from '../../src/utils/bytes.js';

const EXIF_HEADER = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00];
const XMP_HEADER = [
  0x68, 0x74, 0x74, 0x70, 0x3a, 0x2f, 0x2f, 0x6e, 0x73, 0x2e, 0x61, 0x64, 0x6f, 0x62, 0x65, 0x2e,
  0x63, 0x6f, 0x6d, 0x2f, 0x78, 0x61, 0x70, 0x2f, 0x31, 0x2e, 0x30, 0x2f, 0x00,
];
const PHOTOSHOP_HEADER = [
  // "Photoshop 3.0\0"
  0x50, 0x68, 0x6f, 0x74, 0x6f, 0x73, 0x68, 0x6f, 0x70, 0x20, 0x33, 0x2e, 0x30, 0x00,
];

// Minimal valid baseline 1x1 JPEG body (DQT + SOF0 + DHT + SOS + entropy + EOI).
// No APP segments embedded — we'll prepend them.
const JPEG_BODY = Uint8Array.from([
  // DQT
  0xff, 0xdb, 0x00, 0x43, 0x00, 0x10, 0x0b, 0x0c, 0x0e, 0x0c, 0x0a, 0x10, 0x0e, 0x0d, 0x0e, 0x12,
  0x11, 0x10, 0x13, 0x18, 0x28, 0x1a, 0x18, 0x16, 0x16, 0x18, 0x31, 0x23, 0x25, 0x1d, 0x28, 0x3a,
  0x33, 0x3d, 0x3c, 0x39, 0x33, 0x38, 0x37, 0x40, 0x48, 0x5c, 0x4e, 0x40, 0x44, 0x57, 0x45, 0x37,
  0x38, 0x50, 0x6d, 0x51, 0x57, 0x5f, 0x62, 0x67, 0x68, 0x67, 0x3e, 0x4d, 0x71, 0x79, 0x70, 0x64,
  0x78, 0x5c, 0x65, 0x67, 0x63,
  // SOF0 (baseline DCT) — 1x1 grayscale
  0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x01, 0x11, 0x00,
  // DHT (DC table, identity-ish)
  0xff, 0xc4, 0x00, 0x1f, 0x00, 0x00, 0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a,
  0x0b,
  // DHT (AC table)
  0xff, 0xc4, 0x00, 0xb5, 0x10, 0x00, 0x02, 0x01, 0x03, 0x03, 0x02, 0x04, 0x03, 0x05, 0x05, 0x04,
  0x04, 0x00, 0x00, 0x01, 0x7d, 0x01, 0x02, 0x03, 0x00, 0x04, 0x11, 0x05, 0x12, 0x21, 0x31, 0x41,
  0x06, 0x13, 0x51, 0x61, 0x07, 0x22, 0x71, 0x14, 0x32, 0x81, 0x91, 0xa1, 0x08, 0x23, 0x42, 0xb1,
  0xc1, 0x15, 0x52, 0xd1, 0xf0, 0x24, 0x33, 0x62, 0x72, 0x82, 0x09, 0x0a, 0x16, 0x17, 0x18, 0x19,
  0x1a, 0x25, 0x26, 0x27, 0x28, 0x29, 0x2a, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3a, 0x43, 0x44,
  0x45, 0x46, 0x47, 0x48, 0x49, 0x4a, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59, 0x5a, 0x63, 0x64,
  0x65, 0x66, 0x67, 0x68, 0x69, 0x6a, 0x73, 0x74, 0x75, 0x76, 0x77, 0x78, 0x79, 0x7a, 0x83, 0x84,
  0x85, 0x86, 0x87, 0x88, 0x89, 0x8a, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9a, 0xa2,
  0xa3, 0xa4, 0xa5, 0xa6, 0xa7, 0xa8, 0xa9, 0xaa, 0xb2, 0xb3, 0xb4, 0xb5, 0xb6, 0xb7, 0xb8, 0xb9,
  0xba, 0xc2, 0xc3, 0xc4, 0xc5, 0xc6, 0xc7, 0xc8, 0xc9, 0xca, 0xd2, 0xd3, 0xd4, 0xd5, 0xd6, 0xd7,
  0xd8, 0xd9, 0xda, 0xe1, 0xe2, 0xe3, 0xe4, 0xe5, 0xe6, 0xe7, 0xe8, 0xe9, 0xea, 0xf1, 0xf2, 0xf3,
  0xf4, 0xf5, 0xf6, 0xf7, 0xf8, 0xf9, 0xfa,
  // SOS
  0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00,
  // entropy (1 byte) + EOI
  0x7f, 0xff, 0xd9,
]);

const JFIF_APP0 = Uint8Array.from([
  0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01,
  0x00, 0x00,
]);

export interface JpegBuildOpts {
  /** Big-endian by default. */
  endian?: 'BE' | 'LE';
  orientation?: number; // 1..8
  make?: string;
  model?: string;
  software?: string;
  artist?: string;
  serialNumber?: string;
  dateTimeOriginal?: string;
  gps?: { lat: number; lon: number };
  xmpPacket?: string;
  iptcByline?: string;
  comment?: string;
}

function asciiBytes(s: string): Uint8Array {
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i += 1) out[i] = s.charCodeAt(i) & 0xff;
  return out;
}

function appendSegment(parts: Uint8Array[], marker: number, payload: Uint8Array): void {
  const header = new Uint8Array(4);
  header[0] = 0xff;
  header[1] = marker;
  writeUInt16BE(header, 2, payload.length + 2);
  parts.push(header);
  parts.push(payload);
}

/**
 * Builds an EXIF APP1 payload (Exif\0\0 + TIFF) carrying the requested fields.
 * Uses big-endian TIFF. IFD0 contains the basics, ExifIFD contains DateTime,
 * GPS IFD contains lat/lon.
 */
function buildExifPayload(opts: JpegBuildOpts): Uint8Array {
  const useGps = opts.gps !== undefined;
  const useExifSub = opts.dateTimeOriginal !== undefined || opts.serialNumber !== undefined;

  // Entries to place in IFD0
  type Entry = { tag: number; type: number; count: number; data: Uint8Array };
  const ifd0Entries: Entry[] = [];
  const exifSubEntries: Entry[] = [];
  const gpsEntries: Entry[] = [];

  const enc = (s: string): Uint8Array => {
    // ASCII null-terminated, even length not required
    const b = asciiBytes(s + '\0');
    return b;
  };

  // Orientation
  if (opts.orientation !== undefined) {
    const data = new Uint8Array(4);
    data[0] = (opts.orientation >>> 8) & 0xff;
    data[1] = opts.orientation & 0xff;
    ifd0Entries.push({ tag: 0x0112, type: 3, count: 1, data });
  }
  // Make
  if (opts.make !== undefined) {
    ifd0Entries.push({ tag: 0x010f, type: 2, count: opts.make.length + 1, data: enc(opts.make) });
  }
  // Model
  if (opts.model !== undefined) {
    ifd0Entries.push({ tag: 0x0110, type: 2, count: opts.model.length + 1, data: enc(opts.model) });
  }
  // Software
  if (opts.software !== undefined) {
    ifd0Entries.push({
      tag: 0x0131,
      type: 2,
      count: opts.software.length + 1,
      data: enc(opts.software),
    });
  }
  // Artist
  if (opts.artist !== undefined) {
    ifd0Entries.push({
      tag: 0x013b,
      type: 2,
      count: opts.artist.length + 1,
      data: enc(opts.artist),
    });
  }
  // ExifIFD entries
  if (opts.dateTimeOriginal !== undefined) {
    exifSubEntries.push({
      tag: 0x9003,
      type: 2,
      count: opts.dateTimeOriginal.length + 1,
      data: enc(opts.dateTimeOriginal),
    });
  }
  if (opts.serialNumber !== undefined) {
    exifSubEntries.push({
      tag: 0xa431,
      type: 2,
      count: opts.serialNumber.length + 1,
      data: enc(opts.serialNumber),
    });
  }

  // GPS entries
  if (useGps && opts.gps) {
    const latAbs = Math.abs(opts.gps.lat);
    const lonAbs = Math.abs(opts.gps.lon);
    const latRef = opts.gps.lat >= 0 ? 'N' : 'S';
    const lonRef = opts.gps.lon >= 0 ? 'E' : 'W';
    const ratBytes = (deg: number): Uint8Array => {
      const d = Math.floor(deg);
      const minutes = (deg - d) * 60;
      const m = Math.floor(minutes);
      const seconds = (minutes - m) * 60;
      const s = Math.round(seconds * 100);
      const buf = new Uint8Array(24); // 3 RATIONAL = 3 * (uint32 num + uint32 den)
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
    gpsEntries.push({
      tag: 0x0001,
      type: 2,
      count: 2,
      data: asciiBytes(latRef + '\0'),
    });
    gpsEntries.push({ tag: 0x0002, type: 5, count: 3, data: ratBytes(latAbs) });
    gpsEntries.push({
      tag: 0x0003,
      type: 2,
      count: 2,
      data: asciiBytes(lonRef + '\0'),
    });
    gpsEntries.push({ tag: 0x0004, type: 5, count: 3, data: ratBytes(lonAbs) });
  }

  // Determine offsets. TIFF starts at offset 0 within the payload-after-header.
  // Layout:
  //   [TIFF header 8 bytes]
  //   [IFD0: 2 + 12*N + 4]
  //   [optional ExifSubIFD pointer entry in IFD0]
  //   [optional GPS pointer entry in IFD0]
  //   [ExifSub IFD]
  //   [GPS IFD]
  //   [Long values pool]
  //
  // We'll compute sizes in passes.

  // Sort by tag ascending (EXIF requires sorted IFD entries).
  ifd0Entries.sort((a, b) => a.tag - b.tag);
  exifSubEntries.sort((a, b) => a.tag - b.tag);
  gpsEntries.sort((a, b) => a.tag - b.tag);

  const ifd0EntryCountWithoutSubs = ifd0Entries.length;
  const subPointerCount = (useExifSub ? 1 : 0) + (useGps ? 1 : 0);
  const ifd0EntryCount = ifd0EntryCountWithoutSubs + subPointerCount;
  const ifd0Size = 2 + 12 * ifd0EntryCount + 4; // count + entries + nextIFD
  const exifSubSize = useExifSub ? 2 + 12 * exifSubEntries.length + 4 : 0;
  const gpsSize = useGps ? 2 + 12 * gpsEntries.length + 4 : 0;

  // Long-data pool: any entry whose `data.length` > 4 needs to be stored externally.
  // Compute pool size + per-entry offset.
  const tiffHeaderSize = 8;
  const longDataStart = tiffHeaderSize + ifd0Size + exifSubSize + gpsSize;

  type EntryLayout = Entry & { externalOffset?: number };
  const allEntries: EntryLayout[][] = [
    ifd0Entries as EntryLayout[],
    exifSubEntries as EntryLayout[],
    gpsEntries as EntryLayout[],
  ];

  let poolOffset = longDataStart;
  const poolChunks: Uint8Array[] = [];
  for (const group of allEntries) {
    for (const e of group) {
      if (e.data.length > 4) {
        e.externalOffset = poolOffset;
        // pad to even length? Not strictly required.
        poolChunks.push(e.data);
        poolOffset += e.data.length;
      }
    }
  }

  const totalSize = poolOffset;
  const tiff = new Uint8Array(totalSize);

  // Big-endian TIFF header
  tiff[0] = 0x4d;
  tiff[1] = 0x4d;
  tiff[2] = 0x00;
  tiff[3] = 0x2a;
  // IFD0 offset
  tiff[4] = 0x00;
  tiff[5] = 0x00;
  tiff[6] = 0x00;
  tiff[7] = 0x08;

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
    entries: EntryLayout[],
    extraPointers: Array<{ tag: number; targetOffset: number }>,
  ): void {
    const count = entries.length + extraPointers.length;
    w16(startOff, count);
    let cursor = startOff + 2;
    for (const e of entries) {
      w16(cursor, e.tag);
      w16(cursor + 2, e.type);
      w32(cursor + 4, e.count);
      if (e.externalOffset !== undefined) {
        w32(cursor + 8, e.externalOffset);
      } else {
        // inline up to 4 bytes
        tiff[cursor + 8] = e.data[0] ?? 0;
        tiff[cursor + 9] = e.data[1] ?? 0;
        tiff[cursor + 10] = e.data[2] ?? 0;
        tiff[cursor + 11] = e.data[3] ?? 0;
      }
      cursor += 12;
    }
    for (const p of extraPointers) {
      w16(cursor, p.tag);
      w16(cursor + 2, 4); // LONG
      w32(cursor + 4, 1);
      w32(cursor + 8, p.targetOffset);
      cursor += 12;
    }
    // nextIFD offset = 0
    w32(cursor, 0);
  }

  const ifd0Start = 8;
  const exifSubStart = ifd0Start + ifd0Size;
  const gpsStart = useExifSub ? exifSubStart + exifSubSize : exifSubStart;

  const extra: Array<{ tag: number; targetOffset: number }> = [];
  if (useExifSub) extra.push({ tag: 0x8769, targetOffset: exifSubStart }); // ExifIFD
  if (useGps) extra.push({ tag: 0x8825, targetOffset: gpsStart }); // GPSIFD

  writeIfd(ifd0Start, ifd0Entries as EntryLayout[], extra);
  if (useExifSub) writeIfd(exifSubStart, exifSubEntries as EntryLayout[], []);
  if (useGps) writeIfd(gpsStart, gpsEntries as EntryLayout[], []);

  // Write external pool
  let cursor = longDataStart;
  for (const chunk of poolChunks) {
    tiff.set(chunk, cursor);
    cursor += chunk.length;
  }

  // Prefix with "Exif\0\0"
  const payload = new Uint8Array(EXIF_HEADER.length + tiff.length);
  payload.set(EXIF_HEADER, 0);
  payload.set(tiff, EXIF_HEADER.length);
  return payload;
}

function buildXmpPayload(packet: string): Uint8Array {
  const body = asciiBytes(packet);
  const payload = new Uint8Array(XMP_HEADER.length + body.length);
  payload.set(XMP_HEADER, 0);
  payload.set(body, XMP_HEADER.length);
  return payload;
}

function buildPhotoshopIptcPayload(byline: string): Uint8Array {
  // "Photoshop 3.0\0" + 8BIM 0x0404 (IPTC) + name pad + IPTC dataset bytes.
  const irbHeader = Uint8Array.from([
    ...PHOTOSHOP_HEADER,
    0x38,
    0x42,
    0x49,
    0x4d, // "8BIM"
    0x04,
    0x04, // resource ID 0x0404 = IPTC
    0x00,
    0x00, // name (empty Pascal string + pad)
  ]);
  // IPTC IIM record: marker 0x1c, record=2, dataset=80 (By-line), length-be16, value
  const valueBytes = asciiBytes(byline);
  const iim = new Uint8Array(5 + valueBytes.length);
  iim[0] = 0x1c;
  iim[1] = 0x02;
  iim[2] = 0x50;
  iim[3] = (valueBytes.length >>> 8) & 0xff;
  iim[4] = valueBytes.length & 0xff;
  iim.set(valueBytes, 5);
  // 4-byte big-endian size
  const sizeBytes = new Uint8Array(4);
  sizeBytes[0] = (iim.length >>> 24) & 0xff;
  sizeBytes[1] = (iim.length >>> 16) & 0xff;
  sizeBytes[2] = (iim.length >>> 8) & 0xff;
  sizeBytes[3] = iim.length & 0xff;
  // Pad data to even length
  const padded = iim.length % 2 === 0 ? iim : new Uint8Array([...iim, 0x00]);

  const total = new Uint8Array(irbHeader.length + sizeBytes.length + padded.length);
  total.set(irbHeader, 0);
  total.set(sizeBytes, irbHeader.length);
  total.set(padded, irbHeader.length + sizeBytes.length);
  return total;
}

export function makeJpeg(opts: JpegBuildOpts = {}): Uint8Array {
  const parts: Uint8Array[] = [];
  parts.push(Uint8Array.from([0xff, 0xd8])); // SOI
  parts.push(JFIF_APP0);
  if (
    opts.orientation !== undefined ||
    opts.make !== undefined ||
    opts.model !== undefined ||
    opts.software !== undefined ||
    opts.artist !== undefined ||
    opts.serialNumber !== undefined ||
    opts.dateTimeOriginal !== undefined ||
    opts.gps !== undefined
  ) {
    appendSegment(parts, 0xe1, buildExifPayload(opts));
  }
  if (opts.xmpPacket !== undefined) {
    appendSegment(parts, 0xe1, buildXmpPayload(opts.xmpPacket));
  }
  if (opts.iptcByline !== undefined) {
    appendSegment(parts, 0xed, buildPhotoshopIptcPayload(opts.iptcByline));
  }
  if (opts.comment !== undefined) {
    appendSegment(parts, 0xfe, asciiBytes(opts.comment));
  }
  parts.push(JPEG_BODY);

  // concat
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
