// Synthetic FLAC fixture builder.
//
// Layout: "fLaC" + STREAMINFO + VORBIS_COMMENT + a small fake audio payload.
// The audio payload is bogus (not a real frame), but the parser only reads
// metadata blocks before the audio so it never inspects it.

const FLAC_MAGIC = [0x66, 0x4c, 0x61, 0x43];
const BLOCK_STREAMINFO = 0;
const BLOCK_VORBIS_COMMENT = 4;
const BLOCK_PADDING = 1;

function utf8(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

function writeU32LE(b: Uint8Array, off: number, v: number): void {
  b[off] = v & 0xff;
  b[off + 1] = (v >>> 8) & 0xff;
  b[off + 2] = (v >>> 16) & 0xff;
  b[off + 3] = (v >>> 24) & 0xff;
}

function makeBlockHeader(type: number, isLast: boolean, length: number): Uint8Array {
  const out = new Uint8Array(4);
  out[0] = (isLast ? 0x80 : 0) | (type & 0x7f);
  out[1] = (length >>> 16) & 0xff;
  out[2] = (length >>> 8) & 0xff;
  out[3] = length & 0xff;
  return out;
}

/**
 * STREAMINFO body (34 bytes).
 *
 * Fields (bit-packed big-endian):
 *   min_block_size(16) = 4096
 *   max_block_size(16) = 4096
 *   min_frame_size(24) = 0
 *   max_frame_size(24) = 0
 *   sample_rate(20)    = 44100
 *   channels-1(3)      = 1 (stereo)
 *   bits_per_sample-1(5) = 15 (16-bit)
 *   total_samples(36)  = 0
 *   md5(128)           = zeros
 */
function makeStreamInfo(): Uint8Array {
  const body = new Uint8Array(34);
  // min_block_size = 4096
  body[0] = 0x10;
  body[1] = 0x00;
  // max_block_size = 4096
  body[2] = 0x10;
  body[3] = 0x00;
  // min/max frame size = 0 -> bytes 4..9 zero
  // sample_rate(20) | channels-1(3) | bps-1(5) | totalSamples_hi(4)
  // sample_rate = 44100 = 0xAC44 -> 20 bits: 0x0AC44
  // channels-1 = 1, bps-1 = 15 (0x0F), total_samples_hi = 0
  // Pack: 20 bits sr, 3 bits ch, 5 bits bps, 4 bits hi
  // sr=44100 => 20 bits => "0000 1010 1100 0100 0100"
  // bytes 10..11 = high 16 bits of sample_rate = 0x0AC4
  // byte 12 high nibble = low 4 bits of sample_rate = 0x4
  //   low nibble = (channels-1 << 1) | (bps-1 >> 4) = (1 << 1) | 0 = 0x2
  // byte 13 high nibble = low 4 bits of bps-1 = 0xF (so bps=16)
  //   low nibble = high 4 bits of total samples = 0
  body[10] = 0x0a;
  body[11] = 0xc4;
  body[12] = 0x42; // 0x4 high, 0x2 low
  body[13] = 0xf0;
  // bytes 14..17 = low 32 bits of total_samples = 0
  // bytes 18..33 = MD5 = zero
  return body;
}

/**
 * Build a VORBIS_COMMENT body.
 *
 * Layout: vendor_len(u32 LE) + vendor + list_len(u32 LE) + N * (len(u32 LE) + "KEY=VAL")
 */
export function makeVorbisComment(
  vendor: string,
  comments: Array<{ key: string; value: string }>,
): Uint8Array {
  const vendorBytes = utf8(vendor);
  const entries = comments.map((c) => utf8(`${c.key}=${c.value}`));
  let total = 4 + vendorBytes.length + 4;
  for (const e of entries) total += 4 + e.length;
  const out = new Uint8Array(total);
  let off = 0;
  writeU32LE(out, off, vendorBytes.length);
  off += 4;
  out.set(vendorBytes, off);
  off += vendorBytes.length;
  writeU32LE(out, off, entries.length);
  off += 4;
  for (const e of entries) {
    writeU32LE(out, off, e.length);
    off += 4;
    out.set(e, off);
    off += e.length;
  }
  return out;
}

export interface FlacBuildOpts {
  vendor?: string;
  comments?: Array<{ key: string; value: string }>;
  /** Include a padding block (drops on scrub). */
  padding?: number;
  /** Fake audio payload. */
  audioBytes?: number;
}

export function makeFlac(opts: FlacBuildOpts = {}): Uint8Array {
  const parts: Uint8Array[] = [];
  parts.push(Uint8Array.from(FLAC_MAGIC));

  const streamInfo = makeStreamInfo();
  const vorbisComment = makeVorbisComment(opts.vendor ?? 'metascrub-test', opts.comments ?? []);

  const blocks: Array<{ type: number; body: Uint8Array }> = [
    { type: BLOCK_STREAMINFO, body: streamInfo },
    { type: BLOCK_VORBIS_COMMENT, body: vorbisComment },
  ];
  if (opts.padding && opts.padding > 0) {
    blocks.push({ type: BLOCK_PADDING, body: new Uint8Array(opts.padding) });
  }

  blocks.forEach((b, i) => {
    const isLast = i === blocks.length - 1;
    parts.push(makeBlockHeader(b.type, isLast, b.body.length));
    parts.push(b.body);
  });

  // Fake audio payload — required so the file isn't trivially short.
  const audio = new Uint8Array(opts.audioBytes ?? 64);
  parts.push(audio);

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
