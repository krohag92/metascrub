// Matroska (MKV / WebM) metadata parser + scrubber.
//
// EBML container with the structure:
//
//   EBML header
//     DocType ("matroska" or "webm")
//   Segment
//     SeekHead?           (optional — index of element offsets)
//     Info
//       Title
//       MuxingApp
//       WritingApp
//       DateUTC
//     Tracks
//     Tags?
//       Tag*
//         Targets
//         SimpleTag*
//           TagName
//           TagString
//     Cluster* (audio/video data)
//
// Parse: walk EBML elements with the helper in `_ebml.ts`. Extract Info
// fields and SimpleTag name/value pairs.
//
// Scrub: rewrite Segment without the Tags element and with Info fields
// blanked. We use a "rebuild" strategy — emit a fresh Segment whose children
// are the original elements (verbatim copies for everything except Info and
// Tags). The Segment size header is recomputed against the new payload.
//
// NB: SeekHead entries store byte offsets relative to the Segment payload. If
// we change the byte layout of preceding children, those offsets become
// stale. To avoid this, we drop the SeekHead too — players will still seek
// linearly. This matches what real-world editors like mkvpropedit do when
// they can't safely update the index.

import type { FormatParser, MetadataField, ScrubOptions } from '../types.js';
import { concatBytes } from '../utils/bytes.js';
import {
  ID,
  readElements,
  findChildElement,
  findAllChildElements,
  readString,
  buildElement,
  type EbmlElement,
} from './_ebml.js';

function findHeader(bytes: Uint8Array): EbmlElement | undefined {
  const top = readElements(bytes, 0, bytes.length);
  return top.find((e) => e.id === ID.EBML);
}

function findSegment(bytes: Uint8Array): EbmlElement | undefined {
  const top = readElements(bytes, 0, bytes.length);
  return top.find((e) => e.id === ID.Segment);
}

function readDocType(bytes: Uint8Array, header: EbmlElement): string {
  const dt = findChildElement(bytes, header, ID.DocType);
  return dt ? readString(bytes, dt) : '';
}

export async function parseEbmlBytes(
  bytes: Uint8Array,
): Promise<{ groups: Record<string, MetadataField[]> }> {
  const groups: Record<string, MetadataField[]> = {};
  const header = findHeader(bytes);
  const segment = findSegment(bytes);
  if (!segment) return { groups };

  const info: MetadataField[] = [];
  const infoEl = findChildElement(bytes, segment, ID.Info);
  if (infoEl) {
    const title = findChildElement(bytes, infoEl, ID.Title);
    if (title) info.push({ key: 'Title', value: readString(bytes, title) });
    const muxing = findChildElement(bytes, infoEl, ID.MuxingApp);
    if (muxing) {
      info.push({
        key: 'MuxingApp',
        value: readString(bytes, muxing),
        sensitive: true,
      });
    }
    const writing = findChildElement(bytes, infoEl, ID.WritingApp);
    if (writing) {
      info.push({
        key: 'WritingApp',
        value: readString(bytes, writing),
        sensitive: true,
      });
    }
    const dateEl = findChildElement(bytes, infoEl, ID.DateUTC);
    if (dateEl && dateEl.payloadLength === 8) {
      // DateUTC = nanoseconds since 2001-01-01 00:00:00 UTC, as a BE int64.
      let ns = 0n;
      for (let i = 0; i < 8; i += 1) {
        ns = (ns << 8n) | BigInt(bytes[dateEl.payloadStart + i]!);
      }
      // Interpret as signed
      if (ns >= 1n << 63n) ns -= 1n << 64n;
      const epoch2001 = Date.UTC(2001, 0, 1);
      const ms = epoch2001 + Number(ns / 1000000n);
      info.push({ key: 'DateUTC', value: new Date(ms).toISOString() });
    }
  }
  if (info.length) groups['MKV.info'] = info;

  // Tags > Tag > SimpleTag
  const tagsEl = findChildElement(bytes, segment, ID.Tags);
  if (tagsEl) {
    const tagFields: MetadataField[] = [];
    const tagElements = findAllChildElements(bytes, tagsEl, ID.Tag);
    for (const tag of tagElements) {
      const simpleTags = findAllChildElements(bytes, tag, ID.SimpleTag);
      for (const st of simpleTags) {
        const nameEl = findChildElement(bytes, st, ID.TagName);
        const valueEl = findChildElement(bytes, st, ID.TagString);
        if (!nameEl) continue;
        const name = readString(bytes, nameEl);
        const value = valueEl ? readString(bytes, valueEl) : '';
        const lower = name.toLowerCase();
        tagFields.push({
          key: name,
          value,
          sensitive:
            lower === 'artist' ||
            lower === 'author' ||
            lower === 'composer' ||
            lower === 'copyright' ||
            lower === 'encoder' ||
            lower === 'location' ||
            lower === 'gps_location',
        });
      }
    }
    if (tagFields.length) groups['MKV.tags'] = tagFields;
  }

  if (header) {
    const dt = readDocType(bytes, header);
    if (dt) {
      groups['EBML.header'] = [
        { key: 'DocType', value: dt },
        { key: 'EBMLVersion', value: 1 },
      ];
    }
  }

  return { groups };
}

