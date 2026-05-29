// Synthetic ISOBMFF fixture builder for MP4 / MOV tests.
//
// Produces a minimal valid ISO container with:
//   - ftyp box (configurable brand)
//   - moov box (mvhd + udta(meta(ilst(items)) + ©xyz?))
//   - mdat box (single byte payload)
//
// Not a real playable video — but the byte layout is correct enough to be
// parsed by our walker and scrubbed safely.

import { writeUInt32BE, concatBytes } from '../../src/utils/bytes.js';

function asciiBytes(s: string): Uint8Array {
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i += 1) out[i] = s.charCodeAt(i) & 0xff;
  return out;
}

function box(type: string, payload: Uint8Array): Uint8Array {
  const total = 8 + payload.length;
  const out = new Uint8Array(total);
  writeUInt32BE(out, 0, total);
  for (let i = 0; i < 4; i += 1) out[4 + i] = type.charCodeAt(i) & 0xff;
  out.set(payload, 8);
  return out;
}

function ftypBox(brand: string): Uint8Array {
  // brand (4) + minor version (4) + compatible brands (variable). Single brand only.
  const payload = new Uint8Array(8 + 4);
  for (let i = 0; i < 4; i += 1) payload[i] = brand.charCodeAt(i) & 0xff;
  // minor version: 0
  // compatible brands: just the same brand
  for (let i = 0; i < 4; i += 1) payload[8 + i] = brand.charCodeAt(i) & 0xff;
  return box('ftyp', payload);
}

function mvhdBox(): Uint8Array {
  // version=0, flags=0, creation_time=0, modification_time=0, timescale=600,
  // duration=0, rate=0x00010000, volume=0x0100, reserved(10), matrix(36),
  // pre_defined(24), next_track_ID=2
  const payload = new Uint8Array(100);
  // version + flags (4 bytes) = 0
  // creation_time (4), modification_time (4), timescale (4)
  writeUInt32BE(payload, 12, 600);
  // duration (4) = 0
  // rate (4) = 0x00010000
  writeUInt32BE(payload, 20, 0x00010000);
  // volume (2) = 0x0100
  payload[24] = 0x01;
  payload[25] = 0x00;
  // reserved (10) = 0
  // matrix (36): identity-ish
  writeUInt32BE(payload, 36, 0x00010000); // a
  writeUInt32BE(payload, 52, 0x00010000); // e
  writeUInt32BE(payload, 68, 0x40000000); // i (1.0 in 2.30)
  // pre_defined (24) = 0
  // next_track_ID
  writeUInt32BE(payload, 96, 2);
  return box('mvhd', payload);
}

function ilstDataBox(typeIndicator: number, value: Uint8Array): Uint8Array {
  // type-indicator (4) + locale (4) + value
  const payload = new Uint8Array(8 + value.length);
  writeUInt32BE(payload, 0, typeIndicator);
  // locale = 0
  payload.set(value, 8);
  return box('data', payload);
}

function ilstItem(fourcc: string, text: string): Uint8Array {
  return box(fourcc, ilstDataBox(1, asciiBytes(text)));
}

function ilstBox(items: Uint8Array[]): Uint8Array {
  return box('ilst', concatBytes(items));
}

function metaBox(ilst: Uint8Array): Uint8Array {
  // FullBox: version (1) + flags (3) + handler + ilst
  // For simplicity our parser tolerates both with/without the version+flags.
  // We include the spec-correct version+flags + a minimal hdlr.
  const versionFlags = new Uint8Array(4); // all zeros
  // Minimal hdlr: version+flags (4) + predefined (4) + handler_type "mdir" (4) +
  // reserved (12) + name "\0"
  const hdlrPayload = new Uint8Array(4 + 4 + 4 + 12 + 1);
  // handler_type at offset 8
  hdlrPayload[8] = 'm'.charCodeAt(0);
  hdlrPayload[9] = 'd'.charCodeAt(0);
  hdlrPayload[10] = 'i'.charCodeAt(0);
  hdlrPayload[11] = 'r'.charCodeAt(0);
  // name byte: null terminator already
  const hdlr = box('hdlr', hdlrPayload);
  return box('meta', concatBytes([versionFlags, hdlr, ilst]));
}

function xyzBox(text: string): Uint8Array {
  // ©xyz payload: text-length BE16 + language BE16 + ASCII text
  const t = asciiBytes(text);
  const payload = new Uint8Array(4 + t.length);
  payload[0] = (t.length >>> 8) & 0xff;
  payload[1] = t.length & 0xff;
  // language = 0 (or any 16-bit value)
  payload.set(t, 4);
  // ©xyz is a 4-char box name with the copyright glyph (0xA9).
  return box('\xa9xyz', payload);
}

function udtaBox(opts: Mp4BuildOpts): Uint8Array {
  const items: Uint8Array[] = [];
  if (opts.title) items.push(ilstItem('\xa9nam', opts.title));
  if (opts.artist) items.push(ilstItem('\xa9ART', opts.artist));
  if (opts.year) items.push(ilstItem('\xa9day', opts.year));
  if (opts.comment) items.push(ilstItem('\xa9cmt', opts.comment));
  if (opts.encodingTool) items.push(ilstItem('\xa9too', opts.encodingTool));

  const parts: Uint8Array[] = [];
  if (items.length) {
    parts.push(metaBox(ilstBox(items)));
  }
  if (opts.location) {
    parts.push(xyzBox(opts.location));
  }
  return box('udta', concatBytes(parts));
}

function moovBox(opts: Mp4BuildOpts): Uint8Array {
  const children: Uint8Array[] = [mvhdBox()];
  // Skip trak for simplicity — it's not required for our metadata-only tests.
  if (
    opts.title ||
    opts.artist ||
    opts.year ||
    opts.comment ||
    opts.encodingTool ||
    opts.location
  ) {
    children.push(udtaBox(opts));
  }
  return box('moov', concatBytes(children));
}

function mdatBox(): Uint8Array {
  // Minimal mdat with one byte of "payload".
  return box('mdat', new Uint8Array([0x00]));
}

export interface Mp4BuildOpts {
  brand?: string;
  title?: string;
  artist?: string;
  year?: string;
  comment?: string;
  encodingTool?: string;
  /** ISO 6709 location string, e.g. "+37.7749-122.4194/". */
  location?: string;
  /** Omit the ftyp box (older QuickTime layout). */
  noFtyp?: boolean;
}

export function makeMp4(opts: Mp4BuildOpts = {}): Uint8Array {
  const brand = opts.brand ?? 'mp42';
  const parts: Uint8Array[] = [];
  if (!opts.noFtyp) parts.push(ftypBox(brand));
  parts.push(moovBox(opts));
  parts.push(mdatBox());
  return concatBytes(parts);
}

export function makeMov(opts: Mp4BuildOpts = {}): Uint8Array {
  return makeMp4({ ...opts, brand: 'qt  ' });
}
