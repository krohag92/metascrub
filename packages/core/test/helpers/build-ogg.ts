// Synthetic OGG/Vorbis fixture builder.
//
// We construct a minimal OGG stream with three packets:
//   - Vorbis identification header (1 packet, packet #0)
//   - Vorbis comment header (1 packet, packet #1) — the tag we care about
//   - A fake "setup" header packet (1 packet, packet #2) so the second page
//     ends with a complete packet.
//
// Page layout follows the spec exactly so the parser can walk it and the OGG
// CRC32 is recomputed for each page.
//
// The identification + setup packets here are NOT valid Vorbis (you couldn't
// decode audio from this file). But they're shaped enough that music-metadata
// will read the comment list, which is what our tests verify.

import { makeVorbisComment } from './build-flac.js';

const OGG_MAGIC = [0x4f, 0x67, 0x67, 0x53]; // "OggS"

function writeU32LE(b: Uint8Array, off: number, v: number): void {
  b[off] = v & 0xff;
  b[off + 1] = (v >>> 8) & 0xff;
  b[off + 2] = (v >>> 16) & 0xff;
  b[off + 3] = (v >>> 24) & 0xff;
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let r = i << 24;
    for (let j = 0; j < 8; j += 1) {
      r = (r << 1) ^ ((r & 0x80000000) !== 0 ? 0x04c11db7 : 0);
    }
    t[i] = r >>> 0;
  }
  return t;
})();

function oggCrc(bytes: Uint8Array): number {
  let crc = 0;
  for (let i = 0; i < bytes.length; i += 1) {
    const idx = (((crc >>> 24) ^ (bytes[i] ?? 0)) & 0xff) >>> 0;
    crc = (((crc << 8) >>> 0) ^ (CRC_TABLE[idx] ?? 0)) >>> 0;
  }
  return crc >>> 0;
}

/**
 * Build a single Ogg page carrying `packets` whose total length fits in the
 * page's segment table (max 255 segments, max 255*255 = 65025 bytes per page).
 *
 * `headerType`: 0x02 = BOS, 0x04 = EOS, 0x01 = continuation.
 */
function buildPage(
  packets: Uint8Array[],
  serial: number,
  sequence: number,
  granulePos: bigint,
  headerType: number,
): Uint8Array {
  const segments: number[] = [];
  for (const pkt of packets) {
    let remaining = pkt.length;
    while (remaining >= 255) {
      segments.push(255);
      remaining -= 255;
    }
    segments.push(remaining);
  }
  if (segments.length > 255) {
    throw new Error('build-ogg: too many segments for a single page');
  }

  let payloadLen = 0;
  for (const p of packets) payloadLen += p.length;

  const headerLen = 27 + segments.length;
  const page = new Uint8Array(headerLen + payloadLen);
  page.set(OGG_MAGIC, 0);
  page[4] = 0; // stream version
  page[5] = headerType & 0xff;
  // granule_position (LE 64-bit)
  const gp = granulePos;
  for (let i = 0; i < 8; i += 1) {
    page[6 + i] = Number((gp >> BigInt(i * 8)) & 0xffn) & 0xff;
  }
  writeU32LE(page, 14, serial);
  writeU32LE(page, 18, sequence);
  // checksum (22..25) starts zero
  page[26] = segments.length;
  for (let s = 0; s < segments.length; s += 1) page[27 + s] = segments[s] ?? 0;

  let off = headerLen;
  for (const pkt of packets) {
    page.set(pkt, off);
    off += pkt.length;
  }

  writeU32LE(page, 22, oggCrc(page));
  return page;
}

/**
 * Vorbis identification header (packet 0).
 *
 *   0x01 + "vorbis" + version(u32 LE = 0) + channels(u8 = 2) +
 *   sample_rate(u32 LE = 44100) + bitrate_max(u32 LE) +
 *   bitrate_nominal(u32 LE) + bitrate_min(u32 LE) +
 *   blocksize_0(4 bits)|blocksize_1(4 bits) + framing_bit(0x01)
 */
function vorbisIdentificationPacket(): Uint8Array {
  const pkt = new Uint8Array(30);
  pkt[0] = 0x01;
  // "vorbis"
  pkt[1] = 0x76;
  pkt[2] = 0x6f;
  pkt[3] = 0x72;
  pkt[4] = 0x62;
  pkt[5] = 0x69;
  pkt[6] = 0x73;
  // version = 0
  // channels
  pkt[11] = 2;
  // sample_rate = 44100
  writeU32LE(pkt, 12, 44100);
  // bitrate fields default to 0
  // blocksizes: blocksize_0 = 6 (64-sample), blocksize_1 = 8 (256-sample).
  // packed: (b1 << 4) | b0
  pkt[28] = (8 << 4) | 6;
  // framing bit
  pkt[29] = 0x01;
  return pkt;
}

/**
 * Build the Vorbis comment header packet (packet 1).
 *
 *   0x03 + "vorbis" + <vorbis-comment block> + framing_bit(0x01)
 */
function vorbisCommentPacket(
  vendor: string,
  comments: Array<{ key: string; value: string }>,
): Uint8Array {
  const block = makeVorbisComment(vendor, comments);
  const out = new Uint8Array(7 + block.length + 1);
  out[0] = 0x03;
  out[1] = 0x76;
  out[2] = 0x6f;
  out[3] = 0x72;
  out[4] = 0x62;
  out[5] = 0x69;
  out[6] = 0x73;
  out.set(block, 7);
  out[out.length - 1] = 0x01;
  return out;
}

/**
 * Fake Vorbis setup-codebook header packet (packet 2). Not a real codebook —
 * just a packet starting with the type+signature so the OGG walker treats it
 * as the third header.
 */
function vorbisSetupPacket(): Uint8Array {
  // Minimum length: type byte + "vorbis" + framing bit. Real setup packets are
  // hundreds of bytes; ours is shorter but legal at the OGG layer.
  const out = new Uint8Array(16);
  out[0] = 0x05;
  out[1] = 0x76;
  out[2] = 0x6f;
  out[3] = 0x72;
  out[4] = 0x62;
  out[5] = 0x69;
  out[6] = 0x73;
  // pad with zeros, then a framing bit at the end.
  out[15] = 0x01;
  return out;
}

export interface OggBuildOpts {
  vendor?: string;
  comments?: Array<{ key: string; value: string }>;
  serial?: number;
  /** Append a couple of fake audio pages so the file isn't header-only. */
  audioPages?: number;
}

export function makeOgg(opts: OggBuildOpts = {}): Uint8Array {
  const serial = opts.serial ?? 0x12345678;
  const id = vorbisIdentificationPacket();
  const comment = vorbisCommentPacket(opts.vendor ?? 'metascrub-test', opts.comments ?? []);
  const setup = vorbisSetupPacket();

  // Page 0: identification header alone, BOS flag.
  const page0 = buildPage([id], serial, 0, 0n, 0x02);
  // Page 1: comment + setup header packets (the spec actually permits comment
  // and setup to live in the same page).
  const page1 = buildPage([comment, setup], serial, 1, 0n, 0x00);

  const pages: Uint8Array[] = [page0, page1];

  // Optional fake audio pages.
  const nAudio = opts.audioPages ?? 1;
  for (let i = 0; i < nAudio; i += 1) {
    const fake = new Uint8Array(32);
    const isLast = i === nAudio - 1;
    pages.push(buildPage([fake], serial, 2 + i, BigInt(1024 * (i + 1)), isLast ? 0x04 : 0x00));
  }

  let total = 0;
  for (const p of pages) total += p.length;
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of pages) {
    out.set(p, off);
    off += p.length;
  }
  return out;
}
