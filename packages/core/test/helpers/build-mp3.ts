// Synthetic MP3 fixture builder.
//
// Builds: [ID3v2.3 header with TIT2/TPE1/TALB frames] + [N silent MPEG frames]
//         + optional [ID3v1 trailer]
//
// The MPEG frame template encodes one frame of MPEG-1 Layer III @ 128 kbps,
// 44.1 kHz, stereo joint, with 4 padding bits worth of zeroed audio data.
// We don't claim it's playable through every decoder, but it is a valid sync
// frame so music-metadata can detect format/bitrate/sampleRate from it.

import { writeUInt32BE } from '../../src/utils/bytes.js';

function asciiBytes(s: string): Uint8Array {
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i += 1) out[i] = s.charCodeAt(i) & 0xff;
  return out;
}

/**
 * Encode a u32 as four 7-bit big-endian "syncsafe" bytes (the size field
 * of ID3v2). Each byte's MSB is zero.
 */
function syncsafe(n: number): Uint8Array {
  const out = new Uint8Array(4);
  out[0] = (n >>> 21) & 0x7f;
  out[1] = (n >>> 14) & 0x7f;
  out[2] = (n >>> 7) & 0x7f;
  out[3] = n & 0x7f;
  return out;
}

/**
 * Build an ID3v2.3 text frame.
 *   frame_id(4) + size(u32 BE) + flags(2) + encoding(1=ISO-8859-1 / 0) + text
 */
function buildTextFrame(id: string, text: string, encoding: 0 | 1 = 0): Uint8Array {
  // encoding=0 -> ISO-8859-1 (no BOM, NUL terminator optional)
  const textBytes = asciiBytes(text);
  const body = new Uint8Array(1 + textBytes.length);
  body[0] = encoding;
  body.set(textBytes, 1);

  const header = new Uint8Array(10);
  for (let i = 0; i < 4; i += 1) header[i] = id.charCodeAt(i) & 0xff;
  writeUInt32BE(header, 4, body.length); // ID3v2.3 uses plain BE, not syncsafe.
  header[8] = 0;
  header[9] = 0;

  const out = new Uint8Array(header.length + body.length);
  out.set(header, 0);
  out.set(body, header.length);
  return out;
}

// One synthetic MPEG-1 Layer III frame at 44.1kHz, 128kbps, stereo joint.
// Bytes: 0xFF, 0xFB (sync + version=1 + layer=3 + no CRC), 0x90 (bitrate=128,
// samplerate=44.1, no padding, private=0), 0x64 (channel=joint stereo,
// extension=0, copyright=0, original=0, emphasis=00). Followed by 414 bytes
// of zero (= side info + spectrum). 128000 * 144 / 44100 = 418.18 bytes per
// frame, so we use 418 total.
const MPEG_FRAME_BYTES = (() => {
  const out = new Uint8Array(418);
  out[0] = 0xff;
  out[1] = 0xfb;
  out[2] = 0x90;
  out[3] = 0x64;
  return out;
})();

export interface Id3v1Fields {
  title?: string;
  artist?: string;
  album?: string;
  year?: string;
  comment?: string;
}

function buildId3v1(fields: Id3v1Fields): Uint8Array {
  const out = new Uint8Array(128);
  out.set(asciiBytes('TAG'), 0);
  const place = (s: string | undefined, off: number, max: number): void => {
    if (!s) return;
    const b = asciiBytes(s).subarray(0, max);
    out.set(b, off);
  };
  place(fields.title, 3, 30);
  place(fields.artist, 33, 30);
  place(fields.album, 63, 30);
  place(fields.year, 93, 4);
  place(fields.comment, 97, 30);
  out[127] = 0; // genre
  return out;
}

export interface Mp3BuildOpts {
  title?: string;
  artist?: string;
  album?: string;
  /** Number of MPEG frames after the ID3 prefix. */
  frames?: number;
  /** Append an ID3v1 trailer with these fields. */
  id3v1?: Id3v1Fields;
}

export function makeMp3(opts: Mp3BuildOpts = {}): Uint8Array {
  const frames: Uint8Array[] = [];
  if (opts.title) frames.push(buildTextFrame('TIT2', opts.title));
  if (opts.artist) frames.push(buildTextFrame('TPE1', opts.artist));
  if (opts.album) frames.push(buildTextFrame('TALB', opts.album));

  let framesTotal = 0;
  for (const f of frames) framesTotal += f.length;

  // Add 32 bytes of padding so the tag isn't completely flush against the
  // first MPEG frame (some decoders rely on a little slack).
  const padding = 32;
  const tagBodyLen = framesTotal + padding;

  // ID3v2.3 header: "ID3" 0x03 0x00 flags(0x00) syncsafe(size)
  const header = new Uint8Array(10);
  header[0] = 0x49; // I
  header[1] = 0x44; // D
  header[2] = 0x33; // 3
  header[3] = 0x03;
  header[4] = 0x00;
  header[5] = 0x00;
  header.set(syncsafe(tagBodyLen), 6);

  const mpegCount = Math.max(1, opts.frames ?? 2);
  const mpegBytes = new Uint8Array(mpegCount * MPEG_FRAME_BYTES.length);
  for (let i = 0; i < mpegCount; i += 1) {
    mpegBytes.set(MPEG_FRAME_BYTES, i * MPEG_FRAME_BYTES.length);
  }

  let total = header.length + tagBodyLen + mpegBytes.length;
  if (opts.id3v1) total += 128;

  const out = new Uint8Array(total);
  let off = 0;
  out.set(header, off);
  off += header.length;
  for (const f of frames) {
    out.set(f, off);
    off += f.length;
  }
  // padding zeros are implicit
  off += padding;
  out.set(mpegBytes, off);
  off += mpegBytes.length;
  if (opts.id3v1) {
    out.set(buildId3v1(opts.id3v1), off);
  }
  return out;
}
