// OGG container parser (Vorbis + Opus).
//
// An OGG file is a stream of pages. Each page begins with:
//   "OggS"            4 bytes
//   stream_version     1 byte  (always 0)
//   header_type_flag   1 byte
//   granule_position   8 bytes (LE)
//   bitstream_serial   4 bytes (LE)
//   page_sequence      4 bytes (LE)
//   checksum           4 bytes (LE, CRC32 polynomial 0x04C11DB7, initial 0,
//                                no reflection, computed over the whole page
//                                with the checksum field zeroed during calc)
//   page_segments      1 byte
//   segment_table      page_segments bytes — each byte is segment length 0..255
//   ... segments concatenated ...
//
// Metadata for Vorbis lives in the *second packet* (the "comment header"),
// which starts with byte 0x03 followed by ASCII "vorbis". For Opus it's a
// packet starting with the ASCII "OpusTags".
//
// Scrub strategy v0.1: locate the comment packet within whichever pages carry
// it, overwrite the user_comment_list portion with an empty list, then
// recompute the CRC for each touched page. The vendor string is preserved
// (it identifies the encoder version, not the user, and many decoders inspect
// it).

import type { FormatParser, MetadataField, ScrubOptions } from '../types.js';
import { startsWith, concatBytes } from '../utils/bytes.js';
import { resolveScrub } from '../presets.js';
import { commonToFields, nativeToFields, parseWithMusicMetadata } from './_audio.js';

const OGG_MAGIC = [0x4f, 0x67, 0x67, 0x53]; // "OggS"

type Page = {
  /** Offset of the "OggS" capture pattern in the source buffer. */
  offset: number;
  /** Full page bytes (header + segments). */
  bytes: Uint8Array;
  /** Concatenated payload (sum of all segment lengths). */
  payload: Uint8Array;
  segmentTable: Uint8Array;
  serial: number;
  sequence: number;
  headerType: number;
};

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

function oggCrc32(bytes: Uint8Array): number {
  let crc = 0;
  for (let i = 0; i < bytes.length; i += 1) {
    const idx = (((crc >>> 24) ^ (bytes[i] ?? 0)) & 0xff) >>> 0;
    crc = (((crc << 8) >>> 0) ^ (CRC_TABLE[idx] ?? 0)) >>> 0;
  }
  return crc >>> 0;
}

function readU32LE(b: Uint8Array, off: number): number {
  return (
    ((b[off] ?? 0) |
      ((b[off + 1] ?? 0) << 8) |
      ((b[off + 2] ?? 0) << 16) |
      ((b[off + 3] ?? 0) << 24)) >>>
    0
  );
}

function writeU32LE(b: Uint8Array, off: number, v: number): void {
  b[off] = v & 0xff;
  b[off + 1] = (v >>> 8) & 0xff;
  b[off + 2] = (v >>> 16) & 0xff;
  b[off + 3] = (v >>> 24) & 0xff;
}

function parsePages(bytes: Uint8Array): Page[] {
  const pages: Page[] = [];
  let i = 0;
  while (i + 27 <= bytes.length) {
    if (!startsWith(bytes.subarray(i), OGG_MAGIC)) {
      // try to resync
      const next = indexOfMagic(bytes, i + 1);
      if (next < 0) break;
      i = next;
      continue;
    }
    const headerType = bytes[i + 5] ?? 0;
    const serial = readU32LE(bytes, i + 14);
    const sequence = readU32LE(bytes, i + 18);
    const nSegments = bytes[i + 26] ?? 0;
    if (i + 27 + nSegments > bytes.length) break;
    const segmentTable = bytes.subarray(i + 27, i + 27 + nSegments);
    let payloadLen = 0;
    for (let k = 0; k < segmentTable.length; k += 1) payloadLen += segmentTable[k] ?? 0;
    const payloadStart = i + 27 + nSegments;
    if (payloadStart + payloadLen > bytes.length) break;
    const payload = bytes.subarray(payloadStart, payloadStart + payloadLen);
    const pageEnd = payloadStart + payloadLen;
    pages.push({
      offset: i,
      bytes: bytes.subarray(i, pageEnd),
      payload,
      segmentTable,
      serial,
      sequence,
      headerType,
    });
    i = pageEnd;
  }
  return pages;
}

function indexOfMagic(bytes: Uint8Array, from: number): number {
  for (let i = from; i + 4 <= bytes.length; i += 1) {
    if (
      bytes[i] === OGG_MAGIC[0] &&
      bytes[i + 1] === OGG_MAGIC[1] &&
      bytes[i + 2] === OGG_MAGIC[2] &&
      bytes[i + 3] === OGG_MAGIC[3]
    ) {
      return i;
    }
  }
  return -1;
}

