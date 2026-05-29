// Synthetic M4A (ISOBMFF) fixture builder.
//
// Layout:
//   ftyp (M4A )
//   moov
//     mvhd
//     udta
//       meta (4 bytes version/flags + 'hdlr' + 'ilst')
//         hdlr
//         ilst
//           ©nam -> data(utf8, "Test Title")
//           ©ART -> data(utf8, "Anton")
//           ©too -> data(utf8, "MetaScrub Tests")
//   mdat (tiny stub)
//
// We don't add valid track boxes (trak/mdia/etc) — the scrub test only
// requires that we can locate moov.udta and rewrite moov afterwards. The
// resulting bytes are technically not a playable M4A, but the parse/scrub
// path doesn't care.

import { writeUInt32BE } from '../../src/utils/bytes.js';

function asciiBytes(s: string): Uint8Array {
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i += 1) out[i] = s.charCodeAt(i) & 0xff;
  return out;
}

function utf8(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

function concat(parts: Uint8Array[]): Uint8Array {
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

/** Box header: size(u32 BE) + 4-char ASCII type. Returns [header, ...body]. */
function box(type: string, body: Uint8Array): Uint8Array {
  if (type.length !== 4) throw new Error(`Box type must be 4 chars: "${type}"`);
  const size = 8 + body.length;
  const header = new Uint8Array(8);
  writeUInt32BE(header, 0, size);
  // Force per-byte copy because © and other non-ASCII chars need explicit
  // codePointAt mapping.
  for (let i = 0; i < 4; i += 1) {
    const cp = type.codePointAt(i);
    if (cp === undefined) throw new Error('Box type too short');
    header[4 + i] = cp & 0xff;
  }
  return concat([header, body]);
}

function buildFtyp(): Uint8Array {
  // major brand "M4A ", minor version = 0, compat brands = ["M4A ","mp42","isom"]
  const body = concat([
    asciiBytes('M4A '),
    new Uint8Array(4), // minor
    asciiBytes('M4A '),
    asciiBytes('mp42'),
    asciiBytes('isom'),
  ]);
  return box('ftyp', body);
}

function buildMvhd(): Uint8Array {
  // version=0, flags=0 + minimal fields. We use the version 0 layout.
  const body = new Uint8Array(100);
  // First 4 bytes = version + flags (all zero)
  // Timescale at offset 12 (after creation/mod times)
  writeUInt32BE(body, 12, 1000);
  // Duration at offset 16
  writeUInt32BE(body, 16, 0);
  // Preferred rate (fixed 16.16) = 1.0
  writeUInt32BE(body, 20, 0x00010000);
  // Volume (fixed 8.8) = 1.0 at offset 24 (then 2 reserved)
  body[24] = 0x01;
  // Skip matrix + reserved + next track id
  writeUInt32BE(body, 96, 2);
  return box('mvhd', body);
}

/**
 * Build a single iTunes-style metadata item:
 *   <type> { data { type_indicator=1(utf8) + locale=0 + payload } }
 */
function ilstItem(type: string, value: string): Uint8Array {
  const payload = utf8(value);
  const dataBody = concat([
    Uint8Array.from([0x00, 0x00, 0x00, 0x01]), // type indicator: utf-8
    new Uint8Array(4), // locale = 0
    payload,
  ]);
  const dataBox = box('data', dataBody);
  return box(type, dataBox);
}

function buildIlst(items: Array<{ type: string; value: string }>): Uint8Array {
  const children = items.map((it) => ilstItem(it.type, it.value));
  return box('ilst', concat(children));
}

function buildHdlr(): Uint8Array {
  // For 'meta', handler type is 'mdir' with name 'appl'.
  const body = new Uint8Array(32);
  // 4 bytes version+flags (zero)
  // 4 bytes pre_defined (zero)
  // 4 bytes handler_type = "mdir"
  body.set(asciiBytes('mdir'), 8);
  // 12 bytes reserved
  // 8 bytes name string: "appl\0" (null-terminated) — fits in remaining 8
  body.set(asciiBytes('appl\0'), 24);
  return box('hdlr', body);
}

function buildMeta(items: Array<{ type: string; value: string }>): Uint8Array {
  // meta has a 4-byte version+flags header before child boxes.
  const inner = concat([buildHdlr(), buildIlst(items)]);
  const body = concat([new Uint8Array(4), inner]);
  return box('meta', body);
}

function buildUdta(items: Array<{ type: string; value: string }>): Uint8Array {
  return box('udta', buildMeta(items));
}

function buildMoov(items: Array<{ type: string; value: string }>): Uint8Array {
  return box('moov', concat([buildMvhd(), buildUdta(items)]));
}

function buildMdat(size: number): Uint8Array {
  return box('mdat', new Uint8Array(size));
}

export interface M4aBuildOpts {
  title?: string;
  artist?: string;
  album?: string;
  encoder?: string;
  /** Bytes of fake mdat payload (irrelevant for metadata tests). */
  mdatBytes?: number;
}

export function makeM4a(opts: M4aBuildOpts = {}): Uint8Array {
  const items: Array<{ type: string; value: string }> = [];
  if (opts.title) items.push({ type: '©nam', value: opts.title });
  if (opts.artist) items.push({ type: '©ART', value: opts.artist });
  if (opts.album) items.push({ type: '©alb', value: opts.album });
  if (opts.encoder) items.push({ type: '©too', value: opts.encoder });
  const ftyp = buildFtyp();
  const moov = buildMoov(items);
  const mdat = buildMdat(opts.mdatBytes ?? 32);
  return concat([ftyp, moov, mdat]);
}