/**
 * Rebuild the Info element with Title/MuxingApp/WritingApp replaced by empty
 * strings (so the structure is preserved but values are blanked). Other Info
 * children (TimecodeScale, Duration, SegmentUID, etc.) are preserved verbatim
 * because they're required by spec.
 *
 * If `dropAll` is true, we don't blank — we just drop Title/MuxingApp/
 * WritingApp/DateUTC entirely and keep only required children.
 */
function rebuildInfo(bytes: Uint8Array, infoEl: EbmlElement): Uint8Array {
  const children = readElements(bytes, infoEl.payloadStart, infoEl.end);
  const newChildren: Uint8Array[] = [];
  for (const c of children) {
    if (c.id === ID.Title || c.id === ID.MuxingApp || c.id === ID.WritingApp) {
      // Emit empty-string element.
      newChildren.push(buildElement(c.id, new Uint8Array(0)));
    } else {
      // Verbatim copy.
      newChildren.push(bytes.subarray(c.start, c.end));
    }
  }
  return buildElement(ID.Info, concatBytes(newChildren));
}

/**
 * Rebuild Segment without Tags and SeekHead, and with Info blanked. Keep all
 * other children (Tracks, Cluster, Cues, etc.) verbatim.
 */
function rebuildSegment(bytes: Uint8Array, segment: EbmlElement): Uint8Array {
  const children = readElements(bytes, segment.payloadStart, segment.end);
  const newChildren: Uint8Array[] = [];
  for (const c of children) {
    if (c.id === ID.Tags) continue;
    if (c.id === ID.SeekHead) continue;
    if (c.id === ID.Info) {
      newChildren.push(rebuildInfo(bytes, c));
      continue;
    }
    newChildren.push(bytes.subarray(c.start, c.end));
  }
  return buildElement(ID.Segment, concatBytes(newChildren));
}

export async function scrubEbmlBytes(
  bytes: Uint8Array,
  _options: ScrubOptions,
): Promise<Uint8Array> {
  void _options;
  // Preserve the EBML header verbatim and everything before the Segment, then
  // emit a freshly-rebuilt Segment in its place.
  const top = readElements(bytes, 0, bytes.length);
  if (top.length === 0) return bytes;
  const out: Uint8Array[] = [];
  let rebuiltAny = false;
  for (const e of top) {
    if (e.id === ID.Segment) {
      out.push(rebuildSegment(bytes, e));
      rebuiltAny = true;
    } else {
      out.push(bytes.subarray(e.start, e.end));
    }
  }
  if (!rebuiltAny) return bytes;
  return concatBytes(out);
}

function matchesEbml(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 4 &&
    bytes[0] === 0x1a &&
    bytes[1] === 0x45 &&
    bytes[2] === 0xdf &&
    bytes[3] === 0xa3
  );
}

/** True only when the file's EBML DocType is `matroska`. */
function matchesMkv(bytes: Uint8Array): boolean {
  if (!matchesEbml(bytes)) return false;
  try {
    const header = findHeader(bytes);
    if (!header) return false;
    return readDocType(bytes, header) === 'matroska';
  } catch {
    return false;
  }
}

export const mkvParser: FormatParser = {
  format: 'mkv',
  extensions: ['.mkv'],
  mimeTypes: ['video/x-matroska'],
  matches: matchesMkv,
  parse: parseEbmlBytes,
  scrub: scrubEbmlBytes,
};

export const ebmlInternals = {
  matchesEbml,
  readDocType,
  findHeader,
};