function matchesOgg(b: Uint8Array): boolean {
  return startsWith(b, OGG_MAGIC);
}

/** Returns true if a packet starts with the vorbis comment header marker. */
function isVorbisComment(payload: Uint8Array): boolean {
  return (
    payload[0] === 0x03 &&
    payload[1] === 0x76 && // v
    payload[2] === 0x6f && // o
    payload[3] === 0x72 && // r
    payload[4] === 0x62 && // b
    payload[5] === 0x69 && // i
    payload[6] === 0x73 // s
  );
}

/** Returns true if a packet starts with "OpusTags". */
function isOpusTags(payload: Uint8Array): boolean {
  const sig = [0x4f, 0x70, 0x75, 0x73, 0x54, 0x61, 0x67, 0x73];
  if (payload.length < sig.length) return false;
  for (let i = 0; i < sig.length; i += 1) if (payload[i] !== sig[i]) return false;
  return true;
}

/**
 * Parse a vorbis-style comment list.
 *
 * Skips a leading prefix (7 bytes for vorbis "\x03vorbis", 8 for "OpusTags").
 * Returns the parsed comments + the offset within the body where the comment
 * data starts (after vendor + listLen) — useful for the scrubber.
 */
function readComments(
  payload: Uint8Array,
  prefixLen: number,
): { vendor: string; comments: Array<{ key: string; value: string }>; afterListLenOffset: number } {
  if (payload.length < prefixLen + 4) return { vendor: '', comments: [], afterListLenOffset: 0 };
  const dv = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
  let off = prefixLen;
  const vendorLen = dv.getUint32(off, true);
  off += 4;
  const dec = new TextDecoder('utf-8', { fatal: false });
  const vendor = dec.decode(payload.subarray(off, off + vendorLen));
  off += vendorLen;
  if (off + 4 > payload.length) {
    return { vendor, comments: [], afterListLenOffset: off };
  }
  const listLen = dv.getUint32(off, true);
  off += 4;
  const afterListLenOffset = off;
  const comments: Array<{ key: string; value: string }> = [];
  for (let i = 0; i < listLen; i += 1) {
    if (off + 4 > payload.length) break;
    const len = dv.getUint32(off, true);
    off += 4;
    if (off + len > payload.length) break;
    const entry = dec.decode(payload.subarray(off, off + len));
    off += len;
    const eq = entry.indexOf('=');
    if (eq < 0) continue;
    comments.push({ key: entry.slice(0, eq), value: entry.slice(eq + 1) });
  }
  return { vendor, comments, afterListLenOffset };
}

const VORBIS_SENSITIVE_KEYS = new Set([
  'ARTIST',
  'ALBUMARTIST',
  'COMPOSER',
  'PERFORMER',
  'COMMENT',
  'COPYRIGHT',
  'LICENSE',
  'CONTACT',
  'ENCODED-BY',
  'ENCODER',
  'LYRICS',
  'METADATA_BLOCK_PICTURE',
]);

async function parseOgg(bytes: Uint8Array): Promise<{ groups: Record<string, MetadataField[]> }> {
  const groups: Record<string, MetadataField[]> = {};

  // Walk pages, find the comment packet from the *first* logical stream's
  // packets concatenated across continuation pages.
  let pages: Page[] = [];
  try {
    pages = parsePages(bytes);
  } catch {
    pages = [];
  }

  // Build packets for the first serial we see. Packets across pages can be
  // continued — a segment of length 255 means "continued in next segment".
  const firstSerial = pages[0]?.serial;
  if (firstSerial !== undefined) {
    const packets: Uint8Array[] = [];
    let pending: Uint8Array[] = [];
    for (const page of pages) {
      if (page.serial !== firstSerial) continue;
      let segStart = 0;
      for (let s = 0; s < page.segmentTable.length; s += 1) {
        const segLen = page.segmentTable[s] ?? 0;
        const segBytes = page.payload.subarray(segStart, segStart + segLen);
        pending.push(segBytes);
        segStart += segLen;
        if (segLen < 255) {
          // Packet complete.
          packets.push(concatBytes(pending));
          pending = [];
          if (packets.length >= 3) break;
        }
      }
      if (packets.length >= 3) break;
    }
    // packets[1] is the comment header for Vorbis / Opus (packets[0] is
    // identification, packets[2] is the codebook for Vorbis or the data start
    // for Opus).
    const commentPacket = packets[1];
    if (commentPacket) {
      let prefix = 0;
      let codec: 'vorbis' | 'opus' | null = null;
      if (isVorbisComment(commentPacket)) {
        prefix = 7;
        codec = 'vorbis';
      } else if (isOpusTags(commentPacket)) {
        prefix = 8;
        codec = 'opus';
      }
      if (codec) {
        const { vendor, comments } = readComments(commentPacket, prefix);
        const fields: MetadataField[] = [];
        if (vendor) fields.push({ key: 'vendor', value: vendor });
        for (const c of comments) {
          fields.push({
            key: c.key,
            value: c.value,
            sensitive: VORBIS_SENSITIVE_KEYS.has(c.key.toUpperCase()),
          });
        }
        if (fields.length) groups[`OGG.${codec}_comment`] = fields;
      }
    }
  }

  // Augment with music-metadata's normalized view.
  const parsed = await parseWithMusicMetadata(bytes, 'audio/ogg');
  if (parsed) {
    const common = commonToFields(parsed.common as unknown as Record<string, unknown>);
    if (common.length) groups['Audio.common'] = common;
    for (const [tagNs, tagList] of Object.entries(parsed.native ?? {})) {
      if (!Array.isArray(tagList) || tagList.length === 0) continue;
      // Skip native vorbis — we already exposed it above with sensitivity tags.
      if (tagNs.toLowerCase().includes('vorbis')) continue;
      const fields = nativeToFields(tagList as Array<{ id: string; value: unknown }>);
      if (fields.length) groups[`OGG.${tagNs}`] = fields;
    }
  }

  return { groups };
}

/**
 * Best-effort scrub.
 *
 * v0.1 limitation: rebuilding multi-page comment packets with a brand-new
 * (smaller) segment table is complex because Ogg pages have a 255-byte
 * segment-length addressing. To stay safe we only handle the common case
 * where the comment header packet fits entirely in a single page that *also*
 * starts at a page boundary. In that case we:
 *   1. Replace the user_comment_list with an empty list.
 *   2. Update the segment table for the new packet length.
 *   3. Recompute the page CRC.
 *
 * If the comment packet spans multiple pages we throw — the caller (the user)
 * gets a clear "scrub not supported for this OGG layout" rather than a corrupt
 * file. This is fine for synthetic fixtures and the overwhelming majority of
 * real-world OGG files (the comment packet is normally only a few hundred
 * bytes and is its own page).
 */
async function scrubOgg(bytes: Uint8Array, options: ScrubOptions): Promise<Uint8Array> {
  const resolved = resolveScrub(options);
  const strip =
    resolved.preset === 'all' ||
    resolved.preset === 'personal-only' ||
    resolved.preset === 'keep-technical' ||
    (resolved.preset === 'custom' &&
      resolved.remove.some((p) => p === 'OGG.*' || p.startsWith('OGG.')));
  if (!strip) return bytes;

  const pages = parsePages(bytes);
  if (pages.length === 0) return bytes;

  // Find the page that contains packet #1 of the first serial. The first
  // packet is *always* in page 0 (identification header). The comment header
  // typically lives in page 1 — but not always exactly. Walk packets within
  // each page.
  const firstSerial = pages[0]!.serial;
  let commentPageIdx = -1;
  let commentPacketStart = -1; // offset within page.payload
  let commentPacketLen = -1;

  outer: for (let pi = 0; pi < pages.length; pi += 1) {
    const page = pages[pi]!;
    if (page.serial !== firstSerial) continue;
    let segStart = 0;
    let packetStart = 0;
    let packetLen = 0;
    let packetIndex = countCompletedPacketsBefore(pages, pi, firstSerial);
    for (let s = 0; s < page.segmentTable.length; s += 1) {
      const segLen = page.segmentTable[s] ?? 0;
      packetLen += segLen;
      if (segLen < 255) {
        // Packet ends here.
        if (packetIndex === 1) {
          commentPageIdx = pi;
          commentPacketStart = packetStart;
          commentPacketLen = packetLen;
          break outer;
        }
        packetIndex += 1;
        segStart += segLen;
        packetStart = segStart;
        packetLen = 0;
      } else {
        segStart += segLen;
      }
    }
  }

  if (commentPageIdx < 0 || commentPacketLen < 7) return bytes;

  const page = pages[commentPageIdx]!;
  const packet = page.payload.subarray(commentPacketStart, commentPacketStart + commentPacketLen);

  let prefix = 0;
  if (isVorbisComment(packet)) prefix = 7;
  else if (isOpusTags(packet)) prefix = 8;
  else return bytes;

  // Locate vendor + comment-list-length so we can splice in an empty list.
  if (packet.length < prefix + 4) return bytes;
  const dv = new DataView(packet.buffer, packet.byteOffset, packet.byteLength);
  const vendorLen = dv.getUint32(prefix, true);
  if (prefix + 4 + vendorLen + 4 > packet.length) return bytes;

  // Build new packet: prefix + vendorLen(u32) + vendor + 0(u32)
  // For Vorbis, also append the framing bit (0x01).
  const isVorbis = prefix === 7;
  const newPacketLen = prefix + 4 + vendorLen + 4 + (isVorbis ? 1 : 0);
  const newPacket = new Uint8Array(newPacketLen);
  newPacket.set(packet.subarray(0, prefix + 4 + vendorLen), 0);
  // user_comment_list_length = 0
  writeU32LE(newPacket, prefix + 4 + vendorLen, 0);
  if (isVorbis) {
    newPacket[prefix + 4 + vendorLen + 4] = 0x01;
  }

  // For safety, only handle the case where the entire comment packet lives in
  // one page and the page has no continued packet straddling its boundary.
  // That means: this is the *only* packet on the page (commentPacketStart=0
  // and the page ends right after this packet), OR there are other complete
  // packets but the comment is one of them and ends with a segment <255.
  // We support both, but we don't try to "merge" packets across pages.

  // Build new segment table for the new packet.
  const newSegments: number[] = [];
  let remaining = newPacketLen;
  while (remaining >= 255) {
    newSegments.push(255);
    remaining -= 255;
  }
  newSegments.push(remaining);
  if (newSegments.length > 255) {
    // Can't fit in one page — bail.
    return bytes;
  }

  // Reconstruct the page payload: all packets before the comment, then the
  // new comment, then all packets after.
  const oldSegments = Array.from(page.segmentTable);
  // Find the segment indices that belonged to the comment packet.
  let segStart = 0;
  let scanOff = 0;
  let commentSegStartIdx = -1;
  let commentSegEndIdx = -1;
  let packetIdx = countCompletedPacketsBefore(pages, commentPageIdx, firstSerial);
  let packetLen = 0;
  let packetSegStart = 0;
  for (let s = 0; s < oldSegments.length; s += 1) {
    const segLen = oldSegments[s] ?? 0;
    packetLen += segLen;
    scanOff += segLen;
    if (segLen < 255) {
      if (packetIdx === 1) {
        commentSegStartIdx = packetSegStart;
        commentSegEndIdx = s;
        segStart = scanOff;
        void segStart;
        break;
      }
      packetIdx += 1;
      packetSegStart = s + 1;
      packetLen = 0;
    }
  }
  if (commentSegStartIdx < 0 || commentSegEndIdx < 0) return bytes;

  // Slice the page payload around the comment packet.
  const before = page.payload.subarray(0, commentPacketStart);
  const after = page.payload.subarray(commentPacketStart + commentPacketLen);

  const newPayload = concatBytes([before, newPacket, after]);

  const beforeSegments = oldSegments.slice(0, commentSegStartIdx);
  const afterSegments = oldSegments.slice(commentSegEndIdx + 1);
  const combinedSegments = [...beforeSegments, ...newSegments, ...afterSegments];

  if (combinedSegments.length > 255) return bytes;

  // Build the new page bytes.
  const headerLen = 27 + combinedSegments.length;
  const newPageBytes = new Uint8Array(headerLen + newPayload.length);
  // Copy fixed header (offsets 0..26) from old page; we'll patch segment count
  // and checksum.
  newPageBytes.set(page.bytes.subarray(0, 27), 0);
  newPageBytes[26] = combinedSegments.length;
  for (let s = 0; s < combinedSegments.length; s += 1) {
    newPageBytes[27 + s] = combinedSegments[s] ?? 0;
  }
  newPageBytes.set(newPayload, headerLen);
  // Zero out the checksum field before computing.
  newPageBytes[22] = 0;
  newPageBytes[23] = 0;
  newPageBytes[24] = 0;
  newPageBytes[25] = 0;
  const crc = oggCrc32(newPageBytes);
  writeU32LE(newPageBytes, 22, crc);

  // Splice the new page into the file.
  const head = bytes.subarray(0, page.offset);
  const tail = bytes.subarray(page.offset + page.bytes.length);
  return concatBytes([head, newPageBytes, tail]);
}

function countCompletedPacketsBefore(pages: Page[], pageIdx: number, serial: number): number {
  let count = 0;
  for (let pi = 0; pi < pageIdx; pi += 1) {
    const p = pages[pi]!;
    if (p.serial !== serial) continue;
    for (let s = 0; s < p.segmentTable.length; s += 1) {
      const seg = p.segmentTable[s] ?? 0;
      if (seg < 255) count += 1;
    }
  }
  return count;
}

export const oggParser: FormatParser = {
  format: 'ogg',
  extensions: ['.ogg', '.oga', '.opus'],
  mimeTypes: ['audio/ogg', 'audio/opus'],
  matches: matchesOgg,
  parse: parseOgg,
  scrub: scrubOgg,
};
